# GitHub Action

Covers: Zapwebp GitHub Action (`zapwebp-github-action`), continuous integration image conversion, pull request verification, fork safety, and automated git commits.

Does not cover: local file watching or terminal execution. See [CLI](/cli).

Applies to: `zapwebp/zapwebp-github-action@v1` and `@zapwebp/plugin-sdk` v1.0.0 and later.

## Quick start

```yaml
# .github/workflows/images.yml
name: Images
on:
  pull_request:
    paths: ['**/*.{svg,png,jpg,jpeg,webp,avif}']
  push:
    branches: [main]
    paths: ['**/*.{svg,png,jpg,jpeg,webp,avif}']

concurrency:
  group: zapwebp-${{ github.ref }}
  cancel-in-progress: true

jobs:
  zapwebp:
    runs-on: ubuntu-latest
    permissions:
      contents: write # Required for mode: commit
    steps:
      - uses: actions/checkout@v4
      - uses: zapwebp/zapwebp-github-action@v1
        with:
          glob: 'src/**/*.{svg,png}'
          scale: '1,2'
          base-width: 512
          mode: commit
```

## What it does

The Zapwebp GitHub Action enforces image hygiene and automated conversion directly inside GitHub workflows:

- **Automated PR Commits (`mode: commit`)**: Converts modified images and commits the resulting WebP files back to the pull request branch.
- **PR Verification (`mode: check`)**: Fails CI with exit code `1` if unoptimized images are committed without matching WebP assets. Posts an actionable PR comment with the exact local CLI fix command.
- **Review Comments (`mode: comment`)**: Analyzes rasterization savings and posts a formatted summary table to pull requests without modifying repository code.
- **Fork Safety Gate**: Automatically blocks `commit` mode on fork pull requests (`E_FORK_COMMIT_FORBIDDEN`), preventing unauthorized commits and privilege escalation.
- **Idempotency Hashing**: Re-conversion of identical images is skipped via input hash comparison (`.zapwebp/hashes.json`), conserving CI runner minutes.
- **Transient Network Retries**: Automatically retries failed GitHub API comment posts up to 3 times with exponential backoff on network errors (`ETIMEDOUT`, `ECONNRESET`, 429, 502, 503, 504).
- **Log Sanitization**: Redacts runner workspace paths and masks authorization tokens from terminal logs.
- **Clean Mode Governance**: Strictly audits committed images for AI signatures, C2PA manifests, and camera metadata tags.
- **Retina Multipliers**: Emits `@1x`, `@2x`, and `@3x` variants in one pass for responsive `<img srcset>` templates.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `input-glob` | `string` | `'**/*.{svg,png,jpg,jpeg,webp,avif}'` | Relative glob pattern matching image assets to convert. Traversal with `..` is rejected. |
| `format` | `'webp' \| 'png' \| 'jpeg' \| 'avif'` | `'webp'` | Target output image format. |
| `scale` | `string` | `'1'` | Comma-separated multipliers (e.g. `'1,2,3'`). |
| `base-width` | `number` | `512` | 1x width in pixels (16 to 16,384). Aspect ratio is strictly preserved. |
| `quality` | `number` | `85` | Compression quality from `1` to `100`. |
| `lossless` | `boolean` | `false` | Enables lossless compression where supported. |
| `clean` | `boolean` | `true` | Strips all EXIF, XMP, C2PA provenance, and private metadata chunks. |
| `out-dir` | `string` | `''` | Target output folder. Empty string writes alongside sources. |
| `mode` | `'commit' \| 'check' \| 'comment'` | `'commit'` | Action execution strategy. |
| `commit-message` | `string` | `'chore: optimize images [zapwebp]'` | Git commit message used in `commit` mode. |
| `token` | `string` | `${{ github.token }}` | GitHub token for git authentication and PR commenting. |

## Permission Scoping

| Mode | Minimum Required Permissions | Description |
|---|---|---|
| `check` | `contents: read`<br>`pull-requests: write` *(optional, for comments)* | Inspects workspace status without altering files. |
| `comment` | `contents: read`<br>`pull-requests: write` | Posts a markdown breakdown to the pull request. |
| `commit` | `contents: write` | Pushes generated image assets back to the branch. |

## Examples

### Check Mode in Pull Request Status Checks

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    glob: 'public/icons/**/*.{svg,png}'
    mode: check
    token: ${{ secrets.GITHUB_TOKEN }}
```

Fails CI with structured workflow annotations and posts a PR comment with the exact command to run locally: `npx zapwebp public/icons/logo.svg`.

### Comment Mode with PR Savings Summary

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    glob: 'assets/**/*.svg'
    mode: comment
    token: ${{ secrets.GITHUB_TOKEN }}
```

Posts an automated comment on pull requests with exact byte savings and file counts.

## Security

Active scripts (`<script>`), foreign objects (`<foreignObject>`), and inline event handlers (`onload`, `onclick`) inside SVG files are immediately rejected with an actionable `E_UNSAFE_SVG` build error to prevent stored XSS vulnerabilities.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains active script or XML entity | Remove `<script>` elements and sanitize vector code |
| `E_OUT_OF_DATE` | `check` mode detected missing or uncommitted WebP files | Run `npx zapwebp <files>` locally and commit outputs |
| `E_FORK_COMMIT_FORBIDDEN` | PR from fork attempted to run with `mode: commit` | Switch to `mode: check` in pull request workflows |
| `E_INVALID_INPUT` | Input contains parent traversal `..`, leading `/`, or invalid scale | Correct input parameter in workflow file |
| `E_PUSH_DENIED` | GitHub token lacks `contents: write` permission | Add `permissions: { contents: write }` to job configuration |

## Related

- [Vite Plugin](/plugins/vite) — Client-side Vite bundler plugin.
- [Next.js Plugin](/plugins/next) — Server-side Next.js optimization.
- [Storage Adapters](/plugins/storage) — Neocities, Supabase, and S3 export targets.
- [CLI](/cli) — Run the same conversion locally.

## For agents

```json
{
  "tool": "zapwebp-github-action",
  "version": "1.2.0",
  "usage": "- uses: zapwebp/zapwebp-github-action@v1",
  "inputs": {
    "glob": { "type": "string", "default": "**/*.{svg,png,jpg,jpeg,webp,avif}" },
    "format": { "enum": ["webp", "png", "jpeg", "avif"], "default": "webp" },
    "scale": { "type": "string", "default": "1" },
    "base-width": { "type": "number", "default": 512 },
    "mode": { "enum": ["commit", "check", "comment"], "default": "commit" }
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/github-action"
}
```
