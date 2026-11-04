# Clean

Covers: Clean Mode, zero-tracking image sanitization, C2PA manifest stripping, EXIF/XMP/IPTC purging, zero-metadata chunk verification, and tamper-evident Clean Certificates.

Does not cover: vector geometry sanitization or active SVG script defenses. See [Safety](/safety).

Applies to: `zap` and `zapwebp` v1.1.0 and later.

## Quick start

```bash
npx zapwebp photo.png --clean --verify-clean
```

Converts `photo.png` to WebP through an in-memory raw RGBA pixel pipeline, completely stripping C2PA manifests, camera tags, and AI provenance, and verifies the output has zero metadata chunks.

## What it does

When AI background removers, upscalers, or generative engines output an image, they routinely embed digital provenance signatures:

- **C2PA / Content Credentials**: JUMBF manifests declaring model provenance, parent hashes, and generative tools.
- **EXIF Tags**: `Software`, `ProcessingSoftware`, and camera serial records.
- **XMP Sidecars**: Embedded XML blocks containing prompts, model checkpoints, and workflow identifiers.
- **PNG Text Chunks**: `tEXt`, `zTXt`, and `iTXt` metadata blocks.
- **JPEG Markers**: APP1, APP11 (JUMBF), APP13 (Photoshop IPTC), and COM comment markers.

Zap's Clean Mode solves this at the architectural level. Rather than attempting to patch or scrub container fields in place, Zap decodes the asset down to **uncompressed raw RGBA pixel bytes in memory** (`Uint8ClampedArray`), discarding all container headers and metadata blocks. It then re-encodes pure pixel data into the target container (`sharp`/libvips) without carrying over a single non-critical chunk.

Clean Mode is enabled by default across all Zap interfaces (`zap`, `zapwebp`, `@zapwebp/sdk`, and `@zapwebp/mcp`).

## Options

| Flag | Type | Default | What it does |
|---|---|---|---|
| `--clean` | `boolean` | `true` | Decodes to raw RGBA and strips all AI provenance, EXIF, XMP, C2PA, and comments |
| `--no-clean` | `boolean` | `false` | Preserves non-critical container metadata if supported by destination format |
| `--verify-clean` | `boolean` | `false` | Audits the final output buffer, guarantees zero metadata chunks, and signs a Clean Certificate |
| `--assert-alpha` | `boolean` | `false` | Enforces that transparent input images strictly retain alpha in the converted output |
| `--report` | `boolean` | `false` | Emits structured JSON diagnostics including removed metadata and tamper-evident certificate |

## Examples

### Sanitize and convert an AI-generated image

```bash
$ zap avatar.png --to webp --clean --verify-clean
✓ avatar.png → avatar.webp (42180 bytes; clean verified, 0 metadata chunks)
```

### Inspect container metadata without converting

```bash
$ zap inspect avatar.png
File: avatar.png
Format: PNG
Dimensions: 1024 × 1024
Transparency: yes
Size: 182490 bytes
Container Metadata: PNG tEXt, C2PA manifest
```

### Generate Clean Certificate via Node SDK

```javascript
import { Zap } from '@zapwebp/sdk';
import fs from 'node:fs';

const input = fs.readFileSync('generated.png');
const result = await Zap.convert(input, {
  to: 'webp',
  clean: true,
  verify: true,
});

console.log(result.certificate);
// {
//   sha256: "3b08e2f07a4a9844...",
//   chunks: ["VP8X", "ALPH", "VP8 "],
//   metadataChunks: 0,
//   verified: true,
//   verifiedAt: "2026-11-01T23:25:00.000Z",
//   tool: "zap@1.1.0"
// }
```

## Clean Certificate Specification

When `--verify-clean` is supplied, Zap audits the binary container before writing to disk. The verification output conforms to this schema:

| Property | Type | Description |
|---|---|---|
| `sha256` | `string` | Cryptographic SHA-256 digest of the sanitized output file |
| `chunks` | `string[]` | Ordered array of container chunk identifiers detected in the output |
| `metadataChunks` | `number` | Count of non-critical metadata chunks present (must be `0` for verified clean status) |
| `verified` | `boolean` | `true` if zero tracking, EXIF, XMP, or C2PA chunks were detected |
| `verifiedAt` | `string` | ISO 8601 timestamp of audit execution |
| `tool` | `string` | Generator identifier and version stamp (`zap@1.1.0`) |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `clean_verification_failed` | Non-critical metadata chunks persisted in the generated file | Ensure `--clean` is not overridden by `--no-clean` |
| `alpha_assertion_failed` | Input image contained transparent pixels but output collapsed alpha | Choose an alpha-capable target format (WebP, PNG, AVIF) or remove `--assert-alpha` |
| `corrupt_metadata` | Input file container chunks are malformed or truncated | Re-encode through `Zap.convert` with `clean: true` |

## For agents

```json
{
  "tool": "zap-clean",
  "command": "zap <input> --to webp --clean --verify-clean",
  "defaults": {
    "clean": true,
    "verifyClean": false,
    "pipeline": "decodeToRgba -> RGBA -> encode",
    "strippedSignatures": [
      "c2pa",
      "jumbf",
      "exif",
      "xmp",
      "photoshop_iptc",
      "png_text_chunks",
      "jpeg_com"
    ]
  }
}
```

## Related

- [Safety](/safety): Security boundaries, XXE protection, and resource limits.
- [Formats](/formats): Supported input and output specifications.
- [CLI](/cli): Terminal usage guide and commands.
