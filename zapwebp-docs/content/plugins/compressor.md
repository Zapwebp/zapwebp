# Compressor Plugin

Covers: the `@zapwebp/compressor` plugin, deterministic binary search quality optimization, adaptive Lanczos3 downscaling, human size parsing, target lock integration, CLI flags (`--target`, `--min-quality`, `--no-downscale`), and `CompressionHandler` pipeline contracts.

Does not cover: network upload protocols or client-side UI components. See [Storage Adapters](/plugins/storage) or [Universal UI Kit](/ui).

Applies to: `@zapwebp/compressor` and `@zapwebp/core` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/compressor
```

```javascript
import { compressor, compress, parseTargetBytes } from '@zapwebp/compressor';
import { convertImage } from '@zapwebp/core';

// 1. Direct compression execution on a RawImage
const result = await compress(rawImage, {
  targetBytes: '500kb',
  minQuality: 20,
  maxQuality: 95,
  allowDownscale: true,
  downscaleStep: 0.9,
  maxDownscaleAttempts: 3,
});

console.log(result.quality);    // 78
console.log(result.bytes);      // 493520 (under 512,000 bytes)
console.log(result.downscaled); // false (or true if resized)
console.log(result.iterations); // 4

// 2. Integration with convertImage
const converted = await convertImage(inputBuffer, {
  to: 'webp',
  targetBytes: '350kb',
  compressor,
});
```

Using the CLI:

```bash
zap images/ --target 500kb --to webp
zap hero.png --target 1mb --min-quality 30 --no-downscale
```

## What it does

- **Outcome Enforcement**: While Target Locking enforces constraints and boundaries, the Compressor actively guarantees target byte outcomes by navigating quality and dimensional trade-offs.
- **Deterministic Binary Search**: Employs an exact binary search over quality settings (`minQuality` to `maxQuality`) capped at 8 iterations per downscale pass, eliminating trial-and-error guesswork.
- **Adaptive Lanczos3 Downscaling**: If quality optimization alone cannot reach the byte limit, an outer downscaling loop smoothly rescales image dimensions by a configurable step (default 0.9) up to 3 times using sharp Lanczos3 resampling.
- **Structured Error Diagnostics**: When a target byte budget is mathematically unreachable, throws `E_TARGET_UNREACHABLE` containing `actualBytes`, `targetBytes`, `suggestedFix`, and telemetry for the best attempt.
- **Flexible Non-Throwing Mode**: When `throwOnUnreachable: false` is configured, returns diagnostic execution payloads with `achieved: false` and the closest valid attempt.
- **Target Lock Policy Executor**: Acts as the official `CompressionHandler` for `@zapwebp/core` and `@zapwebp/storage`.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `targetBytes` | `number \| string` | *required* | Maximum allowed output size (e.g. `500000`, `"500kb"`, `"1.5mb"`). |
| `minQuality` | `number` | `10` | Minimum quality threshold before downscaling is attempted (1-100). |
| `maxQuality` | `number` | `95` | Upper quality bound for initial binary search (1-100). |
| `allowDownscale` | `boolean` | `true` | Allows Lanczos3 resizing if quality floor cannot meet byte limit. |
| `downscaleStep` | `number` | `0.9` | Dimensional reduction factor per downscale iteration (0.1 to 0.99). |
| `maxDownscaleAttempts` | `number` | `3` | Maximum downscaling attempts before declaring failure (0-10). |
| `maxIterations` | `number` | `8` | Maximum binary search iterations per dimensional step. |
| `format` | `string` | `'webp'` | Target image format (`'webp'`, `'avif'`, `'jpeg'`, `'png'`). |
| `throwOnUnreachable` | `boolean` | `true` | Throws `E_TARGET_UNREACHABLE` when target cannot be met. |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TARGET_UNREACHABLE` | Image cannot fit under configured target bytes even after quality search and downscaling. | Increase `targetBytes`, enable `allowDownscale`, or lower `minQuality`. |
| `E_OUTPUT_TOO_LARGE` | Output size exceeds configured maximum limits in strict mode. | Switch to `compress` or `flexible` size mode, or increase allowed limit. |

## Related

- [Target Lock](/lock-target) — Multi-format policy enforcement and strict mode rules.
- [Storage Adapters](/plugins/storage) — Automated pre-upload compression for Supabase, Firebase, and Neocities.
- [CLI Reference](/cli) — Command-line flags and batch optimization options.

## For agents

```json
{
  "pkg": "@zapwebp/compressor",
  "version": "1.0.0",
  "contract": "compress(image: RawImage, options: CompressOptions): Promise<CompressionResult>",
  "import": "import { compressor, compress, binarySearchQuality, parseTargetBytes, defineCompressor } from '@zapwebp/compressor';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/plugin-sdk": ">=1.1.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/compressor",
  "docs": "https://zapwebp-docs.vercel.app/plugins/compressor"
}
```
