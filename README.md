# Supabase Storage Upload Action

Upload files from a GitHub Actions workspace to [Supabase Storage](https://supabase.com/docs/guides/storage).

The Action uploads only. It does not create buckets, change RLS policies, or delete remote objects.

## Usage

```yaml
- uses: runrly/supabase-storage-upload-action@v1
  with:
    supabase-url: ${{ secrets.SUPABASE_URL }}
    supabase-key: ${{ secrets.SUPABASE_KEY }}
    config: |
      default:
        bucket: public-assets
        upsert: true
        cache-control: "3600"
      files:
        - from: ./dist
          to: site
        - from: ./manifest.json
          to: site/release.json
          content-type: application/json
        - from: ./dist/assets/**/*
          to: static/
          bucket: static-assets
```

Use a Supabase key that is authorized by your bucket's RLS policies. Store it as a GitHub Actions secret. For a dry run, credentials are not required.

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `config` | Yes | YAML upload manifest. |
| `supabase-url` | No for dry run; otherwise yes | Supabase project URL. |
| `supabase-key` | No for dry run; otherwise yes | Supabase key with Storage permissions. |
| `dry-run` | No | `true` validates and prints the plan without contacting Supabase. Default: `false`. |

## Outputs

| Output | Description |
| --- | --- |
| `matched-count` | Files matched after planning and deduplication. |
| `uploaded-count` | Files successfully uploaded. It is `0` for a dry run. |

## Manifest contract

```yaml
default:
  bucket: optional-default-bucket
  upsert: false
  cache-control: "3600"
files:
  - from: ./path/to/source
    to: optional/object-key-or-directory
    bucket: optional-bucket-override
    upsert: optional-boolean-override
    cache-control: optional-string-or-non-negative-integer-override
    content-type: optional-literal-file-only-MIME-type
```

`files` must be a non-empty list. Each item has one `from` string. `default.bucket` is optional only if every item supplies `bucket`. Item values inherit from `default`; item values win when both are present. `upsert` defaults to `false`, and omitted `cache-control` lets Supabase Storage choose its behavior.

All Object Keys are relative, normalized paths. Absolute paths and `..` segments are rejected.

### `from` and `to` mapping

| Source | `to` behavior |
| --- | --- |
| Literal file | Omitted: upload its basename at the bucket root. Ends in `/`: preserve the basename below that directory. Otherwise: use `to` as the exact Object Key, allowing rename. |
| Directory | Copy its contents recursively. Omitted: copy contents to bucket root. Present: copy contents under that directory prefix. The source directory name is not included. |
| Glob | Match regular files only. Omitted: use paths relative to the glob's static base. Present: put those relative paths below the directory prefix. |

Examples:

```yaml
files:
  - from: ./release/app.js
    to: assets/
  # assets/app.js

  - from: ./release/app.js
    to: assets/app.min.js
  # assets/app.min.js

  - from: ./dist
    to: site
  # site/<contents of dist>

  - from: ./dist/assets/**/*
    to: static/
  # static/<paths relative to dist/assets>
```

`content-type` is accepted only for a literal file. Directories and globs detect the MIME type of each matched file from its filename. Hidden files are included. An empty match is an error.

Sources and resolved symlink targets must stay inside `GITHUB_WORKSPACE`. If multiple items map different sources or effective options to the same bucket and Object Key, the Action fails before uploading. Identical duplicate mappings are uploaded once.

## Upload behavior

- Files up to 6 MiB use Supabase's standard upload endpoint.
- Larger files use the resumable TUS protocol with 6 MiB chunks.
- Uploads run with four concurrent workers and up to three total attempts per file.
- On failure, no new upload is started; in-flight uploads finish, then the Action fails.
- The Action writes its resolved plan to the GitHub Actions job summary.

## Development

Node.js 24 and pnpm are provided by Devbox.

```sh
devbox run -- pnpm install --frozen-lockfile
devbox run -- pnpm run verify
```

The generated `dist/` bundle is part of a release and should be committed with source changes. After validation, publish a compatible release and move the major tag manually, for example `v1`; release automation is intentionally not configured yet.
