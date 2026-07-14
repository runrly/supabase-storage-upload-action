---
title: "ADR-0001: Adopt a Reproducible Node Toolchain"
status: "Accepted"
date: "2026-07-14"
authors: "Estevão Gabriel <estevao.biondi@gmail.com>"
tags: ["architecture", "decision", "toolchain"]
supersedes: ""
superseded_by: ""
---

# ADR-0001: Adopt a Reproducible Node Toolchain

## Status

Accepted

## Context

This repository starts as a GitHub Action spike and needs a reproducible local toolchain before Action code, metadata, bundling, or CI exist. The official `actions/typescript-action` repository is reference material only; this repository must own its configuration and dependencies.

## Decision

Use Devbox to provide Node.js 24.12.0 LTS and pnpm 11.9.0. Use a private ESM pnpm package with Biome 2.5.3 pinned as its formatter, linter, and import organizer. Keep generated Action distribution output eligible for version control.

## Consequences

### Positive

- **POS-001**: Contributors run the same Node.js and pnpm versions through Devbox.
- **POS-002**: Formatting, linting, and import organization share one pinned tool and two explicit pnpm scripts.
- **POS-003**: Future Action distribution can be committed with its source release.

### Negative

- **NEG-001**: Contributors need Devbox and its Nix-backed package store.
- **NEG-002**: Tool versions need deliberate upgrades instead of floating with global installs.
- **NEG-003**: The repository keeps a Devbox lockfile and pnpm lockfile as maintenance artifacts.

## Alternatives Considered

### Clone `actions/typescript-action`

- **ALT-001**: **Description**: Start from GitHub's TypeScript Action template and remove unneeded files.
- **ALT-002**: **Rejection Reason**: The template contains product, test, bundle, workflow, and release choices outside this spike's bootstrap scope.

### Global Node.js and Corepack

- **ALT-003**: **Description**: Depend on contributor-installed Node.js and Corepack-managed pnpm.
- **ALT-004**: **Rejection Reason**: Runtime and package-manager versions would not be reproducible, and ESM/Corepack integration has caused shell bootstrap drift.

### npm with separate formatter and linter

- **ALT-005**: **Description**: Use npm with Prettier and ESLint.
- **ALT-006**: **Rejection Reason**: pnpm is the chosen package manager and Biome provides the required quality checks in one maintained toolchain.

## Implementation Notes

- **IMP-001**: Devbox disables its Node.js plugin so the Devbox-provided pnpm executable remains the package-manager source.
- **IMP-002**: `pnpm run check` validates without writes; `pnpm run fix` applies safe Biome fixes.
- **IMP-003**: Validation confirms runtime versions, frozen installation, and an idempotent quality check.

## References

- **REF-001**: https://github.com/actions/typescript-action
- **REF-002**: https://www.jetify.com/docs/devbox/configuration
- **REF-003**: https://biomejs.dev/guides/getting-started/
