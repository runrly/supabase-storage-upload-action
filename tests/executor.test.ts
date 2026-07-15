import { describe, expect, it } from "vitest";

import { ExecutionError } from "../src/errors.js";
import { executePlan } from "../src/executor.js";
import type { UploadPlan, UploadPlanEntry } from "../src/types.js";

function entry(objectKey: string): UploadPlanEntry {
	return {
		localPath: objectKey,
		realPath: objectKey,
		bucket: "assets",
		objectKey,
		size: 1,
		contentType: "text/plain",
		upsert: false,
		protocol: "standard",
		sourceKind: "file",
	};
}

describe("executePlan", () => {
	it("reports the number of successful uploads before a failure", async () => {
		const plan: UploadPlan = { entries: [entry("one"), entry("two")] };
		await expect(
			executePlan(
				plan,
				{
					upload: async (value) => {
						if (value.objectKey === "two") throw new Error("upload failed");
					},
				},
				1,
			),
		).rejects.toMatchObject({ name: "ExecutionError", uploadedCount: 1 });
	});

	it("does not schedule work after a failure", async () => {
		const attempted: string[] = [];
		const plan: UploadPlan = {
			entries: [entry("one"), entry("two"), entry("three")],
		};
		await expect(
			executePlan(
				plan,
				{
					upload: async (value) => {
						attempted.push(value.objectKey);
						if (value.objectKey === "one") throw new Error("upload failed");
					},
				},
				1,
			),
		).rejects.toBeInstanceOf(ExecutionError);
		expect(attempted).toEqual(["one"]);
	});
});
