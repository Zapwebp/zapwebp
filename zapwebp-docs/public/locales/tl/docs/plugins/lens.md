# Lens CLI

Covers: read-only na inspeksyon ng imahe, visual difference analysis, alpha channel presence verification, static HTML reports, cryptographic verification, at terminal metrics diagnostics.

Does not cover: pagbabago o pagsusulat sa mga imahe. Tingnan ang [CLI](/cli) para sa conversion commands.

Applies to: `@zapwebp/lens` at `zapwebp-lens` v1.0.0 at mas bago.

## Quick start

```bash
npm install -g zapwebp-lens
```

Suriin ang format, channels, chunks, at metadata ng imahe:

```bash
lens inspect logo.webp
```

Mag-fail sa CI kung may natitirang metadata (EXIF/XMP/IPTC/C2PA):

```bash
lens inspect logo.webp --fail-if-dirty
```

Suriin ang visual diff sa browser:

```bash
lens diff original.png converted.webp --visual
```

Gumawa ng static HTML report artifact para sa CI PR review:

```bash
lens report dist/*.webp --html report.html
```

Patunayan ang SHA-256 hash:

```bash
lens verify asset.png --expected-sha256 <hex>
lens verify asset.png --from-manifest manifest.json
```

## What it does

- **Read-Only Invariant**: Sinusuri ang mga imahe nang hindi binabago ang file, timestamp, o permissions. Hindi nagpapatakbo ng untrusted scripts at walang telemetry.
- **Strict Sandbox & Symlink Defense**: Tinatanggihan ang mga symbolic links gamit ang `E_SYMLINK` at nililimitahan ang file read sa 100 MB (`--max-bytes`).
- **Isolated Temp Writes**: Lumilikha ng nakahiwalay na temporary folder gamit ang `mkdtemp` sa loob ng `os.tmpdir()` na may `0o600` permissions.
- **Decode Timeouts**: Pinoprotektahan ng 5,000ms timeout (`--timeout`) na may `E_DECODE_TIMEOUT` laban sa DoS.
- **SVG Security Gate**: Tinatanggihan ang mga mapanganib na SVG na may script o external entity gamit ang `E_UNSAFE_SVG`.
- **CI Safety Guard**: Pinipigilan ang pagbukas ng browser sa CI environments gamit ang `E_OPEN_IN_CI`.
- **Standard Exit Codes**: `0` (Tagumpay), `1` (User error o dirty metadata), `2` (Argument error), `3` (Internal unexpected error).

## Commands

| Command | Paggamit | Deskripsyon |
|---|---|---|
| `inspect` | `lens inspect <file> [--fail-if-dirty]` | Pagsusuri sa format, dimensions, chunks, at metadata. |
| `compare` | `lens compare <src> <tgt>` | Paghahambing ng laki ng file, sukat, at alpha preservation. |
| `alpha` | `lens alpha <file>` | Pagsusuri sa RGBA pixels kung may transparency. |
| `diff` | `lens diff <a> <b> [--visual]` | Hex diff at visual difference analysis sa checkerboard. |
| `report` | `lens report <files...> [--html]` | Pangkalahatang ulat para sa maraming file na may static HTML. |
| `verify` | `lens verify <file> [--expected-sha256 \| --from-manifest]` | Pagpapatunay ng cryptographic hash laban sa checksum o manifest. |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_FILE_NOT_FOUND` | Hindi mahanap ang tinukoy na file path. | Tiyaking tama at umiiral ang ibinigay na file path. |
| `E_SYMLINK` | Ang input file ay isang symbolic link. | Magpasa ng totoong path ng file. |
| `E_FILE_TOO_LARGE` | Lumagpas ang file sa `--max-bytes` limit (100 MB). | I-compress muna ang imahe bago suriin. |
| `E_DECODE_TIMEOUT` | Mas matagal ang pag-decode kaysa sa tinukoy na timeout. | Taasan ang `--timeout` o suriin kung sira ang file. |
| `E_UNSAFE_SVG` | Ang SVG ay naglalaman ng script o external entity. | Linisin ang SVG o gamitin ang `--allow-unsafe`. |
| `E_DIRTY_METADATA` | May natitirang metadata ang file habang naka-on ang `--fail-if-dirty`. | Patakbuhin ang `zap <file> --clean` upang linisin ito. |
| `E_OPEN_IN_CI` | Tinangkang buksan ang browser sa isang automated CI environment. | Huwag gamitin ang `--open` o gamitin ang `--html [file]`. |

## Related

- [CLI](/cli) — Pangunahing conversion tool na may journaled transformations.
- [Clean Mode](/clean) — Pag-aalis ng metadata at zero-trust sanitization.
- [Formats Matrix](/formats) — Talaan ng mga suportadong container at transparency matrix.

## For agents

```json
{
  "pkg": "zapwebp-lens",
  "version": "1.0.0",
  "bin": "lens",
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/lens",
  "docs": "https://zapwebp-docs.vercel.app/plugins/lens",
  "commands": ["inspect", "compare", "alpha", "diff", "report", "verify"],
  "exitCodes": {
    "0": "Tagumpay",
    "1": "User error o may natitirang metadata",
    "2": "Argument o configuration error",
    "3": "Internal unexpected error"
  }
}
```
