# Lens CLI

Covers: read-only image inspection, visual difference analysis, alpha channel presence verification, and terminal metrics diagnostics.

Does not cover: in-place image mutation or format re-encoding. See [CLI](/cli) for conversion commands.

Applies to: `zapwebp-lens` v1.0.0 and later.

## Quick start

```bash
npm install -g zapwebp-lens
```

Inspect image channels and metadata:

```bash
lens inspect logo.webp
```

Verify alpha channel integrity:

```bash
lens alpha icon.png
```

Compare original and converted files visually and numerically:

```bash
lens diff original.png converted.webp
```

## What it does

- **Read-Only Inspection**: Analyzes images without altering timestamps, metadata, or file system permissions.
- **Alpha Channel Verification**: Computes percentage of transparent and semi-transparent pixels across RGBA channels.
- **Visual Diff Calculation**: Computes Peak Signal-to-Noise Ratio (PSNR) and Structural Similarity (SSIM) between original and converted variants.
- **Machine-Readable Outputs**: Supports `--json` flag for automated CI pipeline assertions.

## Commands

| Command | Usage | Description |
|---|---|---|
| `inspect` | `lens inspect <file>` | Prints format, dimension, channels, color depth, and embedded metadata tags. |
| `alpha` | `lens alpha <file>` | Checks if alpha channel is present, non-opaque, or corrupted. |
| `diff` | `lens diff <a> <b>` | Evaluates compression artifacts and fidelity loss between two images. |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_FILE_NOT_FOUND` | Specified target image path does not exist. | Verify file path before invoking lens. |
| `E_UNRECOGNIZED_FORMAT` | File header does not match any recognized image signature. | Ensure the file is a valid SVG, WebP, PNG, JPEG, AVIF, or TIFF image. |

## Related

- [CLI](/cli) — Primary conversion tool with journaled transformations.
- [Clean Mode](/clean) — Metadata stripping and zero-trust sanitization.
- [Formats](/formats) — Complete image format and channel support matrix.

## For agents

```json
{
  "pkg": "zapwebp-lens",
  "version": "1.0.0",
  "bin": "lens",
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/lens",
  "docs": "https://zapwebp-docs.vercel.app/plugins/lens"
}
```
