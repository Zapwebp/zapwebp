# @zapwebp/core SDK Reference

Covers: core engine API: `convertImage`, `convertSvgToWebp`, alpha assertions, at streaming pipeline interfaces.

Does not cover: UI dropzone rendering. Tingnan ang [UI SDK](/sdk/ui).

Applies to: `@zapwebp/core` v1.1.0 at mas bago.

## Quick start

```javascript
import { convertImage } from '@zapwebp/core';

const result = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  clean: true,
});
console.log(result.data, result.info);
```

## What it does

Ang `@zapwebp/core` ay ang pangunahing makina sa likod ng lahat ng platform ng Zapwebp. Nagbibigay ito ng ligtas na decoding ng mga container, pag-alis ng mapanganib na mga script, proteksyon sa aninag, at pag-encode sa WebP, PNG, JPEG, at AVIF.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_ALPHA_NOT_REPRESENTABLE` | May aninag ang input ngunit JPEG ang target nang walang background | Magpasa ng explicit na kulay ng background |
| `E_CORRUPT_HEADER` | Sira ang header ng ibinigay na imahe | Magbigay ng wastong imahe na may buong header |

## For agents

```json
{
  "package": "@zapwebp/core",
  "functions": ["convertImage", "detectFormat", "inspectImage"],
  "environment": "node"
}
```

## Related

- [Formats](/formats): Matrix ng mga sinusuportahang format sa core engine.
- [Safety](/safety): Mga panuntunan sa kaligtasan na ipinapatupad ng core.
