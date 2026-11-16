# GitHub Action

Covers: Zapwebp GitHub Action (`zapwebp-github-action`), continuous integration image conversion, pull request verification, fork safety, at awtomatikong git commits.

Does not cover: lokal na pagsubaybay sa file o pagpapatakbo sa terminal. Tingnan ang [CLI](/cli).

Applies to: `zapwebp/zapwebp-github-action@v1` at `@zapwebp/plugin-sdk` v1.0.0 at mas bago.

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
      contents: write # Kinakailangan para sa mode: commit
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

Pinapatupad ng Zapwebp GitHub Action ang modernong pamantayan ng imahe at awtomatikong conversion sa CI/CD pipelines:

- **Awtomatikong PR Commits (`mode: commit`)**: Kino-convert ang mga binagong imahe at direktang ini-commit ang mga nalikhang WebP pabalik sa sangay.
- **Pagpapatunay sa PR (`mode: check`)**: Nabibigo ang CI na may exit code `1` kung may mga imaheng hindi pa na-optimize. Nagpo-post ng komento sa PR na may eksaktong lokal na utos upang ayusin ito.
- **Komento sa Pagsusuri (`mode: comment`)**: Sinusuri ang natipid na bandwidth at nagpo-post ng talahanayan ng buod sa PR nang hindi binabago ang git state.
- **Fork Safety Gate**: Awtomatikong hinaharang ang `commit` mode sa mga fork pull request (`E_FORK_COMMIT_FORBIDDEN`) upang mapigilan ang hindi awtorisadong pag-commit.
- **Idempotency Hashing**: Nilalampasan ang muling pag-convert ng parehong imahe sa pamamagitan ng input hash (`.zapwebp/hashes.json`) upang makatipid sa CI minutes.
- **Transient Network Retries**: Awtomatikong muling sumusubok ng hanggang 3 beses kapag nagkaroon ng pansamantalang pagkabigo sa network (`ETIMEDOUT`, `ECONNRESET`, 429, 502, 503, 504).
- **Log Sanitization**: Tinatanggal ang buong workspace path ng runner at tinatakpan ang mga sikreto o token sa logs.
- **Clean Mode Governance**: Mahigpit na inaalis ang mga EXIF, GPS, at C2PA provenance metadata.
- **Retina Multipliers**: Lumilikha ng `@1x`, `@2x`, at `@3x` na mga laki para sa responsive design.

## Options

| Parameter | Uri | Default | Deskripsyon |
|---|---|---|---|
| `input-glob` | `string` | `'**/*.{svg,png,jpg,jpeg,webp,avif}'` | Relative glob pattern ng mga imaheng iko-convert. Bawal ang `..` traversal. |
| `format` | `'webp' \| 'png' \| 'jpeg' \| 'avif'` | `'webp'` | Target na format ng output. |
| `scale` | `string` | `'1'` | Multipliers na pinaghihiwalay ng kuwit (hal. `'1,2,3'`). |
| `base-width` | `number` | `512` | 1x na lapad sa pixels (16 hanggang 16,384). |
| `quality` | `number` | `85` | Kalidad ng compression mula `1` hanggang `100`. |
| `lossless` | `boolean` | `false` | Pinapagana ang lossless compression kung saan sinusuportahan. |
| `clean` | `boolean` | `true` | Tinatanggal ang EXIF, XMP, GPS, at C2PA metadata. |
| `out-dir` | `string` | `''` | Output folder. Kapag walang laman, isusulat katabi ng source file. |
| `mode` | `'commit' \| 'check' \| 'comment'` | `'commit'` | Paraan ng pagpapatakbo. |
| `commit-message` | `string` | `'chore: optimize images [zapwebp]'` | Git commit message para sa `commit` mode. |
| `token` | `string` | `${{ github.token }}` | GitHub token para sa pag-commit o pagkomento sa PR. |

## Permission Scoping

| Mode | Kinakailangang Pahintulot | Deskripsyon |
|---|---|---|
| `check` | `contents: read`<br>`pull-requests: write` *(opsyonal)* | Sinusuri ang repo nang hindi nagbabago ng files. |
| `comment` | `contents: read`<br>`pull-requests: write` | Nagpo-post ng buod sa PR. |
| `commit` | `contents: write` | Nagtutulak ng mga na-convert na asset pabalik sa repo. |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | May script o mapanganib na elemento ang SVG | Alisin ang `<script>` tags at linisin ang vector code |
| `E_OUT_OF_DATE` | May mga imaheng hindi pa na-convert sa `check` mode | Patakbuhin ang `npx zapwebp <files>` sa lokal at i-commit |
| `E_FORK_COMMIT_FORBIDDEN` | PR mula sa fork ang nagtangkang magpatakbo ng `commit` mode | Gamitin ang `mode: check` sa mga PR workflows |
| `E_INVALID_INPUT` | May parent traversal `..` o invalid parameter | Itama ang parameter sa workflow file |
| `E_PUSH_DENIED` | Kulang ang pahintulot ng GitHub token sa `contents: write` | Idagdag ang `permissions: { contents: write }` sa job config |

## Related

- [Vite Plugin](/plugins/vite) — Client-side bundler plugin.
- [Next.js Plugin](/plugins/next) — Server-side image optimization.
- [CLI](/cli) — Patakbuhin ang parehong conversion sa iyong lokal na makina.

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
