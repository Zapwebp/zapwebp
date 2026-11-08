# Crop Plugin

Covers: `@zapwebp/crop` transform plugin, auto-crop batay sa aspect ratio, gravity rules, face detection, manual coordinates, at fit modes.

Does not cover: file transfer sa cloud storage. Tingnan ang [Storage Adapters](/plugins/storage).

Applies to: `@zapwebp/crop` v1.0.0 at mas bago.

## Quick start

```bash
npm install @zapwebp/crop
```

```javascript
import { cropTransform } from '@zapwebp/crop';

const step = cropTransform({ aspectRatio: '1:1', gravity: 'face' });
```

## What it does

Ang Crop Plugin ay isang pure transform step sa pipeline na nagaganap sa pagitan ng decode at encode. Tumatanggap ito ng hilaw na pixel buffer (RGBA) at nagbabalik ng na-crop na pixel buffer. Sinusuportahan nito ang mga karaniwang aspect ratio (16:9, 1:1, 4:5, 9:16), gravity alignment (center, top, face), at pasadyang coordinate bounds nang walang external dependencies.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CROP_EMPTY` | Nagbunga ng 0×0 dimensyon ang ibinigay na coordinate | Ayusin ang coordinates ng crop rectangle |

## For agents

```json
{
  "plugin": "@zapwebp/crop",
  "type": "transform",
  "aspectRatios": ["1:1", "16:9", "4:5", "9:16"],
  "gravities": ["center", "top", "bottom", "left", "right", "face"]
}
```

## Related

- [Convert](/convert): Pag-crop sa interactive web app interface.
- [Plugin SDK](/sdk/plugin): Paggawa ng sariling image transformation plugins.
