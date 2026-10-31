import path from "node:path";

import { type OutputOptions, rollup } from "rollup";
import { describe, expect, it } from "vitest";

const { default: config } = await import(
	new URL("../rollup.config.mjs", import.meta.url).href
);
const output: OutputOptions = config.output;

async function bundleWithDependencyDirectory(directory: string) {
	const entry = path.resolve(".build/main.js");
	const dependency = path.resolve(
		"node_modules/.pnpm",
		directory,
		"node_modules/@actions/glob/lib/glob.js",
	);
	const bundle = await rollup({
		input: entry,
		plugins: [
			{
				name: "dependency-layout-fixture",
				resolveId(id) {
					return id === "fixture" ? dependency : id;
				},
				load(id) {
					return id === entry
						? 'export { matched } from "fixture";'
						: "export const matched = 2;";
				},
			},
		],
	});

	try {
		const result = await bundle.generate({
			...output,
			file: path.resolve("dist/index.js"),
		});
		const chunk = result.output[0];
		if (chunk?.type !== "chunk") {
			throw new Error("Expected a JavaScript bundle.");
		}
		expect(chunk.map).not.toBeNull();
		return { code: chunk.code, map: chunk.map?.toString() };
	} finally {
		await bundle.close();
	}
}

describe("Rollup source maps", () => {
	it("generates identical bundles for Linux and Windows pnpm store paths", async () => {
		const linux = await bundleWithDependencyDirectory(
			"@actions+glob@0.7.0_patch_hash=c45d87bbe529935ae4ca8a4d03d9686571387d6c68f470d3d80e3860e14ed4f0",
		);
		const windows = await bundleWithDependencyDirectory(
			"@actions+glob@0.7.0_patch_h_ae66aa8341d1bd6a91dbc866a8d941d0",
		);

		expect(windows).toEqual(linux);
	});
});
