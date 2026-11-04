# GitHub Action

Covers: Zapwebp GitHub Action (`zapwebp-github-action`), continuous integration image conversion, pull request image checking, and automated git commits.

Does not cover: local file watching or terminal execution. See [CLI](/cli).

Applies to: `zapwebp/zapwebp-github-action@v1` and `@zapwebp/plugin-sdk` v1.0.0 and later.

## Quick start

```yaml
# .github/workflows/images.yml
name: Images
on:
  pull_request:
    paths: ['**/*.svg']
  push:
    branches: [main]
    paths: ['**/*.svg']

jobs:
  zapwebp:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: zapwebp/zapwebp-github-action@v1
        with:
          glob: 'src/**/*.svg'
          scale: '1,2,3'
          base-width: 512
          mode: commit
```

## What it does

The Zapwebp GitHub Action enforces image hygiene and automated conversion directly inside GitHub workflows:

- **Automated PR Commits (`mode: commit`)**: Converts modified images and commits the resulting WebP files back to the pull request branch.
- **PR Verification (`mode: check`)**: Fails CI with exit code `1` if unoptimized SVGs are committed without matching WebP assets.
- **Review Comments (`mode: comment`)**: Analyzes rasterization savings and posts a formatted summary table to pull requests without modifying repository code.
- **Clean Mode Governance**: Strictly audits committed images for AI signatures, C2PA manifests, and camera metadata tags.
- **Retina Multipliers**: Emits `@1x`, `@2x`, and `@3x` variants in one pass for responsive `<img srcset>` templates.
- **Idempotency**: Running the action multiple times against the same commit produces zero additional git changes.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `input-glob` | `string` | `'**/*.{svg,png,jpg,jpeg,webp,avif}'` | Glob pattern matching image assets to convert. |
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

## Examples

### Check Mode in Pull Request Status Checks

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    glob: 'public/icons/**/*.svg'
    mode: check
```

Fails CI if developers commit SVGs without running `npx zapwebp` locally.

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

Active scripts (`<script>`), foreign objects (`<foreignObject>`), and inline event handlers (`onload`, `onclick`) inside SVG files are immediately rejected with an actionable build error to prevent stored XSS vulnerabilities.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains active script or XML entity | Remove `<script>` elements and sanitize vector code |
| `E_OUT_OF_DATE` | `check` mode detected missing or uncommitted WebP files | Run `npx zapwebp` locally and commit outputs |
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
  "version": "1.0.0",
  "usage": "- uses: zapwebp/zapwebp-github-action@v1",
  "inputs": {
    "glob": { "type": "string", "default": "**/*.svg" },
    "scale": { "type": "string", "default": "1" },
    "base-width": { "type": "number", "default": 512 },
    "mode": { "enum": ["commit", "check", "comment"], "default": "commit" }
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/github-action"
}
```
