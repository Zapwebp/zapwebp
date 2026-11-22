# Errors

Covers: comprehensive dictionary of all structured Zapwebp error codes, root causes, and actionable remediations across core engine, CLI, MCP tools, storage adapters, and HTTP REST API.

Does not cover: general operating system kernel failures or low-level compiler crashes. See [CLI](/cli) and [Safety](/safety).

Applies to: Zapwebp platform v2.28.0 and `@zapwebp/shared` v1.1.2 and later.

## Quick start

```bash
npx zapwebp --help
```

Displays valid command arguments, error recovery options, and diagnostic checks.

## What it does

Catalogs every structured error condition produced across the Zapwebp platform. Every error emitted implements the standard `ZapwebpError` schema, providing machine-readable error codes (`code`), explanatory messages (`message`), concrete remediation advice (`fix`), and direct links to diagnostic documentation (`docs`).

## Error reference

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains `<script>`, inline event handlers, `<foreignObject>`, or XML external entities | Remove scripts and external entities; sanitize vector code with SVGO |
| `E_TOO_LARGE` | Input file size exceeds maximum allowable `maxInputBytes` limit | Compress the input file or increase `maxInputBytes` in configuration |
| `E_INPUT_TOO_LARGE` | Input file byte size exceeds configured conversion policy threshold | Provide a smaller input file or adjust `policy.maxInputBytes` |
| `E_INPUT_TOO_SMALL` | Input file is smaller than required minimum byte threshold | Provide an image file meeting the minimum byte requirement |
| `E_OUTPUT_TOO_LARGE` | Converted image cannot be compressed below `maxOutputBytes` limit | Increase target bytes limit, adjust quality factor, or allow downscaling |
| `E_OUTPUT_TOO_SMALL` | Converted image byte size falls below minimum allowable threshold | Increase quality factor, adjust size limits, or supply higher resolution |
| `E_OUTPUT_BELOW_RANGE` | Converted output falls below the configured target size range | Adjust `minOutputBytes` or switch to flexible compression mode |
| `E_TARGET_UNREACHABLE` | Image complexity prevents fitting within byte budget even after downscaling | Increase target byte budget or allow adaptive Lanczos3 downscaling |
| `E_UNSUPPORTED_FORMAT` | Format is not in accepted allowlist or cannot be decoded | Supply a supported format: SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF, or ICO |
| `E_UNKNOWN_FORMAT` | File byte header does not match any recognized magic bytes | Check file extension or install an expansion format plugin |
| `E_CORRUPT_HEADER` | File byte header is invalid, truncated, or unreadable | Verify source asset integrity or re-export from your graphics editor |
| `E_CORRUPT_INPUT` | Input image stream contains truncated or corrupt data chunks | Ensure file download or file copy completed before converting |
| `E_EMPTY_FILE` | Input file is empty (0 bytes) | Verify file source exists and has non-zero size before converting |
| `E_ALPHA_NOT_REPRESENTABLE` | Converting transparent image to JPEG without providing a background color | Supply `--background "#ffffff"` or switch target to WebP, PNG, or AVIF |
| `E_ALPHA_LOST` | Input has an alpha channel but target format cannot represent transparency | Supply an explicit matte background color or choose an alpha-capable target |
| `E_PATH_TRAVERSAL` | Source or destination path resolves outside project root boundary | Use paths strictly within the project directory root |
| `E_READ_PERMISSION` | Permission denied reading the input file from filesystem | Verify read permissions on the source image file |
| `E_WRITE_PERMISSION` | Permission denied writing output file to destination directory | Verify write permissions on the target folder |
| `E_WRITE_LOCKED` | Destination file is locked by another running process | Close any editor or viewer holding an exclusive lock and retry |
| `E_DISK_FULL` | Disk space exhausted during image output write | Free disk space on the host storage volume and retry |
| `E_SYMLINK_LOOP` | Symlink cycle or circular directory reference detected | Remove circular symlinks or exclude directory using `.zapwebpignore` |
| `E_TIMEOUT` | Conversion exceeded maximum execution time threshold | Downscale input resolution or increase conversion timeout setting |
| `E_WASM_FAILED` | WebAssembly conversion engine failed to initialize in browser | Ensure WebAssembly is supported in your environment or use the CLI |
| `E_NODE_VERSION` | Current Node.js version is too old (< 22.0.0) | Upgrade Node.js runtime to version 22 or later |
| `E_INVALID_CONFIG` | Configuration file is malformed or contains invalid option keys | Validate JSON syntax in `.zapwebp/config.json` or `package.json` |
| `E_UPLOADER_REQUIRED` | UI state store called without an active conversion handler callback | Provide an `uploader` callback function to `createZapStore` |
| `E_CROP_EMPTY` | Crop coordinates resulted in 0×0 or negative image dimensions | Specify non-zero crop bounds within the original image boundaries |
| `E_MODEL_FAILED` | AI detection model failed to load or initialize | Pipeline automatically falls back to Smart-Subject attention mode |
| `E_RATE_LIMIT` | Request volume exceeded sliding window rate limit threshold | Wait a few moments before submitting additional requests |
| `E_TOO_MANY_FILES` | Batch file count exceeds allowable ceiling (default 20 files) | Drop fewer files, pass `--max-files <n>`, or pass `--unlimited` |
| `E_REQUEST_TOO_LARGE` | Batch total payload size exceeds ceiling (default 100 MB) | Reduce batch size or configure higher `maxBytesPerRequest` |
| `E_SESSION_LIMIT_EXCEEDED` | Cumulative session file limit reached (default 100 files) | Start a new session or run `zap --reset-session` |
| `E_USER_LIMIT_EXCEEDED` | User quota ceiling exceeded for the current billing/usage window | Wait for quota period reset or increase `maxFilesPerUser` |
| `E_CONCURRENCY_LIMIT_EXCEEDED` | Active conversions exceed maximum worker pool concurrency | Wait for active tasks to complete or adjust `concurrency.global` |
| `E_DELETE_NOT_ENABLED` | Original file deletion requested without opt-in consent | Set `"allowDeleteOriginal": true` in `.zapwebp/config.json` or pass `--yes` |
| `E_BACKUP_VERIFICATION_FAILED` | Pre-deletion SHA-256 backup failed to match original source file | Check disk space and write permissions in `.zapwebp/backups/` |
| `E_FORK_DELETE_FORBIDDEN` | GitHub Action detected deletion flags on pull request from a fork | Remove deletion arguments from fork CI workflows for security |
| `E_AUTH` | Storage adapter credentials are invalid, expired, or missing | Verify API keys, service tokens, or environment secrets |
| `E_STORAGE` | Cloud storage provider returned an unhandled read/write error | Verify cloud bucket permissions, CORS rules, and network connectivity |
| `E_SSRF_BLOCKED` | Image URL resolves to private subnet, loopback, or cloud metadata | Provide a public HTTPS image URL |
| `E_UNSAFE_PROTOCOL` | Ingestion URL uses an insecure or prohibited scheme | Only secure `https://` URLs are permitted |
| `E_CLEAN_FAILED` | Metadata handler failed to eliminate targeted metadata chunks | Inspect asset container with `zapwebp-lens inspect` |
| `E_CORRUPT_CONTAINER` | Image container became unreadable after metadata stripping | Verify source asset integrity and plugin version |
| `E_SAME_FORMAT_REJECTED` | Input format matches target lock format and same-format is disallowed | Configure `sameFormat: "passthrough"` or choose another target format |
| `E_FORMAT_REJECTED` | Image format rejected by conversion policy allowlist/denylist | Update accepted formats policy or supply an allowed format |
| `E_PLUGIN_SANDBOX_VIOLATION` | Plugin attempted unauthorized filesystem access or undeclared network calls | Ensure plugin operates on byte buffers; declare permissions in package.json |
| `E_UNSAFE_RUNTIME` | Core conversion executed in an environment with unisolated network bindings | Ensure core runs without importing unauthorized networking libraries |
| `E_LOSSLESS_MISMATCH` | Decoded output pixels differ from transformed input in lossless mode | Ensure target format supports full lossless encoding without matte background |
| `E_VERIFICATION_FAILED` | Output byte verification failed: generated SHA-256 does not match hash | Check expected hash or verify engine version determinism |
| `E_UNSUPPORTED_LOCALE` | Requested locale is not supported in translation catalog | Choose a supported locale (e.g. `en`, `tl`) |
| `E_ABORTED` | Conversion was aborted before completion | Re-run conversion when ready |
| `E_EXTREME_ASPECT_RATIO` | SVG aspect ratio is extreme (< 0.01:1 or > 100:1) | Check SVG viewport dimensions |
| `E_VERSION` | Version mismatch in conversion lockfile | Rebuild lockfile using `zapwebp-lock` |
| `E_FILE_CONFLICT` | Target output file already exists and overwrite was not permitted | Pass `--force` or choose a different output directory |

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

### Remediating batch session limit

```bash
$ npx zapwebp --reset-session
✓ Session counter reset successfully (.zapwebp/session.json)
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
    "E_INPUT_TOO_LARGE": { "exitCode": 1, "status": 413 },
    "E_INPUT_TOO_SMALL": { "exitCode": 1, "status": 400 },
    "E_OUTPUT_TOO_LARGE": { "exitCode": 1, "status": 413 },
    "E_OUTPUT_TOO_SMALL": { "exitCode": 1, "status": 400 },
    "E_OUTPUT_BELOW_RANGE": { "exitCode": 1, "status": 400 },
    "E_TARGET_UNREACHABLE": { "exitCode": 1, "status": 422 },
    "E_UNSUPPORTED_FORMAT": { "exitCode": 1, "status": 400 },
    "E_UNKNOWN_FORMAT": { "exitCode": 1, "status": 400 },
    "E_CORRUPT_HEADER": { "exitCode": 1, "status": 400 },
    "E_CORRUPT_INPUT": { "exitCode": 1, "status": 400 },
    "E_EMPTY_FILE": { "exitCode": 1, "status": 400 },
    "E_ALPHA_NOT_REPRESENTABLE": { "exitCode": 1, "status": 400, "suggestedFix": { "background": "#ffffff" } },
    "E_ALPHA_LOST": { "exitCode": 1, "status": 400 },
    "E_PATH_TRAVERSAL": { "exitCode": 1, "status": 403 },
    "E_READ_PERMISSION": { "exitCode": 1, "status": 403 },
    "E_WRITE_PERMISSION": { "exitCode": 1, "status": 403 },
    "E_WRITE_LOCKED": { "exitCode": 1, "status": 423 },
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
    "E_TOO_MANY_FILES": { "exitCode": 1, "status": 400 },
    "E_REQUEST_TOO_LARGE": { "exitCode": 1, "status": 413 },
    "E_SESSION_LIMIT_EXCEEDED": { "exitCode": 1, "status": 429 },
    "E_USER_LIMIT_EXCEEDED": { "exitCode": 1, "status": 429 },
    "E_CONCURRENCY_LIMIT_EXCEEDED": { "exitCode": 1, "status": 503 },
    "E_DELETE_NOT_ENABLED": { "exitCode": 1, "status": 403 },
    "E_BACKUP_VERIFICATION_FAILED": { "exitCode": 1, "status": 500 },
    "E_FORK_DELETE_FORBIDDEN": { "exitCode": 1, "status": 403 },
    "E_AUTH": { "exitCode": 1, "status": 401 },
    "E_STORAGE": { "exitCode": 1, "status": 502 },
    "E_SSRF_BLOCKED": { "exitCode": 1, "status": 403 },
    "E_UNSAFE_PROTOCOL": { "exitCode": 1, "status": 400 },
    "E_CLEAN_FAILED": { "exitCode": 1, "status": 500 },
    "E_CORRUPT_CONTAINER": { "exitCode": 1, "status": 500 },
    "E_SAME_FORMAT_REJECTED": { "exitCode": 1, "status": 400 },
    "E_FORMAT_REJECTED": { "exitCode": 1, "status": 400 },
    "E_PLUGIN_SANDBOX_VIOLATION": { "exitCode": 1, "status": 403 },
    "E_UNSAFE_RUNTIME": { "exitCode": 1, "status": 500 },
    "E_LOSSLESS_MISMATCH": { "exitCode": 1, "status": 400 },
    "E_VERIFICATION_FAILED": { "exitCode": 1, "status": 500 },
    "E_UNSUPPORTED_LOCALE": { "exitCode": 1, "status": 400 },
    "E_ABORTED": { "exitCode": 1, "status": 499 },
    "E_EXTREME_ASPECT_RATIO": { "exitCode": 1, "status": 400 },
    "E_VERSION": { "exitCode": 1, "status": 409 },
    "E_FILE_CONFLICT": { "exitCode": 1, "status": 409 }
  }
}
```

## Related

- [Safety](/safety): Security rules and restrictions.
- [CLI](/cli): Command line tool options.
- [MCP](/mcp): AI agent error handling and tool recovery.
- [Limits](/limits): Configurable file counts and concurrency ceilings.
