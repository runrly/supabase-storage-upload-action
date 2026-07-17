import { describe, expect, it } from "vitest";

import { parseConfig } from "../src/config.js";
import { ConfigurationError, ZodConfigurationError } from "../src/errors.js";
import { uploadDefaultsSchema, uploadItemSchema } from "../src/schemas.js";

describe("parseConfig", () => {
	it("parses inherited options and normalizes cache-control numbers", () => {
		const config = parseConfig(`
default:
  bucket: public-assets
  upsert: true
  cache-control: 3600
files:
  - from: ./dist/app.js
    to: assets/app.min.js
`);

		expect(config).toEqual({
			defaults: { bucket: "public-assets", upsert: true, cacheControl: "3600" },
			files: [{ from: "./dist/app.js", to: "assets/app.min.js" }],
		});
	});

	it("accepts cache-control strings without coercing boolean values", () => {
		const config = parseConfig(`
files:
  - from: ./dist/app.js
    cache-control: public, max-age=3600
`);

		expect(config.files[0]?.cacheControl).toBe("public, max-age=3600");
		expect(() =>
			parseConfig(`
files:
  - from: ./dist/app.js
    cache-control: true
`),
		).toThrow(
			"files[0].cache-control must be a non-negative integer or a non-empty string.",
		);
	});

	it("rejects unknown fields", () => {
		expect(() =>
			parseConfig(`
files:
  - from: ./dist
    cache: forever
`),
		).toThrow("files[0].cache is not supported.");
	});

	it("normalizes content-type to the internal field name", () => {
		const config = parseConfig(`
files:
  - from: ./dist/app.js
    content-type: application/javascript
`);

		expect(config.files[0]?.contentType).toBe("application/javascript");
	});

	it("validates transformed fields through camelCase schemas", () => {
		expect(
			uploadDefaultsSchema.parse({ cacheControl: "3600", upsert: false }),
		).toEqual({ cacheControl: "3600", upsert: false });
		expect(
			uploadItemSchema.parse({
				from: "./dist/app.js",
				contentType: "application/javascript",
			}),
		).toEqual({
			from: "./dist/app.js",
			contentType: "application/javascript",
		});
		expect(() =>
			uploadDefaultsSchema.parse({ "cache-control": "3600" }),
		).toThrow();
	});

	it("reports unknown root fields using the config path", () => {
		expect(() =>
			parseConfig(`
version: 1
files:
  - from: ./dist
`),
		).toThrow("config.version is not supported.");
	});

	it("rejects an empty files list with a Zod configuration error", () => {
		expect(() => parseConfig("files: []")).toThrow(
			"files must be a non-empty list.",
		);
		expect(() => parseConfig("files: []")).toThrow(ZodConfigurationError);
	});

	it("rejects invalid cache-control values", () => {
		expect(() =>
			parseConfig(`
files:
  - from: ./dist
    cache-control: -1
`),
		).toThrow(
			"files[0].cache-control must be a non-negative integer or a non-empty string.",
		);
	});

	it("rejects multi-pattern and negated sources", () => {
		expect(() =>
			parseConfig(`
files:
  - from: "!./dist"
`),
		).toThrow("files[0].from accepts one include path or glob pattern.");
	});

	it("preserves ConfigurationError compatibility", () => {
		expect(() => parseConfig("files: []")).toThrow(ConfigurationError);
	});
});
