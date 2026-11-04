# `zapwebp-next`

> Official first-party Next.js plugin for Zapwebp — zero-config SVG-to-WebP conversion with alpha transparency preservation, Retina multipliers (@1x/@2x/@3x), cryptographic metadata stripping, and seamless `next/image` integration.

---

## 1. Scope & Capabilities

- **Covers**: Automated SVG-to-WebP conversion during `next build` and production asset bundling, multiplier generation (`scale: [1, 2, 3]`), transparency verification, metadata stripping (`clean: true`), manifest writing (`zapwebp.manifest.json`), webpack hook chaining, and `next/image` format registration.
- **Does not cover**: Modifying or deleting source SVG vector assets (source SVGs are strictly immutable).
- **Applies to**: Next.js >=12.0.0 (including Next.js 13, 14, and 15), App Router (`app/`), and Pages Router (`pages/`).

---

## 2. Installation

```bash
# npm
npm install -D zapwebp-next

# pnpm
pnpm add -D zapwebp-next

# yarn
yarn add -D zapwebp-next
```

---

## 3. Quickstart & Configuration

Wrap your Next.js configuration in `next.config.js` or `next.config.ts`:

### CommonJS (`next.config.js`)

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
  outDir: 'public/icons',  // Output destination folder
  emitManifest: true,      // Writes zapwebp.manifest.json summary
  respectNextImage: true,  // Registers image/webp with next/image
  onConflict: 'overwrite', // 'overwrite' | 'skip' | 'error'
})(nextConfig);
```

### TypeScript (`next.config.ts`)

```typescript
import type { NextConfig } from 'next';
import { withZapwebp } from 'zapwebp-next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withZapwebp({
  scale: [1, 2],
  baseWidth: 512,
})(nextConfig);
```

---

## 4. Full Options Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `scale` | `number[]` | `[1]` | Scale multipliers to render. Deduplicated and sorted ascending. |
| `baseWidth` | `number` | `512` | 1x width in pixels (16 to 16,384). Aspect ratio is strictly preserved. |
| `quality` | `number` | `85` | Compression quality from `1` to `100`. |
| `lossless` | `boolean` | `false` | Enables lossless WebP compression. |
| `clean` | `boolean` | `true` | Strips all EXIF, XMP, C2PA provenance, and private metadata chunks. |
| `sourceDirs` | `string[]` | `['public', 'src/assets', 'app']` | Directories relative to project root scanned for `.svg` assets. |
| `outDir` | `string` | `'public/icons'` | Output folder relative to the Next.js project root. |
| `emitManifest` | `boolean` | `true` | Generates a structured `zapwebp.manifest.json` report. |
| `respectNextImage` | `boolean` | `true` | Ensures `image/webp` is registered in `nextConfig.images.formats`. |
| `onConflict` | `'overwrite' \| 'skip' \| 'error'` | `'overwrite'` | Action when an output file already exists. |

---

## 5. Usage with `next/image` & HTML

Because outputs land in `public/icons/`, `next/image` serves them natively without external domain configuration:

```tsx
// app/page.tsx
import Image from 'next/image';

export default function Header() {
  return (
    <Image
      src="/icons/logo.webp"
      alt="Application Logo"
      width={512}
      height={512}
      priority
    />
  );
}
```

For responsive HTML `<picture>` elements with multipliers:

```html
<picture>
  <source
    type="image/webp"
    srcSet="/icons/logo.webp 1x, /icons/logo@2x.webp 2x, /icons/logo@3x.webp 3x"
  />
  <img src="/icons/logo.webp" alt="Application Logo" width="512" height="512" />
</picture>
```

---

## 6. Manifest Output (`zapwebp.manifest.json`)

When `emitManifest: true` is enabled, a machine-readable summary is written alongside converted assets:

```json
{
  "generatedBy": "zapwebp-next@1.0.0",
  "generatedAt": "2026-11-02T08:55:00.000Z",
  "totals": {
    "inputFiles": 3,
    "outputFiles": 6,
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

---

## 7. Security & Error Diagnostics

The plugin runs strict pre-flight checks on every SVG input using `@zapwebp/core`:

- **Active Content Rejection**: Any SVG containing `<script>`, `<foreignObject>`, or `on*=` inline event attributes is rejected immediately, failing the build loudly before rasterization.
- **Fail-Fast Error Codes**:
  - `E_UNSAFE_SVG`: SVG contains active script content or inline handlers.
  - `E_FILE_CONFLICT`: Output file exists and `onConflict: 'error'` was specified.
  - `E_DIMENSION_LIMIT`: Requested width exceeds libvips memory bounds.

---

## 8. For Agents

```json
{
  "pkg": "zapwebp-next",
  "version": "1.0.0",
  "type": "next-plugin",
  "import": "import { withZapwebp } from 'zapwebp-next';",
  "peerDependencies": {
    "next": ">=12.0.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/next"
}
```

