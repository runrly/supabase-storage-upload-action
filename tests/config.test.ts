import { describe, expect, it } from "vitest";

import { parseConfig } from "../src/config.js";
import { ConfigurationError } from "../src/errors.js";

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

	it("rejects unknown fields", () => {
		expect(() =>
			parseConfig(`
files:
  - from: ./dist
    cache: forever
`),
		).toThrow(ConfigurationError);
	});
});
