import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";

import type { Uploader } from "./executor.js";
import type { UploadPlanEntry } from "./types.js";
import { TUS_CHUNK_SIZE_BYTES } from "./types.js";

const MAX_ATTEMPTS = 3;
const TUS_RETRY_DELAYS = [0, 1_000];

export interface SupabaseUploaderOptions {
	supabaseUrl: string;
	supabaseKey: string;
}

export function createSupabaseUploader(
	options: SupabaseUploaderOptions,
): Uploader {
	const client = createClient(options.supabaseUrl, options.supabaseKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	return {
		upload: async (entry) => {
			if (entry.protocol === "tus") {
				await uploadWithTus(entry, options);
				return;
			}
			await retry(() => uploadStandard(client, entry));
		},
	};
}

async function uploadStandard(
	client: SupabaseClient,
	entry: UploadPlanEntry,
): Promise<void> {
	const uploadOptions: {
		upsert: boolean;
		contentType: string;
		cacheControl?: string;
	} = {
		upsert: entry.upsert,
		contentType: entry.contentType,
	};
	if (entry.cacheControl !== undefined)
		uploadOptions.cacheControl = entry.cacheControl;

	const data = await readFile(entry.localPath);
	const { error } = await client.storage
		.from(entry.bucket)
		.upload(entry.objectKey, data, uploadOptions);
	if (error !== null) {
		throw new Error(`${entry.bucket}/${entry.objectKey}: ${error.message}`);
	}
}

async function uploadWithTus(
	entry: UploadPlanEntry,
	options: SupabaseUploaderOptions,
): Promise<void> {
	const metadata: Record<string, string> = {
		bucketName: entry.bucket,
		objectName: entry.objectKey,
		contentType: entry.contentType,
	};
	if (entry.cacheControl !== undefined)
		metadata.cacheControl = entry.cacheControl;

	await new Promise<void>((resolve, reject) => {
		const upload = new tus.Upload(createReadStream(entry.localPath) as never, {
			endpoint: resumableEndpoint(options.supabaseUrl),
			uploadSize: entry.size,
			chunkSize: TUS_CHUNK_SIZE_BYTES,
			retryDelays: TUS_RETRY_DELAYS,
			removeFingerprintOnSuccess: true,
			storeFingerprintForResuming: false,
			metadata,
			headers: {
				authorization: `Bearer ${options.supabaseKey}`,
				apikey: options.supabaseKey,
				"x-upsert": String(entry.upsert),
			},
			onError: (error) =>
				reject(
					new Error(`${entry.bucket}/${entry.objectKey}: ${error.message}`),
				),
			onSuccess: () => resolve(),
		});
		upload.start();
	});
}

function resumableEndpoint(supabaseUrl: string): string {
	const url = new URL(supabaseUrl);
	const match = /^([a-z0-9-]+)\.supabase\.co$/iu.exec(url.hostname);
	if (match?.[1] !== undefined) {
		return `https://${match[1]}.storage.supabase.co/storage/v1/upload/resumable`;
	}
	return new URL(
		"storage/v1/upload/resumable",
		ensureTrailingSlash(url),
	).toString();
}

function ensureTrailingSlash(url: URL): string {
	return url.pathname.endsWith("/") ? url.toString() : `${url.toString()}/`;
}

async function retry(operation: () => Promise<void>): Promise<void> {
	let error: unknown;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		try {
			await operation();
			return;
		} catch (caught) {
			error = caught;
			if (attempt < MAX_ATTEMPTS) {
				await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
			}
		}
	}
	throw error;
}

export const internal = { resumableEndpoint, retry };
