export const STANDARD_UPLOAD_LIMIT_BYTES = 6 * 1024 * 1024;
export const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

export interface UploadDefaults {
	bucket?: string;
	upsert?: boolean;
	cacheControl?: string;
}

export interface UploadItem {
	from: string;
	to?: string;
	bucket?: string;
	upsert?: boolean;
	cacheControl?: string;
	contentType?: string;
}

export interface UploadConfig {
	defaults: UploadDefaults;
	files: UploadItem[];
}

export type SourceKind = "file" | "directory" | "glob";
export type UploadProtocol = "standard" | "tus";

export interface UploadPlanEntry {
	localPath: string;
	realPath: string;
	bucket: string;
	objectKey: string;
	size: number;
	contentType: string;
	upsert: boolean;
	cacheControl?: string;
	protocol: UploadProtocol;
	sourceKind: SourceKind;
}

export interface UploadPlan {
	entries: UploadPlanEntry[];
}

export interface ExecutionResult {
	matchedCount: number;
	uploadedCount: number;
}
