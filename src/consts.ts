export const STANDARD_UPLOAD_LIMIT_BYTES = 6 * 1024 * 1024;

export const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

export const MAX_UPLOAD_ATTEMPTS = 3;

export const TUS_RETRY_DELAYS = [0, 1_000];

export const DRY_RUN_VALUES = ["true", "false"] as const;

export const GLOB_MAGIC = /[*?[\]{}]/u;
