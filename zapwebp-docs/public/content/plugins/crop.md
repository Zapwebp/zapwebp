# Crop Plugin

Covers: the `@zapwebp/crop` transform plugin, auto-crop with aspect ratios (16:9, 1:1, 4:5, 3:2, 9:16, 21:9), gravities (center, top, bottom, left, right, face), manual coordinate slicing, cover and contain fits, and `withZapwebp` pipeline composition.

Does not cover: network upload protocols or terminal watch daemons. See [Storage Adapters](/plugins/storage) or [CLI](/cli).

Applies to: `@zapwebp/crop` and `@zapwebp/core` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/crop
```

```javascript
import { cropTransform } from '@zapwebp/crop';
import { convertImage } from '@zapwebp/core';

// Auto-crop to 1:1 with face centering
const result = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  transforms: [
    cropTransform({ aspectRatio: '1:1', gravity: 'face' }),
  ],
});
```

Using presets in cloud storage uploads:

```javascript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const zap = withZapwebp(supabaseAdapter(client), {
  crop: 'avatar', // 1:1 face/center
  targetFormat: 'webp',
  quality: 85,
});

await zap.upload('avatars', 'user.jpg', imageBytes);
```

## What it does

- **Transform Hook**: Executes as a pure in-memory transform between decoding and encoding stages, operating directly on uncompressed RGBA `RawImage` buffers.
- **Auto-Crop Presets**: Employs standard aspect ratios (`1:1`, `16:9`, `4:5`, `3:2`, `9:16`, `21:9`) with intelligent anchor positioning (`center`, `top`, `bottom`, `left`, `right`, `face`).
- **Face Detection**: Fast facial clustering analysis that centers cropping around detected subjects with a 500ms safety timeout that gracefully falls back to `center`.
- **Manual Slicing**: Accepts exact pixel values or percentage factors (< 1.0) with automatic boundary clamping and `E_CROP_EMPTY` protection.
- **Contain Fit**: Pads letterboxed areas with transparent or custom background colors when aspect ratio preservation without image clipping is required.
- **Transparent Preservation**: Ensures all 4 RGBA channels are preserved bit-for-bit without introducing black background artifacts.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `mode` | `'auto' \| 'manual'` | `'auto'` | Crop mode selection. Automatically inferred if `aspectRatio` or coordinates are given. |
| `aspectRatio` | `string \| number \| object` | `'1:1'` | Target aspect ratio string (`"16:9"`, `"1:1"`), number (`1.777`), or `{ width, height }`. |
| `gravity` | `string \| object` | `'center'` | Anchor point (`'center'`, `'top'`, `'bottom'`, `'left'`, `'right'`, `'face'`, or `{ x, y }`). |
| `fit` | `'cover' \| 'contain'` | `'cover'` | `'cover'` crops excess borders; `'contain'` letterboxes and pads with background. |
| `background` | `string` | `'transparent'` | Background fill color used when `fit: 'contain'` (hex, rgb, or `'transparent'`). |
| `x`, `y` | `number` | `0` | Manual crop start coordinate (pixels if >= 1, percentage if < 1). |
| `width`, `height` | `number` | image size | Manual crop dimension (pixels if >= 1, percentage if < 1). |

## Presets

| Preset | Aspect Ratio | Gravity | Fit | Common Use Case |
|---|---|---|---|---|
| `avatar` | `1:1` | `face` | `cover` | User profile avatars and author photos |
| `thumbnail` | `16:9` | `center` | `cover` | YouTube / video thumbnails and blog previews |
| `banner` | `21:9` | `center` | `cover` | Wide header banners and hero graphics |
| `product` | `4:5` | `center` | `contain` | E-commerce product showcases with padding |
| `story` | `9:16` | `center` | `cover` | Mobile stories and vertical video cards |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_CROP_EMPTY` | Requested crop region resulted in zero or negative dimensions after clamping. | Specify non-zero coordinates within the image bounds. |
| `E_INVALID_ASPECT_RATIO` | Aspect ratio string or object could not be parsed into a positive number. | Provide a standard ratio like `"16:9"`, `"1:1"`, or `{ width: 16, height: 9 }`. |

## Related

- [Storage Adapters](/plugins/storage) — Cloud adapters for Supabase, Firebase, and Neocities.
- [Core SDK](/sdk/core) — Universal conversion engine API and pipeline options.
- [Formats](/formats) — Transparency preservation matrix across image formats.

## For agents

```json
{
  "pkg": "@zapwebp/crop",
  "version": "1.0.0",
  "contract": "cropTransform(options?: CropOptions): TransformStep",
  "import": "import { cropTransform, cropImage } from '@zapwebp/crop';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/plugin-sdk": ">=1.1.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/crop",
  "docs": "https://zapwebp-docs.vercel.app/plugins/crop"
}
```
