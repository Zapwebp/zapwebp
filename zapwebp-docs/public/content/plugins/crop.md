# Crop Plugin

Covers: the `@zapwebp/crop` transform plugin, AI subject detection modes (`body`, `object`, `subject`), auto-crop with aspect ratios (16:9, 1:1, 4:5, 3:2, 9:16, 21:9), body presets (`head`, `head-shoulders`, `upper-body`, `full-body`), saliency strategies (`attention`, `entropy`), manual coordinate slicing, cover and contain fits, and `withZapwebp` pipeline composition.

Does not cover: network upload protocols or terminal watch daemons. See [Storage Adapters](/plugins/storage) or [CLI](/cli).

Applies to: `@zapwebp/crop` and `@zapwebp/core` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/crop
```

```javascript
import { cropTransform } from '@zapwebp/crop';
import { convertImage } from '@zapwebp/core';

// Mode 1: Body-Posture auto-detect (head and shoulders portrait)
const avatarResult = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  transforms: [
    cropTransform({
      mode: 'body',
      bodyPreset: 'head-shoulders',
      aspectRatio: '1:1',
      padding: 0.1,
    }),
  ],
});

// Mode 2: Object-Aware dominant subject framing
const productResult = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  transforms: [
    cropTransform({
      mode: 'object',
      selectLargest: true,
      aspectRatio: '4:5',
      padding: 0.05,
    }),
  ],
});

// Mode 3: Smart-Subject algorithmic saliency (0 KB, <10ms, no model download)
const smartResult = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  transforms: [
    cropTransform({
      mode: 'subject',
      strategy: 'attention',
      aspectRatio: '16:9',
    }),
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

- **Pure In-Memory Transform**: Executes as a pure transform between decoding and encoding stages, operating directly on uncompressed RGBA `RawImage` buffers.
- **Mode 1 — Body-Posture (`mode: 'body'`)**: Detects human body keypoints (MoveNet SinglePose / BlazePose / deterministic anatomic heuristic) filtered by `bodyPreset` (`head`, `head-shoulders`, `upper-body`, `full-body`) to anchor crops for portraits, headshots, and fashion photography.
- **Mode 2 — Object-Aware (`mode: 'object'`)**: Detects dominant foreground objects (COCO-SSD / contour segmentation) filtered by `objectClasses`, `minConfidence`, and `selectLargest`.
- **Mode 3 — Smart-Subject (`mode: 'subject'`)**: Model-free, 0 KB, <10ms algorithmic saliency analysis using `attention` (Sobel edge gradients + color contrast) or `entropy` (local 16-bin Shannon information density).
- **Universal Padding Expansion**: Expands detected bounding boxes by 0–50% padding before computing crop boundaries to prevent uncomfortably tight cuts.
- **Fail-Safe Fallback Chain**: If `body` or `object` detection detects nothing, model fails, or times out, falls back cleanly to `mode: 'subject'` (`strategy: 'attention'`), reporting `fallback: 'subject'` and `reason` in response metadata. Never throws.
- **Transparent Preservation**: Ensures all 4 RGBA channels are preserved bit-for-bit without introducing black background artifacts.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `mode` | `'auto' \| 'manual' \| 'body' \| 'object' \| 'subject'` | `'auto'` | Crop mode selection. Automatically inferred if `aspectRatio` or coordinates are given. |
| `aspectRatio` | `string \| number \| object` | `'1:1'` | Target aspect ratio string (`"16:9"`, `"1:1"`), number (`1.777`), or `{ width, height }`. |
| `bodyPreset` | `'head' \| 'head-shoulders' \| 'upper-body' \| 'full-body'` | `'upper-body'` | Keypoint filtering preset for `mode: 'body'`. |
| `strategy` | `'attention' \| 'entropy'` | `'attention'` | Saliency strategy for `mode: 'subject'`. `'attention'` focuses on visual contrast; `'entropy'` focuses on detail density. |
| `objectClasses` | `string[]` | `[]` (all) | Allowed object class labels for `mode: 'object'` (e.g. `['person', 'dog']`). |
| `minConfidence` | `number` | `0.5` | Minimum detection confidence score (0.0 to 1.0) for `mode: 'object'`. |
| `selectLargest` | `boolean` | `true` | Selects largest bounding box if `true`, or encloses all matching detections if `false`. |
| `padding` | `number` | `0` | Percentage padding expansion (0 to 0.5 fraction or 0 to 50 percent) around detected subject bounds. |
| `gravity` | `string \| object` | `'center'` | Anchor point for auto-crop (`'center'`, `'top'`, `'bottom'`, `'left'`, `'right'`, `'face'`, or `{ x, y }`). |
| `fit` | `'cover' \| 'contain'` | `'cover'` | `'cover'` crops excess borders; `'contain'` letterboxes and pads with background. |
| `background` | `string` | `'transparent'` | Background fill color used when `fit: 'contain'` (hex, rgb, or `'transparent'`). |
| `x`, `y` | `number` | `0` | Manual crop start coordinate (pixels if >= 1, percentage if < 1). |
| `width`, `height` | `number` | image size | Manual crop dimension (pixels if >= 1, percentage if < 1). |

## Body presets (`mode: 'body'`)

| Preset | Keypoints Included | Recommended Use Case |
|---|---|---|
| `head` | Nose, eyes, ears | Profile avatars and tiny icons |
| `head-shoulders` | Head + left/right shoulders | LinkedIn avatars and professional headshots |
| `upper-body` | Head, shoulders, hips | ID cards, portraits, and editorial photography |
| `full-body` | Head to ankles | Fashion, athletics, and full-length portraits |

## Presets (`mode: 'auto'`)

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
  "import": "import { cropTransform, cropImage, detectBody, detectObject, detectSubject, BODY_PRESETS } from '@zapwebp/crop';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/plugin-sdk": ">=1.1.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/crop",
  "docs": "https://zapwebp-docs.vercel.app/plugins/crop"
}
```
