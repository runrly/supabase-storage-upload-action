import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ConfigurationError } from "../src/errors.js";
import { createUploadPlan } from "../src/planner.js";
import type { UploadConfig } from "../src/types.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => fs.rm(directory, { recursive: true })),
	);
});

async function workspace(): Promise<string> {
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), "supabase-upload-action-"),
	);
	temporaryDirectories.push(directory);
	return directory;
}

function config(files: UploadConfig["files"]): UploadConfig {
	return { defaults: { bucket: "assets" }, files };
}

describe("createUploadPlan", () => {
	it("uses a literal file to rename an Object Key", async () => {
		const root = await workspace();
		await fs.writeFile(path.join(root, "source.txt"), "hello");

		const plan = await createUploadPlan(
			config([{ from: "./source.txt", to: "published/renamed.txt" }]),
			{ workspace: root },
		);

		expect(plan.entries).toMatchObject([
			{
				bucket: "assets",
				objectKey: "published/renamed.txt",
				sourceKind: "file",
			},
		]);
	});

	it("copies folder contents without the source folder itself", async () => {
		const root = await workspace();
		await fs.mkdir(path.join(root, "dist", "nested"), { recursive: true });
		await fs.writeFile(path.join(root, "dist", "nested", "app.js"), "hello");

		const plan = await createUploadPlan(
			config([{ from: "./dist", to: "site" }]),
			{ workspace: root },
		);

		expect(plan.entries.map((entry) => entry.objectKey)).toEqual([
			"site/nested/app.js",
		]);
	});

	it("maps a glob relative to its static base", async () => {
		const root = await workspace();
		await fs.mkdir(path.join(root, "dist", "assets"), { recursive: true });
		await fs.writeFile(path.join(root, "dist", "assets", "app.css"), "hello");

		const plan = await createUploadPlan(
			config([{ from: "./dist/assets/**/*", to: "cdn/" }]),
			{ workspace: root },
		);

		expect(plan.entries.map((entry) => entry.objectKey)).toEqual([
			"cdn/app.css",
		]);
	});

	it("infers MIME types from globbed filenames", async () => {
		const root = await workspace();
		await fs.mkdir(path.join(root, "assets"), { recursive: true });
		await fs.writeFile(path.join(root, "assets", "health.txt"), "healthy");
		await fs.writeFile(path.join(root, "assets", "payload.unknown"), "payload");

		const plan = await createUploadPlan(config([{ from: "./assets/**/*" }]), {
			workspace: root,
		});

		expect(
			plan.entries.map(({ objectKey, contentType }) => ({
				objectKey,
				contentType,
			})),
		).toEqual([
			{ objectKey: "health.txt", contentType: "text/plain; charset=utf-8" },
			{ objectKey: "payload.unknown", contentType: "application/octet-stream" },
		]);
	});

	it("rejects content-type for a glob", async () => {
		const root = await workspace();
		await fs.writeFile(path.join(root, "source.txt"), "hello");

		await expect(
			createUploadPlan(
				config([{ from: "./*.txt", contentType: "text/plain" }]),
				{ workspace: root },
			),
		).rejects.toThrow("only valid when from is a literal file");
	});

	it("rejects a symlink whose target escapes the workspace", async () => {
		const root = await workspace();
		const outside = await workspace();
		await fs.writeFile(path.join(outside, "private.txt"), "nope");
		await fs.symlink(
			path.join(outside, "private.txt"),
			path.join(root, "link.txt"),
		);

		await expect(
			createUploadPlan(config([{ from: "./link.txt" }]), { workspace: root }),
		).rejects.toThrow(ConfigurationError);
	});
});
