import fs from "node:fs/promises";
import path from "node:path";

import * as glob from "@actions/glob";
import mime from "mime-types";

import { GLOB_MAGIC, STANDARD_UPLOAD_LIMIT_BYTES } from "./consts.js";
import { ConfigurationError } from "./errors.js";
import type { UploadConfig, UploadItem } from "./schemas.js";
import type { SourceKind, UploadPlan, UploadPlanEntry } from "./types.js";

interface LocalFile {
	localPath: string;
	realPath: string;
	relativePath: string;
}

export interface PlanOptions {
	workspace: string;
}

export async function createUploadPlan(
	config: UploadConfig,
	options: PlanOptions,
): Promise<UploadPlan> {
	const workspace = await fs.realpath(options.workspace).catch(() => {
		throw new ConfigurationError(
			`Workspace does not exist: ${options.workspace}`,
		);
	});

	const entries: UploadPlanEntry[] = [];

	for (const [index, item] of config.files.entries()) {
		const sourceKind = await detectSourceKind(item.from, workspace, index);

		if (item.contentType && sourceKind !== "file") {
			throw new ConfigurationError(
				`files[${index}].content-type is only valid when from is a literal file.`,
			);
		}

		const files = await resolveFiles(item.from, sourceKind, workspace, index);

		if (files.length === 0) {
			throw new ConfigurationError(
				`files[${index}].from did not match any files: ${item.from}`,
			);
		}

		const bucket = item.bucket ?? config.defaults.bucket;

		if (bucket === undefined || bucket.length === 0) {
			throw new ConfigurationError(
				`files[${index}] must define bucket or config.default.bucket must be set.`,
			);
		}

		for (const file of files) {
			const objectKey = objectKeyFor(item, sourceKind, file, index);
			const fileStats = await fs.stat(file.localPath);

			const detectedMimeType = mime.lookup(file.localPath);
			const detectedContentType =
				detectedMimeType && mime.contentType(detectedMimeType);
			const cacheControl = item.cacheControl ?? config.defaults.cacheControl;

			const protocol =
				fileStats.size <= STANDARD_UPLOAD_LIMIT_BYTES ? "standard" : "tus";

			const contentType =
				item.contentType ?? (detectedContentType || "application/octet-stream");

			entries.push({
				localPath: file.localPath,
				realPath: file.realPath,
				bucket,
				objectKey,
				size: fileStats.size,
				contentType,
				upsert: item.upsert ?? config.defaults.upsert ?? false,
				protocol,
				sourceKind,
				...(cacheControl && { cacheControl }),
			});
		}
	}

	return { entries: deduplicateAndValidate(entries) };
}

async function detectSourceKind(
	from: string,
	workspace: string,
	index: number,
): Promise<SourceKind> {
	if (GLOB_MAGIC.test(from)) return "glob";

	const candidate = path.resolve(workspace, from);
	assertLexicallyWithinWorkspace(candidate, workspace, `files[${index}].from`);

	const sourceStats = await fs.lstat(candidate).catch(() => {
		throw new ConfigurationError(
			`files[${index}].from does not exist: ${from}`,
		);
	});

	const resolved = await fs.realpath(candidate);
	assertRealpathWithinWorkspace(resolved, workspace, `files[${index}].from`);

	const targetStats = await fs.stat(candidate);

	const isDirectory = sourceStats.isDirectory() || targetStats.isDirectory();
	if (isDirectory) return "directory";

	const isFile =
		(sourceStats.isFile() || sourceStats.isSymbolicLink()) &&
		targetStats.isFile();

	if (isFile) return "file";

	throw new ConfigurationError(
		`files[${index}].from must resolve to a file or directory: ${from}`,
	);
}

async function resolveFiles(
	from: string,
	sourceKind: SourceKind,
	workspace: string,
	index: number,
): Promise<LocalFile[]> {
	if (sourceKind === "file") {
		const localPath = path.resolve(workspace, from);
		const resolved = await fs.realpath(localPath);

		return [
			{ localPath, realPath: resolved, relativePath: path.basename(localPath) },
		];
	}

	if (sourceKind === "directory") {
		const root = path.resolve(workspace, from);

		return findFiles(`${toPosix(root)}/**/*`, root, workspace, index);
	}

	const base = staticGlobBase(from, workspace);
	assertLexicallyWithinWorkspace(base, workspace, `files[${index}].from`);

	const resolvedBase = await fs.realpath(base).catch(() => {
		throw new ConfigurationError(
			`files[${index}].from has no existing static base: ${from}`,
		);
	});

	assertRealpathWithinWorkspace(
		resolvedBase,
		workspace,
		`files[${index}].from`,
	);

	return findFiles(
		toPosix(path.resolve(workspace, from)),
		base,
		workspace,
		index,
	);
}

async function findFiles(
	pattern: string,
	relativeBase: string,
	workspace: string,
	index: number,
): Promise<LocalFile[]> {
	const globber = await glob.create(pattern, { followSymbolicLinks: true });
	const matches: LocalFile[] = [];

	for await (const match of globber.globGenerator()) {
		const matchStats = await fs.stat(match).catch(() => null);
		if (!matchStats?.isFile()) continue;

		const resolved = await fs.realpath(match);
		assertRealpathWithinWorkspace(resolved, workspace, `files[${index}].from`);

		const relativePath = path.relative(relativeBase, match);

		const isOutsideFromBasePath =
			relativePath === "" ||
			relativePath.startsWith(`..${path.sep}`) ||
			path.isAbsolute(relativePath);

		if (isOutsideFromBasePath) {
			throw new ConfigurationError(
				`files[${index}].from matched a path outside its base: ${match}`,
			);
		}

		matches.push({ localPath: match, realPath: resolved, relativePath });
	}

	return matches.sort((left, right) =>
		left.relativePath.localeCompare(right.relativePath),
	);
}

function staticGlobBase(from: string, workspace: string): string {
	const normalized = from.replaceAll("\\", "/");
	const parts = normalized.split("/");

	const firstMagic = parts.findIndex((part) => GLOB_MAGIC.test(part));
	const staticParts = firstMagic === -1 ? parts : parts.slice(0, firstMagic);

	return path.resolve(workspace, staticParts.join("/") || ".");
}

function objectKeyFor(
	item: UploadItem,
	sourceKind: SourceKind,
	file: LocalFile,
	index: number,
): string {
	if (sourceKind === "file") {
		if (!item.to) return path.basename(file.localPath);

		if (endsWithSlash(item.to)) {
			return joinObjectKey(
				normalizeObjectPath(item.to, true, index),
				path.basename(file.localPath),
			);
		}

		return normalizeObjectPath(item.to, false, index);
	}

	const prefix = item.to ? normalizeObjectPath(item.to, true, index) : "";

	return joinObjectKey(prefix, toPosix(file.relativePath));
}

function normalizeObjectPath(
	value: string,
	allowEmpty: boolean,
	index: number,
): string {
	const trimmed = value.trim();

	if (trimmed.startsWith("/")) {
		throw new ConfigurationError(
			`files[${index}].to must be a relative Object Key path.`,
		);
	}

	const normalized: string[] = [];
	for (const part of trimmed.replaceAll("\\", "/").split("/")) {
		if (part === "" || part === ".") continue;

		if (part === "..") {
			throw new ConfigurationError(`files[${index}].to must not contain '..'.`);
		}

		normalized.push(part);
	}

	const result = normalized.join("/");

	if (!allowEmpty && result.length === 0) {
		throw new ConfigurationError(`files[${index}].to must name an Object Key.`);
	}

	return result;
}

function joinObjectKey(prefix: string, suffix: string): string {
	return prefix.length === 0 ? suffix : `${prefix}/${suffix}`;
}

function endsWithSlash(value: string): boolean {
	return /[\\/]$/u.test(value.trim());
}

function assertLexicallyWithinWorkspace(
	candidate: string,
	workspace: string,
	label: string,
): void {
	if (!isWithinWorkspace(candidate, workspace)) {
		throw new ConfigurationError(`${label} must be inside GITHUB_WORKSPACE.`);
	}
}

function assertRealpathWithinWorkspace(
	candidate: string,
	workspace: string,
	label: string,
): void {
	if (!isWithinWorkspace(candidate, workspace)) {
		throw new ConfigurationError(`${label} resolves outside GITHUB_WORKSPACE.`);
	}
}

function isWithinWorkspace(candidate: string, workspace: string): boolean {
	const relative = path.relative(workspace, candidate);

	return (
		relative === "" ||
		(!relative.startsWith(`..${path.sep}`) &&
			relative !== ".." &&
			!path.isAbsolute(relative))
	);
}

function toPosix(value: string): string {
	return value.replaceAll(path.sep, "/");
}

function deduplicateAndValidate(entries: UploadPlanEntry[]): UploadPlanEntry[] {
	const byDestination = new Map<string, UploadPlanEntry>();

	for (const entry of entries) {
		const destination = `${entry.bucket}\u0000${entry.objectKey}`;
		const existing = byDestination.get(destination);

		if (!existing) {
			byDestination.set(destination, entry);
			continue;
		}

		if (sameUpload(existing, entry)) continue;
		throw new ConfigurationError(
			`Multiple files target ${entry.bucket}/${entry.objectKey} with different sources or options.`,
		);
	}

	return [...byDestination.values()].sort((left, right) => {
		const destination = `${left.bucket}/${left.objectKey}`.localeCompare(
			`${right.bucket}/${right.objectKey}`,
		);

		return destination === 0
			? left.localPath.localeCompare(right.localPath)
			: destination;
	});
}

function sameUpload(left: UploadPlanEntry, right: UploadPlanEntry): boolean {
	return (
		left.realPath === right.realPath &&
		left.bucket === right.bucket &&
		left.objectKey === right.objectKey &&
		left.contentType === right.contentType &&
		left.upsert === right.upsert &&
		left.cacheControl === right.cacheControl
	);
}
