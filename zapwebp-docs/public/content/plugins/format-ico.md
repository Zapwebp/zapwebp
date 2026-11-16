# ICO Plugin

Covers: the `@zapwebp/format-ico` format plugin, high-resolution multi-size ICO/CUR container generation, embedded PNG parsing, legacy BMP DIB decoding (32-bit ARGB, 24-bit BGR, 8/4/1 bpp palletized with AND masks), the `generateFaviconSuite` multi-asset generator, and the standalone `zapwebp-favicon` CLI executable.

Does not cover: client-side DOM drag-and-drop file upload interfaces or storage network replication. See [UI Kit](/ui) or [Storage Adapters](/plugins/storage).

Applies to: `@zapwebp/format-ico` and `@zapwebp/core` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/format-ico
```

```javascript
import { registerFormat, convertImage } from '@zapwebp/core';
import { icoHandler, generateFaviconSuite } from '@zapwebp/format-ico';

// 1. Register ICO format handler with core engine
registerFormat(icoHandler);

// 2. Convert SVG/PNG to multi-size ICO
const icoBuffer = await convertImage(inputBuffer, {
  to: 'ico',
  sizes: [16, 32, 48, 64, 128, 256],
});

// 3. Generate a complete web favicon suite in one call
const suite = await generateFaviconSuite(inputBuffer, {
  name: 'My Web App',
  shortName: 'MyApp',
  themeColor: '#10b981',
  backgroundColor: '#ffffff',
  prefix: '/',
});
```

Using the standalone CLI:

```bash
npx zapwebp-favicon logo.svg -o ./public --name "My App" --theme-color "#10b981"
```

## What it does

- **Multi-Resolution ICO Containers**: Assembles multiple resolutions (`16×16`, `32×32`, `48×48`, `64×64`, `128×128`, `256×256`) into a single standard `.ico` binary, ensuring crisp rendering across browser tabs, taskbars, and high-DPI desktop shortcuts.
- **Embedded PNG Compression**: Encodes icon slices as compressed PNG streams inside the ICO container, saving up to 80% file size while preserving 8-bit alpha transparency.
- **Universal Decoding**: Parses both modern PNG-compressed ICO entries and legacy Windows BMP DIBs (32-bit ARGB, 24-bit BGR, 8/4/1-bit palletized with 1-bit AND masks). Automatically selects the highest-resolution image when converting to other formats.
- **Favicon Suite Generator**: Automatically produces `favicon.ico`, `apple-touch-icon.png` (180×180), `icon-192.png` (PWA), `icon-512.png` (PWA splash), `favicon-32x32.png`, `favicon-16x16.png`, W3C `site.webmanifest`, and HTML `<head>` tags from a single SVG or PNG.
- **Deterministic Transparency**: Guarantees crisp alpha channels across all resolutions without black background discoloration.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `sizes` | `number[] \| string` | `[16, 32, 48, 64, 128, 256]` | Target resolutions to embed in `favicon.ico`. |
| `name` | `string` | `'App'` | Application name for `site.webmanifest`. |
| `shortName` | `string` | `name` | Short name for mobile home screen launchers. |
| `themeColor` | `string` | `'#000000'` | Browser toolbar theme color hex code. |
| `backgroundColor` | `string` | `'#ffffff'` | PWA splash screen background color hex code. |
| `prefix` | `string` | `'/'` | URL path prefix for HTML link tags and manifest icon paths. |
| `background` | `string` | `undefined` | Optional background color for flattening transparent inputs. |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_CORRUPT_HEADER` | The ICO file is smaller than 6 bytes or contains invalid magic signatures. | Verify the input file is an uncorrupted ICO/CUR image. |
| `E_BOUNDS_EXCEEDED` | ICO container specifies more than 20 image entries or image dimensions exceed 4096×4096. | Re-encode the ICO container with standard resolution targets (<= 20 entries). |
| `E_INVALID_CONFIG` | Provided sizes array contains invalid non-integer or out-of-range dimensions (< 8 or > 512). | Specify standard icon dimensions between 8 and 512. |

## Related

- [Formats](/formats) — Transparency preservation matrix across image formats.
- [Crop Plugin](/plugins/crop) — Subject-aware cropping and aspect ratio transforms.
- [Core SDK](/sdk/core) — Universal conversion engine API and pipeline options.

## For agents

```json
{
  "pkg": "@zapwebp/format-ico",
  "version": "1.0.0",
  "contract": "generateFaviconSuite(input: Buffer | string, options?: FaviconSuiteOptions): Promise<FaviconSuiteResult>",
  "import": "import { icoHandler, generateFaviconSuite, encodeIco, parseIco, decodeIco } from '@zapwebp/format-ico';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/plugin-sdk": ">=1.1.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/format-ico",
  "docs": "https://zapwebp-docs.vercel.app/plugins/format-ico"
}
```
