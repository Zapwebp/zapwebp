# Conversion Policy (Quality, Limits & Formats)

Covers: Unified conversion policies, lossy and lossless modes, per-format quality overrides, input and output byte limits, magic-byte format filtering, iterative step-down compression, and developer governance.

Does not cover: manual byte editing or insecure memory-unbounded decoding.

Applies to: Zapwebp v2.0.0 and later.

## Quick start

Define your organization's image policy in `.zapwebp.config.json`:

```json
{
  "policy": {
    "quality": {
      "mode": "lossy",
      "default": 85,
      "perFormat": {
        "svg": 100,
        "png": 90,
        "jpeg": 75,
        "webp": 85,
        "avif": 55
      }
    },
    "limits": {
      "maxInputBytes": 10485760,
      "maxOutputBytes": 512000
    },
    "formats": {
      "accept": ["svg", "png", "jpeg", "webp"],
      "reject": ["gif", "tiff"]
    }
  }
}
```

Or enforce policy parameters on the command line:

```bash
npx zapwebp ./photos/* --to webp --max-input 10485760 --max-output 512000 --accept svg,png,jpeg
```

## What it does

Zapwebp does not guess what "quality" means for your product. It provides a single **Conversion Policy** contract that governs quality, size boundaries, and accepted formats across every surface (CLI, Storage Adapters, API, MCP, and Build Plugins).

### 1. Quality & Format Modes

- **Lossless Mode (`mode: 'lossless'`):** Forces pixel-perfect lossless compression on WebP, PNG, and AVIF.
- **Lossy Mode (`mode: 'lossy'`):** Applies explicit quality values (1-100) using format-specific defaults or `perFormat` overrides.
- **Auto Mode (`mode: 'auto'`):** Intelligently routes vector and line art (SVG/PNG) to lossless and photos (JPEG) to lossy encoding.

### 2. Guardrails & Limits

- **`maxInputBytes`:** Checked immediately against buffer byte length *before* libvips or Resvg decode into memory, preventing memory allocation denial-of-service.
- **`maxOutputBytes`:** Compresses output iteratively: if the output exceeds the byte ceiling, Zapwebp steps quality down by 5 points until it fits or throws `E_OUTPUT_TOO_LARGE`.
- **Magic-Byte Format Verification:** Formats are verified against magic byte signatures (`detectFormat`), completely ignoring spoofed file extensions.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_INPUT_TOO_LARGE` | Input file byte size exceeds `maxInputBytes` before decoding | Reduce image resolution or increase `policy.limits.maxInputBytes` |
| `E_OUTPUT_TOO_LARGE` | Encoded output exceeds `maxOutputBytes` even at minimum quality (10) | Reduce dimensions with `--width`, switch to AVIF, or raise `maxOutputBytes` |
| `E_FORMAT_REJECTED` | Input format is disallowed by `policy.formats.reject` or not in `accept` allowlist | Provide a permitted format or adjust policy configuration |

## For agents

```json
{
  "capability": "conversion-policy",
  "schema": {
    "quality": {
      "mode": "lossy | lossless | auto",
      "default": "number (1-100)",
      "perFormat": "Record<string, number>"
    },
    "limits": {
      "maxInputBytes": "number (bytes)",
      "maxOutputBytes": "number (bytes)",
      "targetOutputBytes": "number (bytes, optional)"
    },
    "formats": {
      "accept": "string[]",
      "reject": "string[]"
    },
    "advanced": {
      "effort": "number (0-9)",
      "stripMetadata": "boolean",
      "preserveColorProfile": "boolean"
    }
  },
  "errorCodes": [
    "E_INPUT_TOO_LARGE",
    "E_OUTPUT_TOO_LARGE",
    "E_FORMAT_REJECTED"
  ]
}
```

## Related

- [Overview](/docs): Overview of Zapwebp image conversion.
- [Target Lock](/lock-target): Universal many-to-one conversion gateway.
- [Backgrounds](/backgrounds): Three deterministic background states.
- [CLI](/cli): Command line execution and policy flags.
- [Errors](/errors): Machine-readable error catalog with root cause explanations.

