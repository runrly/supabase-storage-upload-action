import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createSupabaseUploader, internal } from "../src/transport.js";
import type { UploadPlanEntry } from "../src/types.js";

describe("resumable endpoint", () => {
	it("uses the Supabase Cloud direct storage hostname", () => {
		expect(internal.resumableEndpoint("https://project-ref.supabase.co")).toBe(
			"https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
		);
	});

	it("keeps a self-hosted deployment under its Storage API base path", () => {
		expect(
			internal.resumableEndpoint("https://supabase.example.test/api"),
		).toBe("https://supabase.example.test/api/storage/v1/upload/resumable");
	});
});

describe("retry", () => {
	it("retries an asynchronously rejected operation", async () => {
		vi.useFakeTimers();

		try {
			let attempts = 0;
			const operation = internal.retry(async () => {
				attempts += 1;
				if (attempts < 3) throw new Error("transient failure");
			});

			await vi.runAllTimersAsync();
			await expect(operation).resolves.toBeUndefined();
			expect(attempts).toBe(3);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe("standard upload", () => {
	it("sends a typed Blob as multipart form data", async () => {
		const directory = await fs.mkdtemp(
			path.join(os.tmpdir(), "supabase-transport-"),
		);
		const localPath = path.join(directory, "health.txt");
		await fs.writeFile(localPath, "integration asset\n");

		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request = new Request(input, init);
				expect(request.headers.get("content-type")).toMatch(
					/^multipart\/form-data; boundary=/u,
				);
				expect(request.headers.get("x-upsert")).toBe("true");

				const body = await request.formData();
				expect(body.get("cacheControl")).toBe("3600");

				const uploadedFile = body.get("");
				expect(uploadedFile).toBeInstanceOf(Blob);
				if (!(uploadedFile instanceof Blob)) {
					throw new Error("expected the multipart body to contain a Blob");
				}

				expect(uploadedFile.type).toBe("text/plain; charset=utf-8");
				expect(await uploadedFile.text()).toBe("integration asset\n");

				return new Response(JSON.stringify({ Id: "id", Key: "health.txt" }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			},
		);

		vi.stubGlobal("fetch", fetch);

		try {
			const entry: UploadPlanEntry = {
				localPath,
				realPath: localPath,
				bucket: "assets",
				objectKey: "health.txt",
				size: 18,
				contentType: "text/plain; charset=utf-8",
				upsert: true,
				cacheControl: "3600",
				protocol: "standard",
				sourceKind: "file",
			};

			await createSupabaseUploader({
				supabaseUrl: "https://project-ref.supabase.co",
				supabaseKey: "test-key",
			}).upload(entry);

			expect(fetch).toHaveBeenCalledOnce();
		} finally {
			vi.unstubAllGlobals();
			await fs.rm(directory, { recursive: true, force: true });
		}
	});

	it("includes the destination when Storage returns an error", async () => {
		const fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						statusCode: "403",
						error: "Forbidden",
						message: "upload denied",
					}),
					{
						status: 403,
						headers: { "content-type": "application/json" },
					},
				),
		);

		vi.stubGlobal("fetch", fetch);
		vi.useFakeTimers();
		const readFile = vi
			.spyOn(fs, "readFile")
			.mockResolvedValue(Buffer.from("integration asset\n"));

		try {
			const upload = createSupabaseUploader({
				supabaseUrl: "https://project-ref.supabase.co",
				supabaseKey: "test-key",
			}).upload({
				localPath: "health.txt",
				realPath: "health.txt",
				bucket: "assets",
				objectKey: "health.txt",
				size: 18,
				contentType: "text/plain; charset=utf-8",
				upsert: false,
				protocol: "standard",
				sourceKind: "file",
			});
			const rejection = expect(upload).rejects.toThrow(
				"assets/health.txt: upload denied",
			);

			await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
			await vi.runAllTimersAsync();
			await rejection;
			expect(fetch).toHaveBeenCalledTimes(3);
		} finally {
			readFile.mockRestore();
			vi.useRealTimers();
			vi.unstubAllGlobals();
		}
	});
});
