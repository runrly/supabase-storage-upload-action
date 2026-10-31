# supabase-storage-upload-action

## 1.0.5

### Patch Changes

- c85b0aa: Update bundled HTTP and glob-matching dependencies to fix denial-of-service and TLS certificate validation vulnerabilities.
- 698daea: Update the bundled Zod configuration validator to 4.6.7, including the fix for excessive memory use when validating oversized constrained collections.
- 3fd5930: Update the bundled Supabase client to 2.116.0.

## 1.0.4

### Patch Changes

- c9cf928: Refresh bundled dependencies and regenerate the Action distribution.
- 8400c60: Patch vulnerable transitive dependencies in the bundled Action.
- ee4aad0: Simplify upload guard clauses while preserving validation diagnostics.

## 1.0.3

### Patch Changes

- 4668370: Update bundled dependencies to address known security vulnerabilities.

## 1.0.2

### Patch Changes

- 91c487e: Fix MIME type detection for files matched by directory and glob sources.

## 1.0.1

### Patch Changes

- feffc9a: Use a unique GitHub Marketplace action name.

## 1.0.0

### Major Changes

- 1a46d09: Initial stable release of the Supabase Storage upload GitHub Action, including manifest-driven uploads, dry-run planning, and standard or resumable transports.
