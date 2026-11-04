# Vite Plugin

Covers: Zapwebp Vite plugin (`zapwebp-vite`), build-time asset conversion, multiplier scale generation (@1x/@2x/@3x), alpha channel preservation, and transparent asset bundling.

Does not cover: runtime edge server rendering or dynamic serverless conversion. See [Next Plugin](/plugins/next).

Applies to: `zapwebp-vite` and `@zapwebp/plugin-sdk` v1.0.0 and later.

## Quick start

```bash
npm install -D zapwebp-vite
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import { zapwebp } from 'zapwebp-vite';

export default defineConfig({
  plugins: [
    zapwebp({
      scale: [1, 2, 3],        // 1x, 2x, 3x Retina output multipliers
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

The Zapwebp Vite plugin automates image optimization across your build pipeline:

- **Build-Time Transformation**: Automatically converts SVGs to WebP during `vite build` and `vite dev`, saving up to 85% bandwidth.
- **Zero-Config Transparency**: Guarantees alpha preservation for vector graphics without black background artifacts.
- **Retina Multipliers**: Emits `@1x`, `@2x`, and `@3x` variants in one pass for responsive `<img srcset>` templates.
- **Clean Mode Integration**: Purges C2PA manifests, EXIF metadata, and camera tags before files reach production bundles.
- **Manifest Generation**: Generates `zapwebp.manifest.json` reporting total files, bytes saved, and cryptographic file hashes.
- **Zero Mutation**: Source SVGs are strictly immutable and never altered.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `scale` | `number[]` | `[1]` | Scale multipliers to render. Deduplicated and sorted ascending. |
| `baseWidth` | `number` | `512` | 1x width in pixels (16 to 16,384). Aspect ratio is strictly preserved. |
| `quality` | `number` | `85` | Compression quality from `1` to `100`. |
| `lossless` | `boolean` | `false` | Enables lossless WebP compression. |
| `clean` | `boolean` | `true` | Strips all EXIF, XMP, C2PA provenance, and private metadata chunks. |
| `outDir` | `string` | `'public/icons'` | Output folder relative to Vite project root. |
| `emitManifest` | `boolean` | `true` | Generates a structured `zapwebp.manifest.json` report. |
| `emitToPublic` | `boolean` | `true` | Emits directly to the public directory for static URL serving. |
| `onConflict` | `'overwrite' \| 'skip' \| 'error'` | `'overwrite'` | Strategy when target output already exists. |
| `include` | `string[]` | `['**/*.svg']` | Glob patterns of SVG assets to include. |
| `exclude` | `string[]` | `['node_modules/**', 'dist/**', '.git/**']` | Glob patterns to ignore. |

## Examples

### Multipliers with Responsive Srcset

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import { zapwebp } from 'zapwebp-vite';

export default defineConfig({
  plugins: [
    zapwebp({
      scale: [1, 2],
      baseWidth: 256,
      outDir: 'public/brand',
    }),
  ],
});
```

Outputs `public/brand/logo.webp` (256px) and `public/brand/logo@2x.webp` (512px). Use in your HTML:

```html
<img
  src="/brand/logo.webp"
  srcset="/brand/logo.webp 1x, /brand/logo@2x.webp 2x"
  alt="Brand Logo"
  width="256"
/>
```

## Security

Active scripts (`<script>`), foreign objects (`<foreignObject>`), and inline event handlers (`onload`, `onclick`) inside SVG files are immediately rejected with an actionable build error to prevent stored XSS vulnerabilities.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains active script or XML entity | Remove `<script>` elements and sanitize vector code |
| `E_FILE_CONFLICT` | Target output already exists and `onConflict: 'error'` | Change strategy to `'overwrite'` or remove existing file |
| `E_INVALID_SCALE` | Multiplier factor is outside 0.1 to 10 range | Provide positive numbers in `scale` array |

## Related

- [Next Plugin](/plugins/next) — Server-side Next.js optimization.
- [GitHub Action](/plugins/github-action) — Automated CI pipeline conversion.
- [Storage Adapters](/plugins/storage) — Neocities, Supabase, and S3 export targets.
- [Clean Mode](/clean) — Provenance stripping and metadata removal.

## For agents

```json
{
  "pkg": "zapwebp-vite",
  "version": "1.0.0",
  "contract": "zapwebp(options?: ZapwebpPluginOptions): VitePlugin",
  "import": "import { zapwebp } from 'zapwebp-vite';",
  "peerDependencies": {
    "vite": ">=4.0.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/vite"
}
```
