---
title: "ADR-0002: Adopt a YAML Upload Manifest"
status: "Accepted"
date: "2026-07-15"
authors: "Estevão Gabriel <estevao.biondi@gmail.com>"
tags: ["architecture", "decision", "configuration", "supabase-storage"]
supersedes: ""
superseded_by: ""
---

# ADR-0002: Adopt a YAML Upload Manifest

## Status

Accepted

## Context

A GitHub Action input is a string. The Action needs one configuration surface that can describe multiple Upload Items, inherited upload options, literal files, directories, and glob patterns while staying readable in a Consumer Workflow.

## Decision

Expose one required `config` input containing a strict YAML mapping with `default` and `files` keys. `default` provides inheritable `bucket`, `upsert`, and `cache-control` values. Each Upload Item supplies one `from` string and may override `to`, `bucket`, `upsert`, `cache-control`, and, for literal files only, `content-type`.

An Object Key is always a normalized relative path. Directory and glob sources copy their matched file contents relative to the source base; they never add the source directory name. A literal file can either preserve its basename under a `to` directory suffix or target an exact Object Key.

## Consequences

### Positive

- **POS-001**: A Consumer Workflow has one native Action input while retaining readable multi-file configuration.
- **POS-002**: Inheritance removes repeated bucket and cache settings without introducing hidden routing defaults.
- **POS-003**: Strict field and type validation detects spelling mistakes before an upload starts.
- **POS-004**: One mapping model covers copied folders, globbed assets, and renamed single files.

### Negative

- **NEG-001**: Consumer Workflows must use a YAML block scalar instead of nested `with` keys, which GitHub Actions does not support.
- **NEG-002**: `to` has context-sensitive semantics for a literal file, based on a trailing slash.
- **NEG-003**: Per-file MIME overrides are intentionally unavailable for directory and glob expansions.

## Alternatives Considered

### JSON manifest

- **ALT-001**: **Description**: Receive the same structure as JSON.
- **ALT-002**: **Rejection Reason**: YAML block scalars are more natural in workflow files and avoid JSON punctuation noise.

### Separate `files`, `bucket`, and upload-option inputs

- **ALT-003**: **Description**: Split configuration across multiple Action inputs.
- **ALT-004**: **Rejection Reason**: This cannot express reliable per-item overrides or a cohesive mapping contract.

### Preserve the source directory name

- **ALT-005**: **Description**: Copy a directory as a nested directory in the destination.
- **ALT-006**: **Rejection Reason**: Copying contents is the more useful asset-publishing primitive and keeps `to` predictable.

## Implementation Notes

- **IMP-001**: `default.bucket` may be omitted only when every Upload Item declares `bucket`.
- **IMP-002**: Omitted `upsert` is `false`; omitted `cache-control` is left to Supabase Storage.
- **IMP-003**: A literal-file `to` ending in `/` is a destination directory; without it, `to` is the exact Object Key.
- **IMP-004**: Duplicate destinations fail unless they are the same physical file with identical effective options.
- **IMP-005**: Source paths and resolved symlink targets must remain inside `GITHUB_WORKSPACE`.

## References

- **REF-001**: https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions
- **REF-002**: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- **REF-003**: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
