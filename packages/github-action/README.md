# zapwebp-github-action

Official first-party GitHub Action for Zapwebp — transparency-safe image conversion, alpha channel verification, automated PR commenting, and CI pipeline hardening. Powered by `@zapwebp/core`.

Covers: Automated image conversion in GitHub Actions workflows across three distinct modes: `commit` (converts and commits back to branch), `check` (verifies outputs and fails CI if out-of-date), and `comment` (posts markdown comparison table to pull requests). Supports Retina multipliers (@1x/@2x/@3x), alpha preservation verification, metadata stripping (Clean Mode), universal formats (SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF), hash-based idempotency caching (`.zapwebp/hashes.json`), and manifest generation (`zapwebp.manifest.json`).

Does not cover: Local developer watcher mode or Vite/Next.js bundler plugin integrations.

Applies to: GitHub Actions on `ubuntu-latest`, `macos-latest`, `windows-latest`, and self-hosted runners.

---

## Quick start

### Recommended: SHA-Pinned (Supply Chain Safe)

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
      - name: Checkout
        uses: actions/checkout@v4

      # Recommended: Pin to specific commit SHA for immutable supply chain security
      - name: Optimize Images
        uses: zapwebp/zapwebp-github-action@a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0 # v1.2.0
        with:
          glob: 'src/**/*.{svg,png}'
          scale: '1,2'
          base-width: 512
          mode: commit
```

### Floating Tag

```yaml
- uses: zapwebp/zapwebp-github-action@v1
  with:
    mode: check
```

---

## 3. Workflow Modes & Least-Privilege Permissions

| Mode | Purpose | Required GitHub Token Permission | Behavior on Failure |
|---|---|---|---|
| `check` | Verification & Linter | `contents: read`<br>`pull-requests: write` *(optional, for PR comments)* | Fails CI with exit code `1` and emits file-level annotations with the exact `npx zapwebp` fix command. |
| `comment` | Review-First PR Summary | `contents: read`<br>`pull-requests: write` | Posts a markdown comparison table detailing byte savings, format counts, and bandwidth efficiency. |
| `commit` | Convert & Commit Back | `contents: write` | Automatically commits and pushes converted assets back to the branch. **Blocked on fork PRs.** |

### Mode A: `check` (Verification & Linter)
Fails CI if unoptimized images exist or converted assets are missing/out-of-date.

```yaml
jobs:
  verify-images:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: zapwebp/zapwebp-github-action@v1
        with:
          glob: 'public/**/*.{svg,png}'
          mode: check
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Mode B: `comment` (Review-First PR Comment)
Emits compression analysis to the pull request without modifying git state:

```yaml
jobs:
  report-images:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: zapwebp/zapwebp-github-action@v1
        with:
          glob: 'assets/**/*.svg'
          mode: comment
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Mode C: `commit` (Convert & Commit Back)
Converts images, checks git status, and pushes optimized assets directly to the branch:

```yaml
jobs:
  optimize-images:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: zapwebp/zapwebp-github-action@v1
        with:
          glob: 'src/assets/**/*.svg'
          mode: commit
          commit-message: 'chore: optimize assets via zapwebp [skip ci]'
```

---

## What it does

`zapwebp-github-action` automates repository image hygiene directly within GitHub Actions pipelines:
- **Three Operational Modes**:
  - `check`: Validates image optimization status and fails CI if assets are unoptimized or missing.
  - `comment`: Posts a markdown visual comparison table on PRs detailing byte savings and alpha safety.
  - `commit`: Automatically optimizes and pushes converted assets back to the source branch.
- **Supply Chain Security**: SHA-pinned containerized execution (`ghcr.io/zapwebp/zapwebp-github-action`) with least-privilege token requirements.
- **Fork Safety Gate**: Strictly blocks `commit` mode on PRs from fork repositories (`E_FORK_COMMIT_FORBIDDEN`).
- **Transparency-Safe**: Verifies pixel-level alpha retention across SVG, PNG, and WebP assets.
- **Idempotency Caching**: Compares image SHA hashes in `.zapwebp/hashes.json` to skip redundant processing.

---

## 4. Fork Safety Gate

When a pull request originates from a fork, the action automatically evaluates:

```javascript
if (event.pull_request?.head?.repo?.fork === true && inputs.mode === 'commit') {
  throw new ZapwebpActionError(
    'E_FORK_COMMIT_FORBIDDEN',
    'Zapwebp: commit mode is not allowed on fork PRs. Use mode: check instead.'
  );
}
```

This prevents malicious pull requests from using workflow tokens to commit unauthorized code back to repositories.

---

## 5. Full Inputs Reference

| Input | Type | Default | Description |
|---|---|---|---|
| `input-glob` / `glob` | `string` | `'**/*.{svg,png,jpg,jpeg,webp,avif}'` | Relative glob pattern matching source image files. Parent `..` traversal and absolute paths are rejected. |
| `format` | `'webp' \| 'png' \| 'jpeg' \| 'avif'` | `'webp'` | Target output image format. |
| `scale` | `string` | `'1'` | Comma-separated multipliers (e.g. `'1,2,3'`). |
| `base-width` | `number` | `512` | 1x width in pixels (16 to 16,384). Aspect ratio is strictly preserved. |
| `quality` | `number` | `85` | Compression quality from `1` to `100`. |
| `lossless` | `boolean` | `false` | Enables lossless WebP compression. |
| `clean` | `boolean` | `true` | Strips all EXIF, XMP, GPS, and C2PA provenance metadata chunks. |
| `out-dir` | `string` | `''` | Target output folder. Empty string writes alongside source images. |
| `mode` | `'commit' \| 'check' \| 'comment'` | `'commit'` | Action execution strategy. |
| `commit-message` | `string` | `'chore: optimize images [zapwebp]'` | Git commit message used in `commit` mode. |
| `token` | `string` | `${{ github.token }}` | GitHub token for git authentication and PR commenting. |

---

## Errors

When a check fails, Zapwebp emits standard GitHub workflow annotations with structured metadata:

| Error Code | Trigger | Action Annotation | PR Comment Fix |
|---|---|---|---|
| `E_UNSAFE_SVG` | Vector asset contains `<script>`, `<foreignObject>`, or `on*=` inline handlers | `::error file=...::SVG contains active scripts` | Sanitize vector code or add file to ignore list. |
| `E_OUT_OF_DATE` | `check` mode detected missing or uncommitted converted assets | `::error::Verification failed` | Run `npx zapwebp <files>` locally and commit outputs. |
| `E_FORK_COMMIT_FORBIDDEN` | PR from fork attempted to execute with `mode: commit` | `::error::commit mode forbidden on forks` | Switch workflow to `mode: check`. |
| `E_INVALID_INPUT` | Input contains parent traversal `..`, leading `/`, or newlines | `::error::Input validation failed` | Correct workflow input parameter. |
| `E_CONVERSION_FAILED` | Underlying raster/vector encoding failed | `::error file=...::Conversion failed` | Verify input image format and dimensions. |

---

## For agents

```json
{
  "tool": "zapwebp-github-action",
  "uses": "zapwebp/zapwebp-github-action@v1",
  "modes": ["check", "comment", "commit"],
  "inputs": [
    "glob",
    "format",
    "scale",
    "base-width",
    "quality",
    "lossless",
    "clean",
    "mode",
    "token"
  ]
}
```

---

## Related

- [GitHub Action Documentation](https://zapwebp-docs.vercel.app/plugins/github-action): Workflow triggers and multi-mode setup.
- [CLI Reference](https://zapwebp-docs.vercel.app/cli): Running `zap check` locally before pushing to CI.
- [Vite Plugin](https://zapwebp-docs.vercel.app/plugins/vite): Build-time optimization equivalent.

---

## 7. Multi-OS Test Matrix & CI Verification

The action is continuously verified in CI across three operating systems and all three operating modes:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    mode: [check, comment, commit]
```

To validate your `action.yml` and workflow definitions locally, use `actionlint`:

```bash
docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest
```

---

## 8. License & Governance

- **License**: MIT ([LICENSE](LICENSE))
- **Maintainer**: Eldrex Delos Reyes Bula
- **Organization**: Zapwebp
- **Jurisdiction**: Republic of the Philippines
- **Documentation**: [https://zapwebp-docs.vercel.app/plugins/github-action](https://zapwebp-docs.vercel.app/plugins/github-action)
