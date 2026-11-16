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

## Features

- **Deterministic Binary Search**: Pinpoints the highest quality setting meeting your exact byte budget in at most 8 iterations.
- **Adaptive Downscaling**: Automatically rescales dimensions using sharp Lanczos3 when quality reduction alone cannot satisfy the byte target.
- **Human-Readable Targets**: Accepts byte numbers (e.g. `500000`) or string notations (`"500kb"`, `"1.5mb"`, `"250b"`).
- **Target Lock Policy Executor**: Acts as the official `CompressionHandler` for `@zapwebp/core` and `@zapwebp/storage`.
- **Diagnostic Transparency**: Returns detailed execution metrics (`quality`, `width`, `height`, `downscaleCount`, `iterations`, `bestAttempt`).
- **Zero Mocks**: 100% production code running on Node.js and sharp (libvips).
