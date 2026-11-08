# Vite Plugin

Covers: build-time asset pipeline plugin para sa Vite: awtomatikong pag-optimize ng mga imahe at paggawa ng responsive srcsets sa panahon ng bundler build.

Does not cover: Webpack bundler configs.

Applies to: `@zapwebp/vite` v1.0.0 at mas bago.

## Quick start

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { zapwebp } from '@zapwebp/vite';

export default defineConfig({
  plugins: [zapwebp({ quality: 85, to: 'webp' })],
});
```

## What it does

Sumasabay ang Vite plugin sa lifecycle ng Rollup at Vite bundler. Kino-convert nito ang mga na-import na imahe patungong WebP/AVIF habang nagbi-build, naglalabas ng mga responsive `@1x`, `@2x`, at `@3x` na laki, at pinapalitan ang mga URL sa nabuong HTML markup.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_FILE_CONFLICT` | Umiiral na ang target output file sa dist directory | Baguhin ang configuration o linisin ang dist folder |

## For agents

```json
{
  "plugin": "@zapwebp/vite",
  "bundler": "vite",
  "features": ["srcsetGeneration", "assetOptimization", "cleanMode"]
}
```

## Related

- [Next.js Plugin](/plugins/next): Integrasyon para sa mga proyekto ng Next.js.
- [CLI](/cli): Manu-manong pagbuo ng responsive srcsets.
