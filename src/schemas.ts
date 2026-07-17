import { z } from "zod";

import { DRY_RUN_VALUES } from "./consts.js";

function nonEmptyString(error: string) {
	return z
		.string({ error })
		.refine((value) => value.trim().length > 0, { error });
}

function requiredString() {
	return z
		.string({
			error: (issue) =>
				issue.input === undefined
					? "is required."
					: "must be a non-empty string.",
		})
		.refine((value) => value.trim().length > 0, {
			error: "must be a non-empty string.",
		});
}

const cacheControlError =
	"must be a non-negative integer or a non-empty string.";

const cacheControlSchema = z
	.union([z.string(), z.int().nonnegative({ error: cacheControlError })], {
		error: cacheControlError,
	})
	.pipe(z.coerce.string())
	.refine((value) => value.trim().length > 0, { error: cacheControlError });

export const rawUploadDefaultsSchema = z
	.object(
		{
			bucket: nonEmptyString("must be a non-empty string.").optional(),
			upsert: z.boolean({ error: "must be a boolean." }).optional(),
			"cache-control": cacheControlSchema.optional(),
		},
		{ error: "must be a mapping." },
	)
	.strict();

export const rawUploadItemSchema = z
	.object(
		{
			from: requiredString().refine(
				(value) => !value.includes("\n") && !value.startsWith("!"),
				{ error: "accepts one include path or glob pattern." },
			),
			to: nonEmptyString("must be a non-empty string.").optional(),
			bucket: nonEmptyString("must be a non-empty string.").optional(),
			upsert: z.boolean({ error: "must be a boolean." }).optional(),
			"cache-control": cacheControlSchema.optional(),
			"content-type": nonEmptyString("must be a non-empty string.").optional(),
		},
		{ error: "must be a mapping." },
	)
	.strict();

function normalizeUploadFields<
	Fields extends {
		"cache-control"?: string | undefined;
		"content-type"?: string | undefined;
	},
>(
	fields: Fields,
): Omit<Fields, "cache-control" | "content-type"> & {
	cacheControl?: string | undefined;
	contentType?: string | undefined;
} {
	const {
		"cache-control": cacheControl,
		"content-type": contentType,
		...rest
	} = fields;
	return {
		...rest,
		...(cacheControl && { cacheControl }),
		...(contentType && { contentType }),
	};
}

export const uploadDefaultsSchema = z
	.object({
		bucket: nonEmptyString("must be a non-empty string.").optional(),
		upsert: z.boolean({ error: "must be a boolean." }).optional(),
		cacheControl: nonEmptyString(
			"must be a non-negative integer or a non-empty string.",
		).optional(),
	})
	.strict();

export const uploadItemSchema = z
	.object({
		from: requiredString().refine(
			(value) => !value.includes("\n") && !value.startsWith("!"),
			{ error: "accepts one include path or glob pattern." },
		),
		to: nonEmptyString("must be a non-empty string.").optional(),
		bucket: nonEmptyString("must be a non-empty string.").optional(),
		upsert: z.boolean({ error: "must be a boolean." }).optional(),
		cacheControl: nonEmptyString(
			"must be a non-negative integer or a non-empty string.",
		).optional(),
		contentType: nonEmptyString("must be a non-empty string.").optional(),
	})
	.strict();

const parsedUploadDefaultsSchema = rawUploadDefaultsSchema
	.transform(normalizeUploadFields)
	.pipe(uploadDefaultsSchema);

const parsedUploadItemSchema = rawUploadItemSchema
	.transform(normalizeUploadFields)
	.pipe(uploadItemSchema);

export const uploadConfigSchema = z
	.object({
		defaults: uploadDefaultsSchema,
		files: z
			.array(uploadItemSchema, {
				error: "must be a non-empty list.",
			})
			.min(1, { error: "must be a non-empty list." }),
	})
	.strict();

export const rawUploadConfigSchema = z
	.object(
		{
			default: parsedUploadDefaultsSchema.optional(),
			files: z
				.array(parsedUploadItemSchema, {
					error: "must be a non-empty list.",
				})
				.min(1, { error: "must be a non-empty list." }),
		},
		{ error: "must be a mapping." },
	)
	.strict()
	.transform(({ default: defaults, files }) => ({
		defaults: defaults ?? {},
		files,
	}))
	.pipe(uploadConfigSchema);

export const rawActionInputsSchema = z
	.object({
		config: nonEmptyString("is required."),
		dryRun: z
			.enum(DRY_RUN_VALUES, { error: "must be true or false." })
			.transform((value) => value === "true"),
		supabaseUrl: z.string(),
		supabaseKey: z.string(),
		workspace: nonEmptyString("must be a non-empty string."),
	})
	.strict();

export const dryRunActionInputsSchema = z.object({
	config: z.string(),
	dryRun: z.literal(true),
	workspace: z.string(),
});

export const uploadActionInputsSchema = z.object({
	config: z.string(),
	dryRun: z.literal(false),
	supabaseUrl: z.url({
		error: (issue) =>
			issue.input === ""
				? "is required when dry-run is false."
				: "must be a valid URL.",
	}),
	supabaseKey: nonEmptyString("is required when dry-run is false."),
	workspace: z.string(),
});

export const actionInputsSchema = z.union([
	dryRunActionInputsSchema,
	uploadActionInputsSchema,
]);

export type UploadDefaults = z.infer<typeof uploadDefaultsSchema>;

export type UploadItem = z.infer<typeof uploadItemSchema>;

export type UploadConfig = z.infer<typeof rawUploadConfigSchema>;

export type ActionInputs = z.infer<typeof actionInputsSchema>;
