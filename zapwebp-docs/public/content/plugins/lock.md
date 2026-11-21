# Lock Plugin

Covers: the `@zapwebp/lock` idempotent conversion lock plugin, cryptographic fingerprinting (SHA-256), pipeline re-encoding prevention, zero generational loss, container chunk injection (WebP `ZAPL`, PNG `tEXt`, JPEG `COM`, SVG `<metadata>`), Clean Mode preservation, CLI flags (`--force`, `--no-lock`, `--lock-status`), MCP tool arguments (`useLock`, `force`), and storage adapter deduplication.

Does not cover: target format constraint enforcement or byte-budget compression. See [Target Lock](/lock-target) or [Compressor Plugin](/plugins/compressor).

Applies to: `@zapwebp/lock` and `@zapwebp/core` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/lock
```

```javascript
import {
  writeLock,
  readLock,
  verifyLock,
  createLockFingerprint,
  createLockPlugin,
} from '@zapwebp/lock';
import { convertImage } from '@zapwebp/core';

// 1. Check if output already exists with matching options
const verification = verifyLock(existingOutputBuffer, inputBuffer, options);
if (verification.match) {
  console.log('Skipping conversion: file is already locked with identical options');
}

// 2. Embed conversion lock into converted buffer
const fingerprint = createLockFingerprint({
  input: inputBuffer,
  options: { to: 'webp', quality: 85, clean: true },
});
const lockedOutput = writeLock(convertedBuffer, 'webp', fingerprint);

// 3. Inspect an existing lock
const lock = readLock(lockedOutput);
console.log(lock.engineVersion); // '2.26.0'
console.log(lock.inputSha256);   // 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
```

Using the CLI:

```bash
# Convert with automatic lock injection (default)
zap images/ --to webp

# Inspect lock metadata on a file
zap output.webp --lock-status

# Force re-conversion even if locked
zap images/ --to webp --force

# Disable lock writing
zap images/ --to webp --no-lock
```

## What it does

- **Eliminates Generational Loss**: In complex build pipelines (CI, watchers, build tools, storage adapters, and AI agents), a single image can be touched multiple times. Re-encoding degrades lossy images and inflates lossless files. The Lock plugin ensures each image is converted exactly once.
- **Cryptographic Fingerprint**: Injects a standardized `zapwebp:lock` block containing `version`, `inputSha256`, `optionsSha256`, `engineVersion`, `convertedAt`, and canonical `optionsSummary`.
- **Zero-Visual Overhead Containers**: Embeds fingerprints into dedicated non-visual metadata segments (`ZAPL` RIFF chunk in WebP, `zapwebp:lock` `tEXt` keyword in PNG, `COM` comment marker in JPEG, and `<metadata id="zapwebp-lock">` in SVG).
- **Clean Mode Immunity**: Preserves the lock chunk during Clean Mode metadata stripping, allowing files to remain privacy-safe while retaining idempotency protection.
- **Deterministic Options Hashing**: Canonicalizes and sorts all options recursively with alphanumeric key ordering, guaranteeing identical hashes across diverse runtime environments and platforms.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `input` | `Buffer \| Uint8Array` | *required* | Source image bytes used to compute `inputSha256`. |
| `options` | `object` | `{}` | Target conversion options used to compute `optionsSha256`. |
| `force` | `boolean` | `false` | Bypasses lock verification and forces re-conversion. |
| `useLock` | `boolean` | `true` | Enables automatic lock verification and embedding. |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_INVALID_LOCK` | The lock block in the container contains malformed or corrupt JSON. | Re-convert the file with `--force` to recreate a valid cryptographic lock. |
| `E_CORRUPT_HEADER` | Container chunks cannot be parsed to verify or inject the lock. | Verify input buffer integrity and ensure valid image magic bytes. |

## Related

- [Target Lock](/lock-target) — Many-to-one ingestion policy and format contracts.
- [Compressor Plugin](/plugins/compressor) — Target byte optimization and adaptive downscaling.
- [CLI Reference](/cli) — Command-line flags, multipliers, and undo journals.

## For agents

```json
{
  "pkg": "@zapwebp/lock",
  "version": "1.0.0",
  "contract": "verifyLock(existingOutput: Buffer, input: Buffer, options: object, opts?: { force?: boolean }): LockVerificationResult",
  "import": "import { writeLock, readLock, verifyLock, createLockFingerprint, createLockPlugin } from '@zapwebp/lock';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/shared": ">=1.0.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/lock",
  "docs": "https://zapwebp-docs.vercel.app/plugins/lock"
}
```
