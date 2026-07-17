import yaml from "yaml";
import type { z } from "zod";

import { ConfigurationError, ZodConfigurationError } from "./errors.js";
import type { UploadConfig } from "./schemas.js";
import { rawUploadConfigSchema } from "./schemas.js";

export function parseConfig(input: string): UploadConfig {
	const document = yaml.parseDocument(input, {
		prettyErrors: true,
		uniqueKeys: true,
	});

	if (document.errors.length > 0) {
		throw new ConfigurationError(
			`Invalid config YAML: ${document.errors[0]?.message ?? "unknown parse error"}`,
		);
	}

	const result = rawUploadConfigSchema.safeParse(document.toJS());

	if (!result.success) {
		throw new ZodConfigurationError(result.error, formatConfigIssue);
	}
	return result.data;
}

function formatConfigIssue(issue: z.core.$ZodIssue): string {
	const path = formatPath(issue.path, "config");

	if (issue.code === "unrecognized_keys") {
		const key = issue.keys[0] ?? "unknown";
		return `${path}.${key} is not supported.`;
	}

	return `${path} ${issue.message}`;
}

function formatPath(path: PropertyKey[], root: string): string {
	const [first, ...rest] = path;

	if (first === undefined) return root;

	const initial =
		typeof first === "number"
			? `${root}[${first}]`
			: first === "default" || first === "files"
				? first
				: `${root}.${String(first)}`;

	return rest.reduce<string>((result, segment) => {
		if (typeof segment === "number") return `${result}[${segment}]`;
		return `${result}.${String(segment)}`;
	}, initial);
}
