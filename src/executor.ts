import { ExecutionError } from "./errors.js";
import type { ExecutionResult, UploadPlan, UploadPlanEntry } from "./types.js";

export interface Uploader {
	upload(entry: UploadPlanEntry): Promise<void>;
}

export async function executePlan(
	plan: UploadPlan,
	uploader: Uploader,
	concurrency = 4,
): Promise<ExecutionResult> {
	let next = 0;
	let uploadedCount = 0;
	let failure: unknown;

	const worker = async (): Promise<void> => {
		while (failure === undefined) {
			const entry = plan.entries[next];
			next += 1;
			if (entry === undefined) return;

			try {
				await uploader.upload(entry);
				uploadedCount += 1;
			} catch (error) {
				failure ??= error;
				return;
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, plan.entries.length) }, worker),
	);
	if (failure !== undefined) {
		throw new ExecutionError(failure, uploadedCount);
	}

	return { matchedCount: plan.entries.length, uploadedCount };
}
