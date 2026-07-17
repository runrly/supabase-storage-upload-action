import { describe, expect, it } from "vitest";

import { ZodConfigurationError } from "../src/errors.js";
import { parseActionInputs } from "../src/input.js";

const manifest = "files:\n  - from: ./dist";

function actionInputs(
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		config: manifest,
		dryRun: "false",
		supabaseUrl: "https://example.supabase.co",
		supabaseKey: "service-role-key",
		workspace: "/github/workspace",
		...overrides,
	};
}

describe("parseActionInputs", () => {
	it.each([
		["true", true],
		["false", false],
	])("parses boolean %s", (dryRun, expected) => {
		const inputs = parseActionInputs(actionInputs({ dryRun }));

		expect(inputs.dryRun).toBe(expected);
	});

	it.each([
		"True",
		"TRUE",
		"False",
		"FALSE",
	])("rejects non-lowercase boolean %s", (dryRun) => {
		expect(() => parseActionInputs(actionInputs({ dryRun }))).toThrow(
			"dry-run must be true or false.",
		);
	});

	it("allows absent credentials for a dry run", () => {
		expect(
			parseActionInputs(
				actionInputs({ dryRun: "true", supabaseUrl: "", supabaseKey: "" }),
			),
		).toEqual({
			config: manifest,
			dryRun: true,
			workspace: "/github/workspace",
		});
	});

	it("requires credentials for an upload", () => {
		expect(() =>
			parseActionInputs(actionInputs({ supabaseUrl: "", supabaseKey: "" })),
		).toThrow("supabase-url is required when dry-run is false.");
	});

	it("rejects an invalid upload URL", () => {
		expect(() =>
			parseActionInputs(actionInputs({ supabaseUrl: "not-a-url" })),
		).toThrow("supabase-url must be a valid URL.");
	});

	it("rejects unsupported boolean values", () => {
		expect(() => parseActionInputs(actionInputs({ dryRun: "yes" }))).toThrow(
			"dry-run must be true or false.",
		);
	});

	it("does not expose a secret in validation errors", () => {
		const secret = "never-print-this-secret";

		try {
			parseActionInputs(
				actionInputs({ supabaseUrl: "not-a-url", supabaseKey: secret }),
			);
		} catch (error) {
			expect(error).toBeInstanceOf(ZodConfigurationError);
			expect((error as Error).message).not.toContain(secret);
			return;
		}

		expect.unreachable("expected validation to fail");
	});
});
