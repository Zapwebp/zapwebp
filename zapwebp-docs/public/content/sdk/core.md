# @zapwebp/core SDK Reference

Covers: The core WASM and native image conversion engine. Alpha preservation, format support, safety checks, and metadata stripping.
Does not cover: CLI binaries, HTTP server routing, or third-party bundler plugins.
Applies to: `@zapwebp/core` v1.0.0+.

## Quick start

```typescript
import { convertImage } from '@zapwebp/core';

const output = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  lossless: false,
  clean: true,
});
```

## What it does

`@zapwebp/core` is the deterministic foundation powering all Zapwebp distributions. It takes raw image byte buffers (SVG, PNG, WebP, AVIF, JPEG, GIF, TIFF), guarantees transparent alpha retention without unintended black backgrounds, verifies pixel integrity, and strips privacy-invasive metadata before emitting encoded outputs.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `to` | `string` | `'webp'` | Target format (`webp`, `png`, `avif`, `jpeg`) |
| `width` | `number` | `null` | Output width in pixels (aspect ratio maintained) |
| `quality` | `number` | `85` | Lossy quality parameter (1–100) |
| `lossless` | `boolean` | `false` | Lossless encoding mode where supported |
| `clean` | `boolean` | `true` | Strip EXIF, XMP, IPTC, and C2PA metadata |
| `background` | `string` | `undefined` | Explicit background color for flattening (required for JPEG) |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains scripts, event handlers, or foreignObject | Remove active content or sanitize before conversion |
| `E_TOO_LARGE` | Input buffer exceeds configured byte threshold | Compress input or adjust max bytes limit |
| `E_ALPHA_NOT_REPRESENTABLE` | Alpha channel converted to JPEG without background | Provide an explicit background color (e.g. `#ffffff`) |
| `E_UNSUPPORTED_FORMAT` | Input buffer not recognized as supported image | Verify input format against supported format registry |

## For agents

```json
{
  "tool": "@zapwebp/core",
  "function": "convertImage",
  "input": "Buffer | Uint8Array",
  "output": "Promise<{ data: Buffer, width: number, height: number, alphaPreserved: boolean }>",
  "options": {
    "to": { "type": "string", "enum": ["webp", "png", "avif", "jpeg"], "default": "webp" },
    "width": { "type": "number", "minimum": 1, "maximum": 16384 },
    "quality": { "type": "number", "minimum": 1, "maximum": 100, "default": 85 },
    "lossless": { "type": "boolean", "default": false },
    "clean": { "type": "boolean", "default": true },
    "background": { "type": "string", "pattern": "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" }
  }
}
```

## Related

- [Plugin SDK](/sdk/plugin): Build bundler plugins and framework integrations.
- [Formats](/formats): Specification of all supported formats and codecs.
