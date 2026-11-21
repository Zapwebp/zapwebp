# @zapwebp/lock

Idempotent conversion lock plugin for Zapwebp with cryptographic fingerprinting, zero generational loss, and pipeline skip logic.

## Overview

In automated pipelines, a single image can be touched multiple times — by a build tool, a watcher, a CI job, a storage adapter, and an AI agent. Each touch re-encodes the file, wasting CPU and degrading quality through generational loss. `@zapwebp/lock` embeds a cryptographic lock into the output so Zapwebp recognizes its own work and refuses to re-convert.

Convert once, never again — unless explicitly forced.

## Installation

```bash
npm install @zapwebp/lock
```

## Quick Start

```javascript
import { convertImage } from '@zapwebp/core';
import { createLockPlugin, verifyLock } from '@zapwebp/lock';

// 1. Verify before converting
const verification = verifyLock(existingOutputBuffer, inputBuffer, {
  to: 'webp',
  quality: 85,
});

if (verification.match) {
  console.log('Skipping conversion: file is already converted with matching parameters.');
} else {
  // 2. Convert and lock
  const result = await convertImage(inputBuffer, {
    to: 'webp',
    quality: 85,
    useLock: true,
  });
}
```

## How It Works

1. **Deterministic Options Hash**: Computes SHA-256 over canonicalized conversion parameters (`to`, `quality`, `lossless`, `clean`, `width`, `height`, etc.).
2. **Cryptographic Fingerprint**: Stores `inputSha256`, `optionsSha256`, and `engineVersion` in non-destructive container chunks (`ZAPL` for WebP, `tEXt` for PNG, `COM` for JPEG, `<metadata>` for SVG).
3. **Clean Mode Preservation**: The lock is recognized as engine metadata and strictly preserved during metadata cleaning.
4. **Skip Logic**: If the existing output matches input, options, and engine version, re-conversion is skipped.

## License

MIT © Zapwebp
