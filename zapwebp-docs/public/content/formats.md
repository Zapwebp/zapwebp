# Formats

Covers: supported input formats, output targets, transparency handling, multi-frame behavior, and limits.

Does not cover: network transports or CLI flags. See [CLI](/cli) and [MCP](/mcp).

Applies to: `@zapwebp/core` v1.1.0 and later.

## Quick start

```bash
npx zapwebp icon.svg --to webp
```

Verifies SVG format sniffing and outputs alpha-preserved WebP.

## What it does

Sniffs file format headers directly from byte signatures rather than relying solely on file extensions. Validates intrinsic dimensions and ensures alpha transparency is never silently discarded.

## Format matrix

| Format | Type | Alpha support | Frame/Page handling | Max dimensions |
|---|---|---|---|---|
| SVG | Input | Yes (vector) | Single document | 4096 × 4096 px |
| PNG | Input & Output | Yes (8-bit alpha) | Static | 4096 × 4096 px |
| JPEG | Input & Output | No | Baseline / MozJPEG | 4096 × 4096 px |
| WebP | Input & Output | Yes (lossy & lossless) | First frame | 4096 × 4096 px |
| AVIF | Input & Output | Yes (modern compact) | Static | 4096 × 4096 px |
| GIF | Input only | Yes (binary transparency) | First frame only | 4096 × 4096 px |
| TIFF | Input only | Yes (deflate/lzw/rgb) | First page only | 4096 × 4096 px |

## Examples

### Convert animated GIF first frame to AVIF

```bash
$ npx zapwebp animation.gif --to avif -o still.avif
✓ animation.gif (frame 0) → still.avif (42 KB → 8.1 KB)
```

### Flatten transparent PNG to JPEG with background

```bash
$ npx zapwebp badge.png --to jpeg --background "#ffffff" -o badge.jpg
✓ badge.png → badge.jpg (alpha flattened onto #ffffff)
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `unrecognized_format` | Bytes do not match known image signatures | Provide an SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF |
| `dimension_limit_exceeded` | Image side exceeds 4096px or 16M pixels | Downscale image before processing |
| `alpha_flatten_required` | JPEG output requested for transparent image | Pass `--background <color>` or select WebP/AVIF/PNG |

## For agents

```json
{
  "supportedInputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "supportedOutputs": ["webp", "png", "jpeg", "avif"],
  "maxSidePixels": 4096,
  "maxTotalPixels": 16777216,
  "defaults": { "to": "webp", "quality": 85, "effort": 4 }
}
```

## Related

- [Safety](/safety): Parser restrictions and DoS bounds.
- [Errors](/errors): List of all error codes.

