---
title: "ADR-0003: Use Changesets, signed tags, and approved publication"
status: "Accepted"
date: "2026-07-25"
authors: "Project maintainer"
tags: ["architecture", "release", "security", "automation"]
supersedes: ""
superseded_by: ""
---

# ADR-0003: Use Changesets, signed tags, and approved publication

## Context

The Action needs reviewable version and changelog changes, immutable fixed release tags, and a separate maintainer approval before a GitHub Release is published to the Marketplace. The repository is a single private npm package used to publish a public GitHub Action, so npm publishing must not be part of this process.

## Decision

Use Changesets with a persistent `changeset-release/main` branch and a Release PR titled `release: version packages`. Changesets updates `package.json` and `CHANGELOG.md`, but does not tag or publish to npm.

After that PR merges, Runrly Echo creates an annotated SSH-signed `vX.Y.Z` tag in the `release-signing` environment. A separate manual workflow validates that signed tag and creates a draft GitHub Release after approval in `release-publication`. Publishing the Release promotes an SSH-signed movable `vX` tag.

## Consequences

- Contributors declare SemVer impact in changesets; Conventional Commits remain a repository-wide history contract.
- Release PRs are reusable and protected from deletion, matching the Logto model.
- The signing key is referenced only by signing jobs. Organization secrets are scoped to this repository; branch protection and environment gates mitigate that broader repository visibility.
- GitHub Release and Marketplace publication require deliberate maintainer action.

## Alternatives considered

- Release Please was rejected because its current branch name is not configurable to the desired persistent `tool/base-branch` convention.
- semantic-release was rejected because it bypasses a reviewable Release PR.
- Changesets with npm publishing was rejected because this repository publishes an
  Action, not an npm package.
