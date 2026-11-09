# Errors

Covers: comprehensive dictionary of all 22 Zapwebp error codes, their causes, and immediate resolutions.

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
| `E_UNSAFE_SVG` | SVG contains `<script>`, inline event handlers, or external entities | Remove scripts and external entities; only vector shapes are supported |
| `E_TOO_LARGE` | Input file size exceeds `maxInputBytes` limit | Compress the input file or increase `maxInputBytes` in configuration |
| `E_OUTPUT_TOO_LARGE` | Output cannot be compressed below target `maxOutputBytes` limit | Increase target bytes limit, adjust quality, or downscale image dimensions |
| `E_UNSUPPORTED_FORMAT` | Format not in accepted allowlist or cannot be decoded | Supply an SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF file |
| `E_CORRUPT_HEADER` | File byte header is invalid or truncated | Check file integrity or re-export the image |
| `E_EMPTY_FILE` | Input file is empty (0 bytes) | Verify file source has non-zero size before converting |
| `E_ALPHA_NOT_REPRESENTABLE` | Transparent image converted to JPEG without background color | Supply `--background "#ffffff"` or choose WebP, PNG, or AVIF |
| `E_PATH_TRAVERSAL` | Source or destination path resolves outside project root boundary | Use paths strictly within the project directory root |
| `E_READ_PERMISSION` | Cannot read the input file from local filesystem | Verify read permissions on the source image file |
| `E_WRITE_PERMISSION` | Cannot write the output file to destination filesystem | Verify write permissions on the target directory |
| `E_DISK_FULL` | Disk space exhausted during write | Free disk space on the host device and retry |
| `E_SYMLINK_LOOP` | Symlink cycle or circular directory reference detected | Remove recursive symlinks or exclude directory |
| `E_TIMEOUT` | Conversion exceeded maximum execution time threshold | Downscale input resolution or increase conversion timeout |
| `E_WASM_FAILED` | WASM conversion engine failed to initialize | Ensure WebAssembly is supported in your environment |
| `E_NODE_VERSION` | Node.js version is too old (< 22.0.0) | Upgrade Node.js runtime to version 22 or later |
| `E_INVALID_CONFIG` | Config file is malformed or contains invalid options | Validate syntax in `zapwebp.config.js` or `package.json` |
| `E_UPLOADER_REQUIRED` | UI state store called without an active conversion handler | Provide an `uploader` callback function to `createZapStore` |
| `E_CROP_EMPTY` | Crop region resulted in 0×0 dimensions | Specify non-zero crop coordinates within image bounds |
| `E_MODEL_FAILED` | AI detection model failed to load or initialize | Pipeline automatically falls back to Smart-Subject mode |
| `E_RATE_LIMIT` | Too many requests submitted in a short time window | Wait a few moments before retrying |
| `E_AUTH` | Invalid or expired storage adapter credentials | Verify API keys, service tokens, or secrets |
| `E_STORAGE` | Storage provider returned an unhandled error | Check remote storage bucket permissions and connection status |
| `E_UNKNOWN_FORMAT` | Magic bytes do not match any recognized image format | Check file extension or install an expansion format plugin |

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
    "E_UNSAFE_SVG": { "exitCode": 1, "status": 400 },
    "E_TOO_LARGE": { "exitCode": 1, "status": 413 },
    "E_OUTPUT_TOO_LARGE": { "exitCode": 1, "status": 413 },
    "E_UNSUPPORTED_FORMAT": { "exitCode": 1, "status": 400 },
    "E_CORRUPT_HEADER": { "exitCode": 1, "status": 400 },
    "E_EMPTY_FILE": { "exitCode": 1, "status": 400 },
    "E_ALPHA_NOT_REPRESENTABLE": { "exitCode": 1, "status": 400, "suggestedFix": { "background": "#ffffff" } },
    "E_PATH_TRAVERSAL": { "exitCode": 1, "status": 403 },
    "E_READ_PERMISSION": { "exitCode": 1, "status": 403 },
    "E_WRITE_PERMISSION": { "exitCode": 1, "status": 403 },
    "E_DISK_FULL": { "exitCode": 1, "status": 507 },
    "E_SYMLINK_LOOP": { "exitCode": 1, "status": 400 },
    "E_TIMEOUT": { "exitCode": 1, "status": 408 },
    "E_WASM_FAILED": { "exitCode": 1, "status": 500 },
    "E_NODE_VERSION": { "exitCode": 1, "status": 500 },
    "E_INVALID_CONFIG": { "exitCode": 1, "status": 400 },
    "E_UPLOADER_REQUIRED": { "exitCode": 1, "status": 400 },
    "E_CROP_EMPTY": { "exitCode": 1, "status": 400 },
    "E_MODEL_FAILED": { "exitCode": 1, "status": 500, "fallback": "subject" },
    "E_RATE_LIMIT": { "exitCode": 1, "status": 429 },
    "E_AUTH": { "exitCode": 1, "status": 401 },
    "E_STORAGE": { "exitCode": 1, "status": 502 },
    "E_UNKNOWN_FORMAT": { "exitCode": 1, "status": 400 }
  }
}
```

## Related

- [Safety](/safety): Security rules and restrictions.
- [CLI](/cli): Command line tool options.
