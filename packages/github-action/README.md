# `zapwebp-github-action`

> Official first-party GitHub Action for Zapwebp — automated image conversion, transparency verification, and PR commenting in CI. Powered by @zapwebp/core.

---

## 1. Scope & Capabilities

- **Covers**: Automated image conversion in GitHub Actions workflows across three distinct modes: `commit` (converts and commits back to branch), `check` (verifies outputs and fails CI if out-of-date), and `comment` (posts markdown comparison table to pull requests). Supports Retina multipliers (@1x/@2x/@3x), alpha channel preservation verification, metadata stripping, universal formats (SVG, PNG, JPEG, WebP, AVIF, GIF), and manifest generation (`zapwebp.manifest.json`).
- **Does not cover**: Local developer watcher mode or Vite/Next.js bundler plugin integrations.
- **Applies to**: GitHub Actions on `ubuntu-latest`, `macos-latest`, and self-hosted runners.

---

## 2. Quickstart

Add the action to your `.github/workflows/images.yml`:

```yaml
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

---

## 3. Workflow Modes

### Mode A: `commit` (Convert & Commit Back)
Converts SVGs, checks git status, and commits generated WebPs directly back to the branch.
Ideal for teams that commit compiled assets to source control.

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    mode: commit
    commit-message: 'chore: convert SVGs to WebP [zapwebp]'
```

### Mode B: `check` (Verification & Linter)
Converts SVGs and checks for uncommitted diffs. If any WebP files are missing or out of date, CI fails with exit code `1`.
Ideal for teams requiring developers to generate assets locally before merging.

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    mode: check
```

### Mode C: `comment` (Review-First PR Comment)
Converts SVGs and posts a formatted summary table to the PR detailing total files, bytes in/out, and compression savings percentage without altering Git state.

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    mode: comment
    token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 4. Full Inputs Reference

| Input | Type | Default | Description |
|---|---|---|---|
| `glob` | `string` | `'**/*.svg'` | Glob pattern matching SVG assets to convert. |
| `scale` | `string` | `'1'` | Comma-separated multipliers (e.g. `'1,2,3'`). |
| `base-width` | `number` | `512` | 1x width in pixels (16 to 16,384). Aspect ratio is strictly preserved. |
| `quality` | `number` | `85` | Compression quality from `1` to `100`. |
| `lossless` | `boolean` | `false` | Enables lossless WebP compression. |
| `clean` | `boolean` | `true` | Strips all EXIF, XMP, C2PA provenance, and private metadata chunks. |
| `out-dir` | `string` | `''` | Target output folder. Empty string writes alongside source SVGs. |
| `mode` | `'commit' \| 'check' \| 'comment'` | `'commit'` | Action execution strategy. |
| `commit-message` | `string` | `'chore: convert SVGs to WebP [zapwebp]'` | Git commit message used in `commit` mode. |
| `token` | `string` | `${{ github.token }}` | GitHub token for git authentication and PR commenting. |

---

## 5. Security & Idempotency

- **Strict SVG Validation**: Any SVG containing `<script>`, `<foreignObject>`, or `on*=` inline event attributes is rejected immediately, failing the action before rasterization.
- **Idempotency Guarantee**: Running the action multiple times on the same commit produces zero additional git changes.
- **Bot Attribution**: Automated commits are authored as `zapwebp[bot]` with email `bot@zapwebp.vercel.app`.

---

## 6. Manifest Output (`zapwebp.manifest.json`)

Written to the destination directory upon conversion:

```json
{
  "generatedBy": "zapwebp-github-action@1.0.0",
  "generatedAt": "2026-11-02T09:00:00.000Z",
  "totals": {
    "inputFiles": 4,
    "outputFiles": 12,
    "inputBytes": 145020
  },
  "options": {
    "scale": [1, 2, 3],
    "baseWidth": 512,
    "quality": 85,
    "lossless": false,
    "clean": true
  },
  "files": [
    {
      "source": "src/icons/logo.svg",
      "target": "src/icons/logo.webp",
      "scale": 1,
      "width": 512,
      "height": 512,
      "bytes": 2840,
      "alphaPreserved": true,
      "sha256": "3a8b29..."
    }
  ]
}
```

---

## 7. Error Codes & Diagnostics

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains active script or XML entity | Remove `<script>` elements and sanitize vector code |
| `E_OUT_OF_DATE` | `check` mode detected missing or uncommitted WebP files | Run `npx zapwebp` locally and commit outputs |
| `E_PUSH_DENIED` | GitHub token lacks `contents: write` permission | Add `permissions: { contents: write }` to job configuration |

---

## 8. For Agents

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

