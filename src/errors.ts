import type { ZodError, z } from "zod";

export class ConfigurationError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "ConfigurationError";
	}
}

export class ZodConfigurationError extends ConfigurationError {
	public readonly issues: readonly z.core.$ZodIssue[];

	public constructor(
		error: ZodError,
		formatIssue: (issue: z.core.$ZodIssue) => string,
	) {
		const issue = error.issues[0];
		super(issue === undefined ? "Invalid configuration." : formatIssue(issue));

		this.name = "ZodConfigurationError";
		this.issues = error.issues;
	}
}

export class ExecutionError extends Error {
	public readonly uploadedCount: number;

	public constructor(cause: unknown, uploadedCount: number) {
		super(cause instanceof Error ? cause.message : String(cause));

		this.name = "ExecutionError";
		this.uploadedCount = uploadedCount;
	}
}
