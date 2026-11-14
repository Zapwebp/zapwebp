# Lens CLI

Covers: read-only image inspection, visual difference analysis, alpha channel presence verification, static HTML reports, cryptographic verification, and terminal metrics diagnostics.

Does not cover: in-place image mutation or format re-encoding. See [CLI](/cli) for conversion commands.

Applies to: `zapwebp-lens` v1.0.0 and later.

## Quick start

```bash
npm install -g zapwebp-lens
```

Inspect image channels, chunks, and metadata:

```bash
lens inspect logo.webp
```

Fail in CI if residual metadata (EXIF/XMP/IPTC/C2PA) is detected:

```bash
lens inspect logo.webp --fail-if-dirty
```

Verify alpha channel integrity:

```bash
lens alpha icon.png
```

Interactive visual difference on checkerboard:

```bash
lens diff original.png converted.webp --visual
```

Generate self-contained static HTML report for PR review artifacts:

```bash
lens report dist/*.webp --html report.html
```

Verify SHA-256 integrity against expected hash or manifest:

```bash
lens verify asset.png --expected-sha256 <hex>
lens verify asset.png --from-manifest manifest.json
```

## What it does

- **Read-Only Invariant**: Analyzes images without altering timestamps, metadata, or file system permissions. Never modifies inputs, never executes untrusted scripts, never phones home.
- **Strict Sandbox & Symlink Defense**: Rejects symbolic links with `E_SYMLINK` and caps file reads at 100 MB (`--max-bytes`) to prevent memory exhaustion and path traversal.
- **Isolated Temp Writes**: Interactive visual diffs create isolated temporary folders via `mkdtemp` within `os.tmpdir()`, verifying `realpath` confinement with owner-only (`0o600`) permissions.
- **Decode Timeouts**: Decodes are guarded by an automated 5,000ms timeout (`--timeout`) throwing `E_DECODE_TIMEOUT` against parser hangs.
- **SVG Security Gate**: Rejects unsafe SVGs containing scripts or external entities with `E_UNSAFE_SVG` unless `--allow-unsafe` is explicitly supplied.
- **CI Safety Guard**: Rejects browser `--open` calls in automated CI environments with `E_OPEN_IN_CI`.
- **Standard Exit Codes**: `0` (Success), `1` (User error / dirty metadata), `2` (Argument error), `3` (Internal unexpected error).

## Commands

| Command | Usage | Description |
|---|---|---|
| `inspect` | `lens inspect <file> [--fail-if-dirty]` | Container chunk analysis, format, dimensions, alpha channel, and metadata audit. |
| `compare` | `lens compare <src> <tgt>` | Side-by-side dimension, byte reduction, and alpha retention comparison. |
| `alpha` | `lens alpha <file>` | Scans RGBA pixel buffer to confirm transparency presence. |
| `diff` | `lens diff <a> <b> [--visual]` | Hex container diff and interactive side-by-side visual difference view. |
| `report` | `lens report <files...> [--html]` | Multi-file audit summary with optional self-contained static HTML report artifact. |
| `verify` | `lens verify <file> [--expected-sha256 \| --from-manifest]` | Validates cryptographic SHA-256 hash against explicit hash or manifest. |

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--json` | `boolean` | `false` | Emits structured JSON envelope `{ version, tool, command, result, errors }` |
| `--fail-if-dirty` | `boolean` | `false` | Causes `inspect` to exit with code 1 if residual metadata exists |
| `--visual` | `boolean` | `false` | Opens interactive side-by-side visual diff in default browser |
| `--html` | `string` | `report.html` | Generates self-contained static HTML report table |
| `--max-bytes` | `number` | `104857600` | Maximum allowed input file size (default: 100 MB) |
| `--max-batch` | `number` | `500` | Maximum number of files processed in a single batch report |
| `--timeout` | `number` | `5000` | Maximum milliseconds allowed for decode operations |
| `--allow-unsafe` | `boolean` | `false` | Permits inspection of SVGs containing active scripts |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_FILE_NOT_FOUND` | Specified target image path does not exist. | Verify file path before invoking lens. |
| `E_SYMLINK` | Input target resolves to a symbolic link. | Pass the real file path or copy the file into working workspace. |
| `E_FILE_TOO_LARGE` | Input file exceeds `--max-bytes` limit (100 MB). | Downscale or compress the image before inspection. |
| `E_DECODE_TIMEOUT` | Image parser took longer than configured timeout. | Increase `--timeout` or verify file is not corrupt. |
| `E_UNSAFE_SVG` | SVG contains active scripts or external entities. | Sanitize SVG or pass `--allow-unsafe` in an isolated environment. |
| `E_DIRTY_METADATA` | Inspected file contains metadata while `--fail-if-dirty` was active. | Run `zap <file> --clean` to strip metadata. |
| `E_OPEN_IN_CI` | `--open` or interactive browser view invoked in CI runner. | Omit `--open` or use `--html [file]` in CI workflows. |

## Related

- [CLI](/cli) — Primary conversion tool with journaled transformations.
- [Clean Mode](/clean) — Metadata stripping and zero-trust sanitization.
- [Formats Matrix](/formats) — Supported container and alpha preservation matrix.

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
    "0": "Success",
    "1": "User error or dirty metadata found",
    "2": "Argument or configuration error",
    "3": "Internal unexpected error"
  }
}
```
