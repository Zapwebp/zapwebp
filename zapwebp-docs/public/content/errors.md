# Errors

Covers: comprehensive dictionary of Zapwebp error codes, their causes, and immediate resolutions.

Does not cover: general operating system errors. See [CLI](/cli) and [Safety](/safety).

Applies to: Zapwebp v1.1.0 and later.

## Quick start

```bash
npx zapwebp --help
```

Displays valid command arguments and allowed parameter options.

## What it does

Catalogs every structured error condition produced across the Zapwebp engine, CLI, MCP tools, and HTTP REST API, mapping each code to its specific cause and actionable remediation.

## Error reference

| Code | Cause | Fix |
|---|---|---|
| `unsafe_svg` | SVG contains `<script>` or event handlers | Remove scripts; only vector shapes are supported |
| `alpha_not_representable` | Transparent image converted to JPEG without background | Supply `--background "#ffffff"` or target WebP/AVIF |
| `outside_root` | Source or destination path resolves outside project root | Use paths strictly within the project boundary |
| `dimension_limit_exceeded` | Image exceeds 4096px width or height | Downscale original image prior to conversion |
| `unsupported_format` | Unrecognized byte header or unsupported format | Input must be SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF |
| `empty_upload` | Input file or upload stream contains 0 bytes | Verify input file has non-zero size |
| `batch_limit_exceeded` | Total batch upload bytes exceed host limits | Reduce batch item count or image resolutions |
| `output_overwrite_conflict` | Destination would overwrite an existing source file | Specify `--out-dir` or select a different output format |

## Examples

### Handling transparency error

```bash
$ npx zapwebp badge.png --to jpeg
zapwebp: JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.
```

### Remediating with explicit background

```bash
$ npx zapwebp badge.png --to jpeg --background "#ffffff"
✓ badge.png → badge.jpg (flattened onto #ffffff)
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `error_code_not_found` | Application emitted an uncataloged exception | Review error message string for specifics |

## For agents

```json
{
  "errorRegistry": {
    "unsafe_svg": { "exitCode": 1, "status": 400 },
    "alpha_not_representable": { "exitCode": 1, "status": 400 },
    "outside_root": { "exitCode": 1, "status": 403 },
    "dimension_limit_exceeded": { "exitCode": 1, "status": 400 },
    "unsupported_format": { "exitCode": 1, "status": 400 },
    "batch_limit_exceeded": { "exitCode": 1, "status": 413 }
  }
}
```

## Related

- [Safety](/safety): Security rules and restrictions.
- [CLI](/cli): Command line tool options.

