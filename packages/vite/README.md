# `zapwebp-vite`

> Official first-party Vite plugin for Zapwebp — zero-config SVG-to-WebP conversion with alpha transparency preservation, Retina multipliers (@1x/@2x/@3x), cryptographic metadata stripping, and responsive manifest generation.

---

## 1. Scope & Capabilities

- **Covers**: Automated SVG-to-WebP rasterization during `vite build` and `vite dev`, multiplier generation (`scale: [1, 2, 3]`), transparency preservation verification, metadata stripping (`clean: true`), manifest writing (`zapwebp.manifest.json`), and conflict resolution.
- **Does not cover**: Modifying or deleting source SVG vector assets (source SVGs are strictly immutable).
- **Applies to**: Vite >=4.0.0, Vue, Svelte, Solid, Astro, and vanilla Vite projects.

---

## 2. Installation

```bash
# npm
npm install -D zapwebp-vite

# pnpm
pnpm add -D zapwebp-vite

# yarn
yarn add -D zapwebp-vite
```

---

## 3. Quickstart & Configuration

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

---

## 4. Full Options Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `scale` | `number[]` | `[1]` | Scale multipliers to render. Deduplicated and sorted ascending. |
| `baseWidth` | `number` | `512` | 1x width in pixels (16 to 16,384). Aspect ratio is strictly preserved. |
| `quality` | `number` | `85` | Compression quality from `1` to `100`. |
| `lossless` | `boolean` | `false` | Enables lossless WebP compression. |
| `clean` | `boolean` | `true` | Strips all EXIF, XMP, C2PA provenance, and private metadata chunks. |
| `outDir` | `string` | `'public/icons'` | Output folder relative to the Vite project root. |
| `emitManifest` | `boolean` | `true` | Generates a structured `zapwebp.manifest.json` report. |
| `emitToPublic` | `boolean` | `true` | Emits directly to the public directory for static URL serving. |
| `onConflict` | `'overwrite' \| 'skip' \| 'error'` | `'overwrite'` | Action when an output file already exists. |
| `include` | `string[]` | `['**/*.svg']` | Glob patterns of SVG assets to include. |
| `exclude` | `string[]` | `['node_modules/**', 'dist/**', '.git/**']` | Glob patterns to ignore. |

---

## 5. Multipliers & Responsive `srcset`

When configuring multipliers:

```typescript
zapwebp({
  scale: [1, 2],
  baseWidth: 256,
  outDir: 'public/brand',
});
```

For a source file `logo.svg`, the plugin outputs:
- `public/brand/logo.webp` (256px wide)
- `public/brand/logo@2x.webp` (512px wide)

In your HTML / templates:

```html
<img
  src="/brand/logo.webp"
  srcset="/brand/logo.webp 1x, /brand/logo@2x.webp 2x"
  alt="Brand Logo"
  width="256"
/>
```

---

## 6. Manifest Output (`zapwebp.manifest.json`)

When `emitManifest: true` is enabled, a machine-readable summary is written alongside converted assets:

```json
{
  "generatedBy": "zapwebp-vite@1.0.0",
  "generatedAt": "2026-11-02T08:50:00.000Z",
  "totals": {
    "inputFiles": 4,
    "outputFiles": 12,
    "inputBytes": 145020,
    "outputBytes": 38400,
    "bytesSaved": 106620,
    "savingsPercent": 73.5
  },
  "options": {
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

---

## 7. Security & Error Diagnostics

The plugin runs strict pre-flight checks on every SVG input using `@zapwebp/core`:

- **Active Content Rejection**: Any SVG containing `<script>`, `<foreignObject>`, or `on*=` inline event attributes is rejected immediately, failing the build loudly before rasterization.
- **Remote Entity Blocking**: External `<!ENTITY>` and remote stylesheet imports are rejected.
- **Fail-Fast Error Codes**:
  - `E_UNSAFE_SVG`: SVG contains active script content.
  - `E_FILE_CONFLICT`: Output file exists and `onConflict: 'error'` was specified.
  - `E_DIMENSION_LIMIT`: Requested width exceeds libvips memory bounds.

---

## 8. For Agents

```json
{
  "pkg": "zapwebp-vite",
  "version": "1.0.0",
  "type": "vite-plugin",
  "import": "import { zapwebp } from 'zapwebp-vite';",
  "peerDependencies": {
    "vite": ">=4.0.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/vite"
}
```

