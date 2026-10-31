# Contributing

Thanks for contributing to the Supabase Storage Upload Action.

## Local checks

Use the Devbox-managed toolchain:

```sh
devbox run -- pnpm install --frozen-lockfile
devbox run -- pnpm run verify
```

Devbox currently pins Node.js 24.21.0, the latest Node.js 24 version available in its catalog. CI pins Node.js 24.22.2, which includes the October 2026 security fixes. The package engine range accepts both versions; update the Devbox pin and lockfile when a corrected Node.js 24 version becomes available in the catalog.

The Nix-packaged pnpm executable may report an engine warning from its separately pinned Node.js runtime even when project scripts use the Node.js version selected by Devbox.

The published Action uses the runner's bundled `node24` runtime, independently of `actions/setup-node`. Runners must provide Node.js 24.22.1 or later for the [October 2026 security fixes](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).

Commits must follow Conventional Commits. The tracked Husky hooks run the complete verification suite and validate commit messages locally; pull requests run the same verification, Conventional Commit validation, and GitHub Dependency Review.

## Changesets

Add a changeset with `pnpm changeset` for a user-facing change to the published Action. Select the SemVer impact and describe the consumer-visible change in plain language. Do not add one for documentation-only, CI-only, test-only, or internal maintenance work.

Changesets are combined into a Release PR on `changeset-release/main`. Maintainers review and merge that PR; contributors do not create tags or GitHub Releases.

## Pull requests

Keep pull requests focused, include regenerated `dist/index.js` when runtime code changes, and explain validation performed. Use the private vulnerability reporting flow for security issues rather than public pull requests or Issues.
