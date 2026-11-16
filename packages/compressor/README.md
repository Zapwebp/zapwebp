# @zapwebp/compressor

Intelligent size reduction plugin for the Zapwebp image optimization engine.

Covers: deterministic binary search quality optimization, adaptive Lanczos3 downscaling, human size parsing, and `CompressionHandler` pipeline contracts.

Does not cover: network I/O, format transcoding, or storage uploads.

Applies to: `@zapwebp/compressor` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/compressor
```

```javascript
import { compressor, compress } from '@zapwebp/compressor';
import { convertImage } from '@zapwebp/core';

// Direct execution
const result = await compress(rawImage, {
  targetBytes: '500kb',
  minQuality: 20,
  maxQuality: 95,
  allowDownscale: true,
});

console.log(result.quality);    // e.g. 78
console.log(result.bytes);      // <= 512,000 bytes
console.log(result.downscaled); // false (or true if downscaling was needed)
```

## What it does

`@zapwebp/compressor` acts as a deterministic policy executor that guarantees an output byte constraint while preserving the highest possible visual fidelity:
- **Deterministic Binary Search**: Pinpoints the highest quality setting meeting your exact byte budget in at most 8 iterations.
- **Adaptive Downscaling**: Automatically rescales dimensions using sharp Lanczos3 when quality reduction alone cannot satisfy the byte target.
- **Human-Readable Targets**: Accepts byte numbers (e.g. `500000`) or string notations (`"500kb"`, `"1.5mb"`, `"250b"`).
- **Target Lock Policy Executor**: Acts as the official `CompressionHandler` for `@zapwebp/core` and `@zapwebp/storage`.
- **Diagnostic Transparency**: Returns detailed execution metrics (`quality`, `width`, `height`, `downscaleCount`, `iterations`, `bestAttempt`).
- **Zero Mocks**: 100% production code running on Node.js and sharp (libvips).

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_COMPRESSION_FAILED` | Target byte budget cannot be satisfied within quality and dimension bounds | Raise `targetBytes`, lower `minQuality`, or enable `allowDownscale: true` |
| `E_INVALID_TARGET_BYTES` | `targetBytes` is missing, negative, or formatted invalidly | Provide a positive integer or human string like `"500kb"` or `"1.5mb"` |
| `E_INVALID_QUALITY_RANGE` | `minQuality` is greater than `maxQuality` or outside 1–100 | Ensure `1 <= minQuality <= maxQuality <= 100` |

## For agents

```json
{
  "tool": "@zapwebp/compressor",
  "functions": ["compress", "compressor"],
  "options": {
    "targetBytes": { "type": "number|string", "required": true, "examples": [500000, "500kb", "1.5mb"] },
    "minQuality": { "type": "number", "default": 20 },
    "maxQuality": { "type": "number", "default": 95 },
    "allowDownscale": { "type": "boolean", "default": false },
    "maxDownscalePasses": { "type": "number", "default": 3 }
  }
}
```

## Related

- [Compressor Guide](https://zapwebp-docs.vercel.app/plugins/compressor): Complete compression algorithm and parameters.
- [Target Lock Policy](https://zapwebp-docs.vercel.app/lock-target): Universal output constraints.
- [Storage Plugin](https://zapwebp-docs.vercel.app/plugins/storage): Pre-upload cloud storage integration with compressor.
