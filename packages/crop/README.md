# @zapwebp/crop

Pure transform crop plugin for the Zapwebp transparency-safe image engine.

Covers: auto-crop (aspect ratios, gravities, face detection), manual coordinate crops, presets, and `TransformStep` pipeline hooks.

Does not cover: network I/O, cloud storage, or image re-encoding.

Applies to: `@zapwebp/crop` v1.0.0 and later.

## Quick start

```bash
npm install @zapwebp/crop
```

```javascript
import { cropTransform } from '@zapwebp/crop';
import { convertImage } from '@zapwebp/core';

const result = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  transforms: [
    cropTransform({ aspectRatio: '1:1', gravity: 'face' }),
  ],
});
```

## Features

- **Pure Function**: Works directly on in-memory `RawImage` (RGBA) pixel buffers with zero network or filesystem side effects.
- **Auto-Crop**: Specify standard aspect ratios (`16:9`, `1:1`, `4:5`, `21:9`) with intelligent gravity (`center`, `top`, `bottom`, `left`, `right`, `face`).
- **Face Detection**: Fast facial clustering analysis with a 500ms safety timeout that gracefully falls back to `center`.
- **Manual Crop**: Pixel coordinates or percentage factors with automatic boundary clamping and `E_CROP_EMPTY` protection.
- **Contain Mode**: Letterbox with transparent or solid background color when aspect ratios must be preserved without losing image borders.
- **Composable**: Works seamlessly with `@zapwebp/core` and `@zapwebp/storage`.
