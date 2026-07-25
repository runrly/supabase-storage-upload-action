# Contributing

Thanks for contributing to the Supabase Storage Upload Action.

## Local checks

Use the Devbox-managed toolchain:

```sh
devbox run -- pnpm install --frozen-lockfile
devbox run -- pnpm run verify
```

Commits must follow Conventional Commits. The tracked Husky hooks run the complete verification suite and validate commit messages locally; pull requests run the same verification, Conventional Commit validation, and GitHub Dependency Review.

## Changesets

Add a changeset with `pnpm changeset` for a user-facing change to the published Action. Select the SemVer impact and describe the consumer-visible change in plain language. Do not add one for documentation-only, CI-only, test-only, or internal maintenance work.

Changesets are combined into a Release PR on `changeset-release/main`. Maintainers review and merge that PR; contributors do not create tags or GitHub Releases.

## Pull requests

Keep pull requests focused, include regenerated `dist/index.js` when runtime code changes, and explain validation performed. Use the private vulnerability reporting flow for security issues rather than public pull requests or Issues.
