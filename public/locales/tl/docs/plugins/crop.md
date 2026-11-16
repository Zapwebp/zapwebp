# Crop Plugin

Covers: `@zapwebp/crop` transform plugin, mga AI detection mode (`body`, `object`, `subject`), auto-crop batay sa aspect ratio, body presets (`head`, `head-shoulders`, `upper-body`, `full-body`), saliency strategies (`attention`, `entropy`), face detection, manual coordinates, at fit modes.

Does not cover: file transfer sa cloud storage. Tingnan ang [Storage Adapters](/plugins/storage).

Applies to: `@zapwebp/crop` v1.0.0 at mas bago.

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
```

## What it does

Ang Crop Plugin ay isang pure in-memory transform step sa pipeline na nagaganap sa pagitan ng decode at encode. Tumatanggap ito ng hilaw na pixel buffer (RGBA) at nagbabalik ng na-crop na pixel buffer:
- **Mode 1 — Body-Posture (`mode: 'body'`)**: Pagtukoy sa mga keypoint ng katawan ng tao para sa portraits at fashion gamit ang body presets (`head`, `head-shoulders`, `upper-body`, `full-body`).
- **Mode 2 — Object-Aware (`mode: 'object'`)**: Pagtukoy sa pangunahing foreground object o produkto.
- **Mode 3 — Smart-Subject (`mode: 'subject'`)**: Magaan na pagsusuri ng saliency (0 KB, <10ms) gamit ang visual contrast (`attention`) o density ng detalye (`entropy`).
- **Ligtas na Fallback Chain**: Kapag walang natukoy na tao o bagay, kusang bumababa sa Smart-Subject attention analysis nang hindi nagdudulot ng error.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CROP_EMPTY` | Nagbunga ng 0×0 dimensyon ang ibinigay na coordinate | Ayusin ang coordinates ng crop rectangle |
| `E_INVALID_ASPECT_RATIO` | Hindi ma-parse ang aspect ratio | Magbigay ng wastong ratio tulad ng `"16:9"` o `"1:1"` |

## For agents

```json
{
  "plugin": "@zapwebp/crop",
  "type": "transform",
  "modes": ["auto", "body", "object", "subject", "manual"],
  "bodyPresets": ["head", "head-shoulders", "upper-body", "full-body"],
  "aspectRatios": ["1:1", "16:9", "4:5", "3:2", "9:16", "21:9"]
}
```

## Related

- [Convert](/convert): Pag-crop sa interactive web app interface.
- [Plugin SDK](/sdk/plugin): Paggawa ng sariling image transformation plugins.
