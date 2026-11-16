# zapwebp-next

Official first-party Next.js plugin for Zapwebp — zero-config SVG-to-WebP conversion with alpha transparency preservation, Retina multipliers (@1x/@2x/@3x), cryptographic metadata stripping, and seamless `next/image` integration.

Covers: Automated SVG-to-WebP conversion during `next build` and production asset bundling, multiplier generation (`scale: [1, 2, 3]`), transparency verification, metadata stripping (`clean: true`), manifest writing (`zapwebp.manifest.json`), webpack hook chaining, and `next/image` format registration.

Does not cover: Modifying or deleting source SVG vector assets (source SVGs are strictly immutable).

Applies to: `zapwebp-next` v1.0.0 and later, Next.js >=12.0.0 (including Next.js 13, 14, and 15), App Router (`app/`), and Pages Router (`pages/`).

## Quick start

```bash
# npm
npm install -D zapwebp-next

# pnpm
pnpm add -D zapwebp-next

# yarn
yarn add -D zapwebp-next
```

Wrap your Next.js configuration in `next.config.js` or `next.config.ts`:

```javascript
const { withZapwebp } = require('zapwebp-next');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withZapwebp({
  scale: [1, 2, 3],        // Multiplier scales: generates logo.webp, logo@2x.webp, logo@3x.webp
  baseWidth: 512,          // 1x baseline pixel width
  quality: 85,             // Lossy compression quality (1-100)
  lossless: false,         // Set true for pixel-perfect compression
  clean: true,             // Strip EXIF, XMP, C2PA, and text comments
  sourceDirs: ['public', 'src/assets', 'app'], // Directories to scan
  outDir: 'public/converted', // Output directory
  emitManifest: true,      // Writes zapwebp.manifest.json
})(nextConfig);
```

## What it does

`zapwebp-next` integrates directly into the Next.js compilation lifecycle via webpack plugins:
- **Build Hook Integration**: During `next build`, all target SVGs are rasterized and optimized into modern formats before Next.js compiles page bundles.
- **`next/image` Synergy**: Pre-converts heavy vector files to WebP so the Next.js Image Optimization API can serve optimized assets with zero cold-start latency.
- **Transparency Preservation**: Guaranteed alpha preservation verified at the pixel level; transparent pixels are never flattened to black.
- **Multipliers & Srcset**: Generates retina scale variants alongside pre-computed `zapwebp.manifest.json` metadata.
- **Clean Mode**: Strips tracking metadata, EXIF, and AI provenance tags.

### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `scale` | `number[]` | `[1]` | Array of scale multipliers (e.g. `[1, 2, 3]`) |
| `baseWidth` | `number` | `512` | Pixel width corresponding to `@1x` scale |
| `quality` | `number` | `85` | Compression quality rating (1–100) |
| `lossless` | `boolean` | `false` | Lossless encoding where supported |
| `clean` | `boolean` | `true` | Strip EXIF, XMP, and C2PA metadata |
| `sourceDirs` | `string[]` | `['public']` | Directories to scan for source SVG assets |
| `outDir` | `string` | `'public'` | Destination directory for converted assets |
| `emitManifest` | `boolean` | `true` | Emit `zapwebp.manifest.json` |

### Manifest Output (`zapwebp.manifest.json`)

```json
{
  "version": "1.0.0",
  "generator": "zapwebp-next",
  "generatedAt": "2026-11-01T22:00:00.000Z",
  "stats": {
    "totalFiles": 12,
    "inputBytes": 98400,
    "outputBytes": 22100,
    "bytesSaved": 76300,
    "savingsPercent": 77.5
  },
  "options": {
    "scales": [1, 2],
    "baseWidth": 512,
    "quality": 85,
    "lossless": false,
    "clean": true
  },
  "files": [
    {
      "source": "src/assets/logo.svg",
      "target": "logo.webp",
      "scale": 1,
      "width": 512,
      "height": 512,
      "bytes": 2840,
      "alphaPreserved": true,
      "sha256": "3a8b29..."
    }
  ]
}
```

## Errors

The plugin runs strict pre-flight checks on every SVG input using `@zapwebp/core`:

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains `<script>`, `<foreignObject>`, or `on*` handlers | Remove active executable content from SVG |
| `E_FILE_CONFLICT` | Destination file exists and `onConflict: 'error'` was specified | Change `onConflict` setting to `'overwrite'` or remove file |
| `E_DIMENSION_LIMIT` | Requested width exceeds libvips memory bounds (4096px) | Lower `baseWidth` or maximum scale factor |

## For agents

```json
{
  "tool": "zapwebp-next",
  "version": "1.0.0",
  "type": "next-plugin",
  "import": "import { withZapwebp } from 'zapwebp-next';",
  "peerDependencies": {
    "next": ">=12.0.0"
  },
  "canonicalUrl": "https://zapwebp-docs.vercel.app/plugins/next"
}
```

## Related

- [Next.js Plugin Guide](https://zapwebp-docs.vercel.app/plugins/next): Full Next.js guide and deployment recipes.
- [Vite Plugin](https://zapwebp-docs.vercel.app/plugins/vite): Vite bundler equivalent.
- [Core SDK](https://zapwebp-docs.vercel.app/sdk/core): Core engine powering the plugin.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
