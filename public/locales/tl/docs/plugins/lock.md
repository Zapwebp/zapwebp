# Plugin para sa Lock

Covers: ang `@zapwebp/lock` idempotent conversion lock plugin, cryptographic fingerprinting (SHA-256), sinasadyang pagbabago ng format, pamamahala ng multi-format derivatives, `shouldSkipConversion`, pagpigil sa paulit-ulit na pag-encode sa pipelines, zero generational loss, container chunk injection (WebP `ZAPL`, PNG `tEXt`, JPEG `COM`, SVG `<metadata>`), pagpapanatili sa Clean Mode, CLI flags (`--force`, `--no-lock`, `--lock-status`), MCP tool arguments (`useLock`, `force`), at deduplication sa storage adapters.

Does not cover: pagpapatupad ng limitasyon sa format o pag-compress batay sa laki. Tingnan ang [Target Lock](/lock-target) o [Compressor Plugin](/plugins/compressor).

Applies to: `@zapwebp/lock` at `@zapwebp/core` v1.0.0 at mas bago.

## Quick start

```bash
npm install @zapwebp/lock
```

```javascript
import {
  writeLock,
  readLock,
  verifyLock,
  shouldSkipConversion,
  createLockFingerprint,
  createLockPlugin,
} from '@zapwebp/lock';
import { convertImage } from '@zapwebp/core';

// 1. Suriin ang sinasadyang pagpapalit ng format laban sa paulit-ulit na kahilingan
const existingLock = readLock(existingOutputBuffer);
const decision = shouldSkipConversion(existingLock, { to: 'avif' }, inputHash);
if (!decision.skip && decision.reason === 'new_target_format_requested') {
  console.log('Sinasadyang pagbabago ng format: gumagawa ng bagong derivative');
} else if (decision.skip) {
  console.log('Magkaparehong kahilingan: nilaktawan ang redundant na conversion');
}

// 2. Suriin ang umiiral na output buffer gamit ang verifyLock
const verification = verifyLock(existingOutputBuffer, inputBuffer, { to: 'webp', quality: 85 });
if (verification.match) {
  console.log('Nilaktawan ang conversion: naka-lock na ang file na may parehong mga opsyon');
}

// 3. I-embed ang conversion lock sa na-convert na buffer
const fingerprint = createLockFingerprint({
  input: inputBuffer,
  options: { to: 'webp', quality: 85, clean: true },
});
const lockedOutput = writeLock(convertedBuffer, 'webp', fingerprint);

// 4. Suriin ang umiiral na lock
const lock = readLock(lockedOutput);
console.log(lock.targetFormat);  // 'webp'
console.log(lock.engineVersion); // '2.26.0'
console.log(lock.inputSha256);
```

Paggamit gamit ang CLI:

```bash
# Unang conversion
zap images/logo.svg --to webp
# ✓ logo.svg → logo.webp (2.1 KB)

# Magkaparehong conversion muli (nilaktawan)
zap images/logo.svg --to webp
# ⏭ logo.webp already converted with matching options. Skipped. Use --force to re-convert.

# Sinasadyang pagbabago ng format (nagko-convert: bagong derivative)
zap images/logo.svg --to avif
# ✓ logo.svg → logo.avif (1.4 KB) · New derivative created

# Suriin ang lock metadata sa isang file
zap output.webp --lock-status

# Pilitin ang conversion kahit naka-lock na
zap images/ --to webp --force

# Huwag magsulat ng lock
zap images/ --to webp --no-lock
```

## What it does

- **Intent-Aware Format Changes & Multi-Format Derivatives**: Pinipigilan ng lock mechanism ang hindi sinasadyang paulit-ulit na conversion (tulad ng WebP → WebP na may parehong mga opsyon), ngunit tahasang pinapahintulutan ang mga sinasadyang pagbabago (tulad ng WebP → AVIF o WebP → PNG) dahil gumagawa ang developer ng intensyonal na bagong derivative. Bawat output format ay may sariling hiwalay na lock (`targetFormat: 'webp'`, `targetFormat: 'avif'`), na umiiwas sa aksidenteng pag-overwrite at sumusuporta sa multi-format image suites.
- **Inaalis ang Generational Loss**: Sa mga automated pipeline, ang isang imahe ay maaaring ma-convert nang maraming beses. Ang Lock plugin ay nagsisiguro na ang imahe ay kino-convert nang isang beses lamang.
- **Cryptographic Fingerprint**: Naglalagay ng pamantayang `zapwebp:lock` block na naglalaman ng `version`, `inputSha256`, `optionsSha256`, `engineVersion`, `targetFormat`, `convertedAt`, at `optionsSummary`.
- **Zero-Visual Overhead Containers**: Inilalagay ang fingerprint sa non-visual metadata segments (`ZAPL` RIFF chunk sa WebP, `zapwebp:lock` `tEXt` sa PNG, `COM` marker sa JPEG, at `<metadata id="zapwebp-lock">` sa SVG).
- **Ligtas sa Clean Mode**: Pinananatili ang lock habang nililinis ang ibang metadata para sa privacy.
- **Deterministic Options Hashing**: Tinitiyak ang magkatulad na hash sa lahat ng operating system at runtime.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `input` | `Buffer \| Uint8Array` | *kailangan* | Source image bytes para sa pagkalkula ng `inputSha256`. |
| `options` | `object` | `{}` | Target conversion options para sa `optionsSha256` at `targetFormat`. |
| `force` | `boolean` | `false` | Nilalampasan ang lock verification at pinipilit ang bagong conversion. |
| `useLock` | `boolean` | `true` | Pinapagana ang awtomatikong lock check at pagsusulat. |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_INVALID_LOCK` | Ang lock block sa container ay naglalaman ng sira o maling JSON. | Mag-convert muli gamit ang `--force` upang magawa ang bagong lock. |
| `E_CORRUPT_HEADER` | Hindi mabasa ang mga chunk ng container upang suriin ang lock. | Tiyaking maayos at hindi sira ang image file. |

## Related

- [Target Lock](/lock-target) — Mga patakaran sa format at strict mode.
- [Compressor Plugin](/plugins/compressor) — Pag-optimize sa laki at downscaling.
- [CLI Reference](/cli) — Command-line flags at batch options.

## For agents

```json
{
  "pkg": "@zapwebp/lock",
  "version": "1.0.0",
  "contract": "verifyLock(existingOutput: Buffer, input: Buffer, options: object, opts?: { force?: boolean }): LockVerificationResult",
  "skipLogic": "shouldSkipConversion(existingLock: LockMetadata, currentOptions: object, currentInputSha256?: string, lockOptions?: object): { skip: boolean, reason: string }",
  "import": "import { writeLock, readLock, verifyLock, shouldSkipConversion, createLockFingerprint, createLockPlugin } from '@zapwebp/lock';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/shared": ">=1.0.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/lock",
  "docs": "https://zapwebp-docs.vercel.app/plugins/lock"
}
```
