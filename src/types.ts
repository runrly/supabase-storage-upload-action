export type {
	UploadConfig,
	UploadDefaults,
	UploadItem,
} from "./schemas.js";

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
