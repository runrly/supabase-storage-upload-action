import { parseDocument } from "yaml";

import { ConfigurationError } from "./errors.js";
import type { UploadConfig, UploadDefaults, UploadItem } from "./types.js";

const ROOT_FIELDS = new Set(["default", "files"]);
const DEFAULT_FIELDS = new Set(["bucket", "upsert", "cache-control"]);
const ITEM_FIELDS = new Set([
	"from",
	"to",
	"bucket",
	"upsert",
	"cache-control",
	"content-type",
]);

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKnownFields(
	value: RecordValue,
	allowed: Set<string>,
	path: string,
): void {
	for (const field of Object.keys(value)) {
		if (!allowed.has(field)) {
			throw new ConfigurationError(`${path}.${field} is not supported.`);
		}
	}
}

function optionalString(value: unknown, path: string): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ConfigurationError(`${path} must be a non-empty string.`);
	}
	return value;
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "boolean") {
		throw new ConfigurationError(`${path} must be a boolean.`);
	}
	return value;
}

function optionalCacheControl(
	value: unknown,
	path: string,
): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "number") {
		if (!Number.isSafeInteger(value) || value < 0) {
			throw new ConfigurationError(
				`${path} must be a non-negative integer or a non-empty string.`,
			);
		}
		return String(value);
	}
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ConfigurationError(
			`${path} must be a non-negative integer or a non-empty string.`,
		);
	}
	return value;
}

function parseDefaults(value: unknown): UploadDefaults {
	if (value === undefined) {
		return {};
	}
	if (!isRecord(value)) {
		throw new ConfigurationError("default must be a mapping.");
	}
	assertKnownFields(value, DEFAULT_FIELDS, "default");
	const defaults: UploadDefaults = {};
	const bucket = optionalString(value.bucket, "default.bucket");
	const upsert = optionalBoolean(value.upsert, "default.upsert");
	const cacheControl = optionalCacheControl(
		value["cache-control"],
		"default.cache-control",
	);
	if (bucket !== undefined) defaults.bucket = bucket;
	if (upsert !== undefined) defaults.upsert = upsert;
	if (cacheControl !== undefined) defaults.cacheControl = cacheControl;
	return defaults;
}

function parseItem(value: unknown, index: number): UploadItem {
	const path = `files[${index}]`;
	if (!isRecord(value)) {
		throw new ConfigurationError(`${path} must be a mapping.`);
	}
	assertKnownFields(value, ITEM_FIELDS, path);
	const from = optionalString(value.from, `${path}.from`);
	if (from === undefined) {
		throw new ConfigurationError(`${path}.from is required.`);
	}
	if (from.includes("\n") || from.startsWith("!")) {
		throw new ConfigurationError(
			`${path}.from accepts one include path or glob pattern.`,
		);
	}
	const item: UploadItem = { from };
	const to = optionalString(value.to, `${path}.to`);
	const bucket = optionalString(value.bucket, `${path}.bucket`);
	const upsert = optionalBoolean(value.upsert, `${path}.upsert`);
	const cacheControl = optionalCacheControl(
		value["cache-control"],
		`${path}.cache-control`,
	);
	const contentType = optionalString(
		value["content-type"],
		`${path}.content-type`,
	);
	if (to !== undefined) item.to = to;
	if (bucket !== undefined) item.bucket = bucket;
	if (upsert !== undefined) item.upsert = upsert;
	if (cacheControl !== undefined) item.cacheControl = cacheControl;
	if (contentType !== undefined) item.contentType = contentType;
	return item;
}

export function parseConfig(input: string): UploadConfig {
	const document = parseDocument(input, {
		prettyErrors: true,
		uniqueKeys: true,
	});
	if (document.errors.length > 0) {
		throw new ConfigurationError(
			`Invalid config YAML: ${document.errors[0]?.message ?? "unknown parse error"}`,
		);
	}
	const root = document.toJS();
	if (!isRecord(root)) {
		throw new ConfigurationError("config must be a mapping.");
	}
	assertKnownFields(root, ROOT_FIELDS, "config");
	if (!Array.isArray(root.files) || root.files.length === 0) {
		throw new ConfigurationError("files must be a non-empty list.");
	}
	return {
		defaults: parseDefaults(root.default),
		files: root.files.map((value, index) => parseItem(value, index)),
	};
}
