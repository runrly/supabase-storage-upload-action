import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
	input: ".build/main.js",
	output: {
		file: "dist/index.js",
		format: "es",
		sourcemap: true,
		// pnpm shortens store directories differently on Windows.
		sourcemapPathTransform: (sourcePath) =>
			sourcePath
				.replaceAll("\\", "/")
				.replace(
					/node_modules\/\.pnpm\/[^/]+\/node_modules\//,
					"node_modules/",
				),
	},
	plugins: [nodeResolve({ preferBuiltins: true }), json(), commonjs()],
};
