import { describe, expect, it } from "vitest";

import { internal } from "../src/transport.js";

describe("resumable endpoint", () => {
	it("uses the Supabase Cloud direct storage hostname", () => {
		expect(internal.resumableEndpoint("https://project-ref.supabase.co")).toBe(
			"https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
		);
	});

	it("keeps a self-hosted deployment under its Storage API base path", () => {
		expect(
			internal.resumableEndpoint("https://supabase.example.test/api"),
		).toBe("https://supabase.example.test/api/storage/v1/upload/resumable");
	});
});
