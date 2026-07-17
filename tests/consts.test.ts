import { describe, expect, it } from "vitest";

import {
	DRY_RUN_VALUES,
	GLOB_MAGIC,
	MAX_UPLOAD_ATTEMPTS,
	STANDARD_UPLOAD_LIMIT_BYTES,
	TUS_CHUNK_SIZE_BYTES,
	TUS_RETRY_DELAYS,
} from "../src/consts.js";

describe("consts", () => {
	it("exports upload protocol limits and retry policy", () => {
		expect(STANDARD_UPLOAD_LIMIT_BYTES).toBe(6 * 1024 * 1024);
		expect(TUS_CHUNK_SIZE_BYTES).toBe(6 * 1024 * 1024);
		expect(MAX_UPLOAD_ATTEMPTS).toBe(3);
		expect(TUS_RETRY_DELAYS).toEqual([0, 1_000]);
	});

	it("exports supported GitHub Action boolean values", () => {
		expect(DRY_RUN_VALUES).toEqual(["true", "false"]);
	});

	it("exports the upload source glob detector", () => {
		expect(GLOB_MAGIC.test("./dist/**/*.js")).toBe(true);
		expect(GLOB_MAGIC.test("./dist/app.js")).toBe(false);
	});
});
