import * as core from "@actions/core";
import { parseConfig } from "./config.js";
import { ConfigurationError, ExecutionError } from "./errors.js";
import { executePlan } from "./executor.js";
import { createUploadPlan } from "./planner.js";
import { createSupabaseUploader } from "./transport.js";

export async function run(): Promise<void> {
	let uploadedCount = 0;
	try {
		const config = parseConfig(core.getInput("config", { required: true }));
		const dryRun = core.getBooleanInput("dry-run");
		const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
		const plan = await createUploadPlan(config, { workspace });

		core.setOutput("matched-count", String(plan.entries.length));
		await writeSummary(plan.entries, dryRun);

		if (dryRun) {
			core.info(`Dry run completed: ${plan.entries.length} file(s) matched.`);
			core.setOutput("uploaded-count", "0");
			return;
		}

		const supabaseUrl = core.getInput("supabase-url", { required: true });
		const supabaseKey = core.getInput("supabase-key", { required: true });
		core.setSecret(supabaseKey);
		const result = await executePlan(
			plan,
			createSupabaseUploader({ supabaseUrl, supabaseKey }),
		);
		uploadedCount = result.uploadedCount;
		core.setOutput("uploaded-count", String(uploadedCount));
		core.info(`Uploaded ${uploadedCount} file(s).`);
	} catch (error) {
		if (error instanceof ExecutionError) uploadedCount = error.uploadedCount;
		core.setOutput("uploaded-count", String(uploadedCount));
		const message = error instanceof Error ? error.message : String(error);
		core.setFailed(
			error instanceof ConfigurationError
				? `Invalid configuration: ${message}`
				: message,
		);
	}
}

async function writeSummary(
	entries: {
		bucket: string;
		objectKey: string;
		protocol: string;
	}[],
	dryRun: boolean,
): Promise<void> {
	await core.summary
		.addHeading("Supabase Storage upload")
		.addRaw(`Mode: ${dryRun ? "dry run" : "upload"}\n\n`)
		.addRaw(`Matched files: ${entries.length}\n\n`)
		.addTable([
			[
				{ data: "Bucket", header: true },
				{ data: "Object Key", header: true },
				{ data: "Protocol", header: true },
			],
			...entries.map((entry) => [
				entry.bucket,
				entry.objectKey,
				entry.protocol,
			]),
		])
		.write();
}
