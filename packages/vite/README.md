# zapwebp-vite

Official first-party Vite plugin for Zapwebp — zero-config SVG-to-WebP conversion with alpha transparency preservation, Retina multipliers (@1x/@2x/@3x), cryptographic metadata stripping, and responsive manifest generation.

Covers: Automated SVG-to-WebP rasterization during `vite build` and `vite dev`, multiplier generation (`scale: [1, 2, 3]`), transparency preservation verification, metadata stripping (`clean: true`), manifest writing (`zapwebp.manifest.json`), and conflict resolution.

Does not cover: Modifying or deleting source SVG vector assets (source SVGs are strictly immutable).

Applies to: `zapwebp-vite` v1.0.0 and later, Vite >=4.0.0 (Vue, Svelte, Solid, Astro, and vanilla).

## Quick start

```bash
# npm
npm install -D zapwebp-vite

# pnpm
pnpm add -D zapwebp-vite

# yarn
yarn add -D zapwebp-vite
```

Add the plugin to your `vite.config.ts` or `vite.config.js`:

```typescript
import { defineConfig } from 'vite';
import { zapwebp } from 'zapwebp-vite';

export default defineConfig({
  plugins: [
    zapwebp({
      scale: [1, 2, 3],        // Multiplier scales: generates icon.webp, icon@2x.webp, icon@3x.webp
      baseWidth: 512,          // 1x baseline pixel width
      quality: 85,             // Lossy compression quality (1-100)
      lossless: false,         // Set true for pixel-perfect compression
      clean: true,             // Strip EXIF, XMP, C2PA, and text comments
      outDir: 'public/icons',  // Output destination folder
      emitManifest: true,      // Writes zapwebp.manifest.json summary
      onConflict: 'overwrite', // 'overwrite' | 'skip' | 'error'
    }),
  ],
});
```

## What it does

`zapwebp-vite` hooks directly into the Vite build lifecycle and development server:
- **Build Hook Integration**: During `vite build`, all target SVGs are rasterized and optimized into modern formats before asset bundling.
- **Dev Server Watcher**: In `vite dev`, changes to SVGs trigger instant on-demand conversion and hot-reload.
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
| `outDir` | `string` | `'dist'` | Destination directory for converted assets |
| `emitManifest` | `boolean` | `true` | Emit `zapwebp.manifest.json` |
| `onConflict` | `'overwrite' \| 'skip' \| 'error'` | `'overwrite'` | Behavior on existing destination files |

### Manifest Output (`zapwebp.manifest.json`)

```json
{
  "version": "1.0.0",
  "generator": "zapwebp-vite",
  "generatedAt": "2026-11-01T22:00:00.000Z",
  "config": {
    "scales": [1, 2, 3],
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
  "tool": "zapwebp-vite",
  "version": "1.0.0",
  "type": "vite-plugin",
  "import": "import { zapwebp } from 'zapwebp-vite';",
  "peerDependencies": {
    "vite": ">=4.0.0"
  },
  "canonicalUrl": "https://zapwebp-docs.vercel.app/plugins/vite"
}
```

## Related

- [Vite Plugin Guide](https://zapwebp-docs.vercel.app/plugins/vite): Detailed Vite configuration and framework integration examples.
- [Next.js Plugin](https://zapwebp-docs.vercel.app/plugins/next): Next.js bundler equivalent.
- [Core SDK](https://zapwebp-docs.vercel.app/sdk/core): In-memory engine powering the plugin.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
