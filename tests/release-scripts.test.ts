import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const validateReleaseTagScript = join(
	process.cwd(),
	".github/scripts/validate-release-tag.sh",
);

function validateTag(tag: string): { stderr: string; status: number } {
	const temporaryDirectory = mkdtempSync(join(tmpdir(), "release-tag-test-"));
	const outputPath = join(temporaryDirectory, "github-output");

	try {
		execFileSync("bash", [validateReleaseTagScript], {
			cwd: temporaryDirectory,
			encoding: "utf8",
			env: {
				...process.env,
				GITHUB_OUTPUT: outputPath,
				GITHUB_REPOSITORY: "runrly/supabase-storage-upload-action",
				RELEASE_TAG: tag,
			},
			stdio: "pipe",
		});
		return { stderr: "", status: 0 };
	} catch (error) {
		const commandError = error as { stderr?: Buffer; status?: number };
		return {
			stderr: commandError.stderr?.toString() ?? "",
			status: commandError.status ?? 1,
		};
	}
}

describe("validate-release-tag.sh", () => {
	test.each(["v1.0", "v1.0.0-rc.1", "1.0.0"])(
		"rejects %s before inspecting GitHub state",
		(tag) => {
			const result = validateTag(tag);

			expect(result.status).not.toBe(0);
			expect(result.stderr).toContain("tag must be a stable vX.Y.Z version");
		},
	);
});
