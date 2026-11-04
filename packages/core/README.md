<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-core.svg" width="120" height="120" alt="@zapwebp/core logo" />
</p>

# @zapwebp/core

The shared image conversion, format detection, SVG validation, and metadata cleaning engine behind the entire Zap ecosystem. Provides format-aware, memory-safe conversion across SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF with strict alpha preservation and zero telemetry.

Documentation: [https://zapwebp.vercel.app/formats](https://zapwebp.vercel.app/formats)

---

## Features

- **Format Autodetection:** Sniffs image headers from raw magic bytes and XML patterns, never relying on file extensions alone.
- **Rust-Powered SVG Engine:** Rasterizes SVG vectors via `@resvg/resvg-js` over transparent canvases with subpixel accuracy.
- **Libvips Raster Pipeline:** High-throughput streaming image transform pipeline powered by `sharp`.
- **Alpha Guarantees:** Transparency is preserved across WebP, PNG, and AVIF. Converting transparent inputs to JPEG without an explicit background color throws a structured `alpha_not_representable` error.
- **Clean Mode & AI Provenance:** Detects AI-generated metadata (C2PA Content Credentials, Midjourney, Adobe Firefly, Stable Diffusion) and generates cryptographically signed Clean Certificates.
- **Multiplier Tooling:** Utility functions for parsing scale arrays (`@1x`, `@2x`, `@3x`), generating filename suffixes, and building ready-to-paste `<img srcset>` HTML snippets.
- **Security Sandboxing:** Rejects SVGs containing active scripts (`<script>`, inline handlers), external entity expansions (XXE), or remote network references.

---

## Installation

```bash
pnpm add @zapwebp/core
```

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

#### Example
```javascript
const { convertImage } = require('@zapwebp/core');

// Convert SVG to WebP with target width
const webpBuffer = await convertImage(svgString, {
  to: 'webp',
  width: 512,
  quality: 90,
});
```

---

### 2. `inspectImage(input)`
Analyzes image dimensions, format, color space, alpha transparency, and AI provenance hints.

```typescript
function inspectImage(input: Buffer | Uint8Array | string): Promise<{
  format: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  channels: number;
  space: string;
  bytes: number;
  aiProvenanceHints: string[];
}>
```

#### Example
```javascript
const { inspectImage } = require('@zapwebp/core');

const info = await inspectImage(imageBuffer);
console.log(info.format, info.width, info.hasAlpha, info.aiProvenanceHints);
// => 'png', 1024, true, ['C2PA Manifest detected']
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
const { data, width, height, channels } = await decodeToRgba(inputBuffer);

// Process raw pixel buffer...

// Encode raw RGBA back to modern format
const outputBuffer = await encodeFromRgba(data, { width, height }, {
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
parseScales('1, 2x, 3'); // => [1, 2, 3]
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
// => <img src="hero.webp" srcset="hero.webp 1x, hero@2x.webp 2x, hero@3x.webp 3x" alt="Hero Banner">
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
// => { safe: false, issues: ['JPEG drops transparency'], recommendedCommand: 'zap logo.svg --to webp' }
```

#### `explainBlackBackground(context)`
Returns technical root cause and fix for WebP black background defects.

---

## Constants Reference

| Constant | Value | Description |
|---|---|---|
| `MAX_WIDTH` | `4096` | Maximum allowable pixel dimension |
| `INPUT_FORMATS` | `['svg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'tiff']` | Supported input formats |
| `OUTPUT_FORMATS` | `['webp', 'png', 'jpeg', 'avif']` | Supported output formats |
| `FIT_MODES` | `['contain', 'cover', 'fill', 'inside', 'outside']` | Supported resize strategies |

---

## Extensibility & Custom Formats

To add support for a new image format to `@zapwebp/core` (e.g. HEIC, JXL), see the [Adding a New Image Format Guide](ADDING_A_FORMAT.md).

---

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
