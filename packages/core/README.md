<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-core.svg" width="120" height="120" alt="@zapwebp/core logo" />
</p>

# @zapwebp/core

The shared image conversion, format detection, SVG validation, and metadata cleaning engine behind the entire Zap ecosystem. Provides format-aware, memory-safe conversion across SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF with strict alpha preservation and zero telemetry.

Covers: Image conversion across SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF, alpha preservation, format autodetection, SVG sanitization, clean mode metadata stripping, and retina multiplier calculations.

Does not cover: CLI terminal arguments, MCP network transport, UI widgets, or cloud storage providers.

Applies to: `@zapwebp/core` v1.0.0 and later, Node.js >=22.0.0.

Documentation: [https://zapwebp.vercel.app/formats](https://zapwebp.vercel.app/formats)

## Quick start

```bash
pnpm add @zapwebp/core
```

```javascript
const { convertImage } = require('@zapwebp/core');

// Convert SVG or raster image to WebP with target width
const webpBuffer = await convertImage(inputBuffer, {
  to: 'webp',
  width: 512,
  quality: 85,
});
```

## What it does

`@zapwebp/core` is the foundational conversion and validation engine for Zapwebp:
- **Format Autodetection:** Sniffs image headers from raw magic bytes and XML patterns, never relying on file extensions alone.
- **Rust-Powered SVG Engine:** Rasterizes SVG vectors via `@resvg/resvg-js` over transparent canvases with subpixel accuracy.
- **Libvips Raster Pipeline:** High-throughput streaming image transform pipeline powered by `sharp`.
- **Alpha Guarantees:** Transparency is preserved across WebP, PNG, and AVIF. Converting transparent inputs to JPEG without an explicit background color throws a structured `E_ALPHA_NOT_REPRESENTABLE` error.
- **Clean Mode & AI Provenance:** Detects AI-generated metadata (C2PA Content Credentials, Midjourney, Adobe Firefly, Stable Diffusion) and generates cryptographically signed Clean Certificates.
- **Multiplier Tooling:** Utility functions for parsing scale arrays (`@1x`, `@2x`, `@3x`), generating filename suffixes, and building ready-to-paste `<img srcset>` HTML snippets.
- **Security Sandboxing:** Rejects SVGs containing active scripts (`<script>`, inline handlers), external entity expansions (XXE), or remote network references (`E_UNSAFE_SVG`).

---

## API Reference

### 1. `convertImage(input, options)`
Converts any supported image format to WebP, PNG, JPEG, or AVIF.

```typescript
function convertImage(
  input: Buffer | Uint8Array | string,
  options?: ConvertOptions
): Promise<Buffer>
```

#### Options (`ConvertOptions`)
| Property | Type | Default | Description |
|---|---|---|---|
| `to` | `'webp' \| 'png' \| 'jpeg' \| 'avif'` | `'webp'` | Target output format |
| `from` | string | autodetected | Source format override |
| `width` | number | source | Constrain maximum width (1–4096) |
| `height` | number | source | Constrain maximum height (1–4096) |
| `fit` | `'contain' \| 'cover' \| 'fill' \| 'inside' \| 'outside'` | `'contain'` | Resize strategy |
| `quality` | number | `85` | Compression quality rating (1–100) |
| `lossless` | boolean | `false` | Lossless encoding where supported |
| `background` | string | `null` | Hex color (e.g. `'#ffffff'`). Required when alpha input is converted to JPEG. |
| `stripMetadata` | boolean | `true` | Strip EXIF, XMP, and ICC profiles |

---

### 2. `inspectImage(input)`
Analyzes image dimensions, format, alpha transparency, and embedded metadata.

```typescript
function inspectImage(input: Buffer | Uint8Array | string): Promise<{
  format: string;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  bytes: number;
  metadata: {
    hasMetadata: boolean;
    exif: boolean;
    xmp: boolean;
    c2pa: boolean;
    comments: boolean;
    chunks: string[];
    summary: string[];
  };
}>
```

---

### 3. `detectFormat(input)`
Detects image format from magic bytes and XML markers. Throws if unrecognized or unsupported.

```javascript
const { detectFormat } = require('@zapwebp/core');

const format = detectFormat(buffer); // 'svg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'tiff'
```

---

### 4. Raw Pixel Pipeline: `decodeToRgba` & `encodeFromRgba`
Provides direct access to raw RGBA pixel buffers for custom transforms.

```javascript
const { decodeToRgba, encodeFromRgba } = require('@zapwebp/core');

// Decode image to raw 8-bit RGBA buffer
const raw = await decodeToRgba(inputBuffer);

// Encode raw RGBA back to modern format
const outputBuffer = await encodeFromRgba(raw, {
  to: 'webp',
  quality: 85,
});
```

---

### 5. Multipliers & Responsive Helpers

#### `parseScales(scales)`
Parses and validates multiplier scale numbers:
```javascript
const { parseScales } = require('@zapwebp/core');
parseScales([1, 2, 3]); // => [1, 2, 3]
```

#### `outputName(inputPath, format, scale)`
Constructs output filename following standard scale conventions:
```javascript
const { outputName } = require('@zapwebp/core');
outputName('logo.svg', 'webp', 2); // => 'logo@2x.webp'
```

#### `generateSrcset(baseFile, scales, format, alt)`
Generates responsive `<img srcset>` HTML markup:
```javascript
const { generateSrcset } = require('@zapwebp/core');
const html = generateSrcset('hero.png', [1, 2, 3], 'webp', 'Hero Banner');
```

---

### 6. Clean Mode & Certificate Issuance

#### `detectMetadata(input)`
Inspects file for EXIF, XMP, C2PA, and software attribution markers.

#### `generateCleanCertificate(input, output)`
Verifies metadata removal and generates a cryptographically verifiable Clean Certificate:
```javascript
const { generateCleanCertificate } = require('@zapwebp/core');

const cert = await generateCleanCertificate(sourceBuffer, cleanOutputBuffer);
console.log(cert.clean, cert.sha256, cert.metadataChunksRemoved);
```

---

### 7. Diagnostics & Command Auditing

#### `verifyAlpha(input)`
Checks if an output buffer retains transparent pixels:
```javascript
const { verifyAlpha } = require('@zapwebp/core');
const hasAlpha = await verifyAlpha(webpBuffer);
```

#### `auditConversionCommand(commandString)`
Lints shell commands (e.g. `magick convert input.svg output.jpg`) for alpha loss and recommends safe Zap equivalents:
```javascript
const { auditConversionCommand } = require('@zapwebp/core');
const audit = auditConversionCommand('magick convert logo.svg logo.jpg');
```

---

## Constants Reference

| Constant | Value | Description |
|---|---|---|
| `MAX_WIDTH` | `4096` | Maximum allowable pixel dimension |
| `INPUT_FORMATS` | `['svg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'tiff']` | Supported input formats |
| `OUTPUT_FORMATS` | `['webp', 'png', 'jpeg', 'avif']` | Supported output formats |
| `FIT_MODES` | `['contain', 'cover', 'fill', 'inside', 'outside']` | Supported resize strategies |

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSUPPORTED_FORMAT` | Source image format is not recognized or unsupported | Use a supported format (SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF) |
| `E_CORRUPT_HEADER` | Image magic bytes or container header is truncated | Verify input file integrity |
| `E_ALPHA_NOT_REPRESENTABLE` | Converting transparent image to JPEG without background | Provide background color (`background: '#ffffff'`) |
| `E_INPUT_TOO_LARGE` | Input pixel dimensions exceed 4096×4096 limit | Downsample source image or resize prior to conversion |
| `E_UNSAFE_SVG` | SVG contains scripts, event handlers, or XXE entities | Sanitize vector XML before processing |

---

## For agents

```json
{
  "tool": "@zapwebp/core",
  "methods": [
    "convertImage",
    "inspectImage",
    "detectFormat",
    "decodeToRgba",
    "encodeFromRgba",
    "generateCleanCertificate",
    "verifyAlpha"
  ],
  "inputFormats": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputFormats": ["webp", "png", "jpeg", "avif"],
  "maxDimension": 4096
}
```

---

## Related

- [Formats Documentation](https://zapwebp-docs.vercel.app/formats): Complete format matrix and alpha handling rules.
- [Clean Mode](https://zapwebp-docs.vercel.app/clean): Metadata stripping and C2PA certificate verification.
- [CLI Reference](https://zapwebp-docs.vercel.app/cli): Terminal usage powered by `@zapwebp/core`.
- [Adding a New Image Format Guide](ADDING_A_FORMAT.md): Instructions for community format contributors.

---

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
