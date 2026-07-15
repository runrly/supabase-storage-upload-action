export class ConfigurationError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "ConfigurationError";
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
