# Changesets

Changesets record the SemVer impact and changelog entry for a user-facing change.

Run `pnpm changeset` for a change that affects the published GitHub Action. Choose `major`, `minor`, or `patch` and write a concise consumer-facing summary. Do not add a changeset for documentation-only, CI-only, test-only, or internal maintenance changes.

The release workflow combines pending changesets in a persistent Release PR on `changeset-release/main`. Merging that PR updates `package.json` and `CHANGELOG.md`; a separate protected workflow creates the signed Git tag.
