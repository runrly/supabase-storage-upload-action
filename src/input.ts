import type { z } from "zod";

import { ZodConfigurationError } from "./errors.js";
import type { ActionInputs } from "./schemas.js";
import {
	dryRunActionInputsSchema,
	rawActionInputsSchema,
	uploadActionInputsSchema,
} from "./schemas.js";

export function parseActionInputs(input: unknown): ActionInputs {
	const rawResult = rawActionInputsSchema.safeParse(input);
	if (!rawResult.success) {
		throw new ZodConfigurationError(rawResult.error, formatInputIssue);
	}

	const schema = rawResult.data.dryRun
		? dryRunActionInputsSchema
		: uploadActionInputsSchema;

	const result = schema.safeParse(rawResult.data);

	if (!result.success) {
		throw new ZodConfigurationError(result.error, formatInputIssue);
	}

	return result.data;
}

function formatInputIssue(issue: z.core.$ZodIssue): string {
	const path = issue.path
		.map((segment) => {
			if (segment === "dryRun") return "dry-run";

			if (segment === "supabaseUrl") return "supabase-url";

			if (segment === "supabaseKey") return "supabase-key";

			return String(segment);
		})
		.join(".");

	return `${path} ${issue.message}`;
}
