# Next.js Plugin

Covers: Zapwebp Next.js plugin (`zapwebp-next`), App Router asset optimization, static export image pipelines, and build-time SVG conversion.

Does not cover: Vite bundler configuration or Cloudflare Pages functions. See [Vite Plugin](/plugins/vite).

Applies to: `zapwebp-next` and `@zapwebp/plugin-sdk` v1.0.0 and later.

## Quick start

```bash
npm install -D zapwebp-next
```

```javascript
// next.config.js
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
  outDir: 'public/icons',  // Output destination folder
  emitManifest: true,      // Writes zapwebp.manifest.json summary
  respectNextImage: true,  // Registers image/webp with next/image
  onConflict: 'overwrite', // 'overwrite' | 'skip' | 'error'
})(nextConfig);
```

## What it does

The Zapwebp Next.js plugin seamlessly enhances the Next.js asset pipeline:

- **Build-Time Webpack Hook**: Scans and converts SVGs during `next build` before compilation starts.
- **SSG & SSR Compatibility**: Works natively with Next.js App Router (`app/`), Pages Router (`pages/`), and Server Components.
- **Transparency-Safe Rasterization**: Directly converts vector SVGs to WebP with zero black background artifacts.
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
| `sourceDirs` | `string[]` | `['public', 'src/assets', 'app']` | Directories relative to project root scanned for `.svg` assets. |
| `outDir` | `string` | `'public/icons'` | Output folder relative to Next.js project root. |
| `emitManifest` | `boolean` | `true` | Generates a structured `zapwebp.manifest.json` report. |
| `respectNextImage` | `boolean` | `true` | Ensures `image/webp` is registered in `nextConfig.images.formats`. |
| `onConflict` | `'overwrite' \| 'skip' \| 'error'` | `'overwrite'` | Action when an output file already exists. |

## Examples

### Using Converted WebP in Next.js Server Components

```tsx
// app/page.tsx
import Image from 'next/image';

export default function Hero() {
  return (
    <Image
      src="/icons/logo.webp"
      alt="Hero Logo"
      width={512}
      height={512}
      priority
    />
  );
}
```

### Chaining with Existing Next.js Webpack Config

```javascript
// next.config.js
const { withZapwebp } = require('zapwebp-next');

module.exports = withZapwebp({
  scale: [1, 2],
})({
  webpack(config) {
    config.plugins.push(new CustomWebpackPlugin());
    return config;
  },
});
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

- [Vite Plugin](/plugins/vite) — Client-side Vite bundler plugin.
- [GitHub Action](/plugins/github-action) — Automated CI pipeline conversion.
- [Storage Adapters](/plugins/storage) — Neocities, Supabase, and S3 export targets.
- [Clean Mode](/clean) — Provenance stripping and metadata removal.

## For agents

```json
{
  "pkg": "zapwebp-next",
  "version": "1.0.0",
  "contract": "withZapwebp(options?: ZapwebpNextOptions): (nextConfig?: NextConfig) => NextConfig",
  "import": "import { withZapwebp } from 'zapwebp-next';",
  "peerDependencies": {
    "next": ">=12.0.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/next"
}
```
