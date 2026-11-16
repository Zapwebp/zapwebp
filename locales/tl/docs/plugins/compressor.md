# Compressor Plugin

Covers: ang `@zapwebp/compressor` plugin, deterministic binary search quality optimization, adaptive Lanczos3 downscaling, human size parsing, target lock integration, mga flag sa CLI (`--target`, `--min-quality`, `--no-downscale`), at `CompressionHandler` pipeline contracts.

Does not cover: file transfer sa cloud storage o client UI components. Tingnan ang [Storage Adapters](/plugins/storage) o [Universal UI Kit](/ui).

Applies to: `@zapwebp/compressor` at `@zapwebp/core` v1.0.0 at mas bago.

## Quick start

```bash
npm install @zapwebp/compressor
```

```javascript
import { compressor, compress } from '@zapwebp/compressor';
import { convertImage } from '@zapwebp/core';

// 1. Direktang pag-compress sa isang RawImage
const result = await compress(rawImage, {
  targetBytes: '500kb',
  minQuality: 20,
  maxQuality: 95,
  allowDownscale: true,
  downscaleStep: 0.9,
  maxDownscaleAttempts: 3,
});

console.log(result.quality);    // 78
console.log(result.bytes);      // 493520 (mas mababa sa 512,000 bytes)
console.log(result.downscaled); // false (o true kung pinaliit ang sukat)
console.log(result.iterations); // 4

// 2. Integrasyon sa convertImage
const converted = await convertImage(inputBuffer, {
  to: 'webp',
  targetBytes: '350kb',
  compressor,
});
```

Paggamit sa CLI:

```bash
zap images/ --target 500kb --to webp
zap hero.png --target 1mb --min-quality 30 --no-downscale
```

## What it does

Ang Compressor Plugin ay nagsisilbing opisyal na tagapagpatupad ng laki ng file sa Zapwebp pipeline:
- **Tiyak na Binary Search**: Nagsasagawa ng eksaktong binary search sa kalidad (`minQuality` hanggang `maxQuality`) na limitado sa 8 pag-ulit sa bawat sukat, upang maiwasan ang paulit-ulit na paghula.
- **Adaptive Lanczos3 Downscaling**: Kung hindi kasya ang imahe gamit ang kalidad lamang, awtomatikong pinapaliit ang lapad at taas ng imahe gamit ang Lanczos3 resampling (default: 0.9 kada hakbang) hanggang 3 beses.
- **Matalinong Pag-uulat**: Nagbabalik ng buong telemetry (`quality`, `width`, `height`, `downscaleCount`, `iterations`, `bestAttempt`).
- **Malinaw na Error Handling**: Kapag imposibleng maabot ang target na laki, nagtatapon ito ng `E_TARGET_UNREACHABLE` kasama ang suhestiyon sa tamang laki.
- **Target Lock Policy Executor**: Tumatakbo bago ang encode step at kumikilos bilang opisyal na `CompressionHandler` para sa `@zapwebp/core` at `@zapwebp/storage`.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TARGET_UNREACHABLE` | Hindi magkasya sa target size kahit binabaan ang kalidad at pinaliit ang sukat. | Taasan ang `targetBytes`, paganahin ang `allowDownscale`, o ibaba ang `minQuality`. |
| `E_OUTPUT_TOO_LARGE` | Lumagpas ang laki ng file sa itinakdang limit sa strict mode. | Lumipat sa `compress` o `flexible` size mode, o taasan ang limit. |

## For agents

```json
{
  "pkg": "@zapwebp/compressor",
  "version": "1.0.0",
  "contract": "compress(image: RawImage, options: CompressOptions): Promise<CompressionResult>",
  "import": "import { compressor, compress, binarySearchQuality, parseTargetBytes, defineCompressor } from '@zapwebp/compressor';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/plugin-sdk": ">=1.1.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/compressor",
  "docs": "https://zapwebp-docs.vercel.app/plugins/compressor"
}
```

## Related

- [Target Lock](/lock-target): Mga panuntunan at patakaran sa pag-lock ng format.
- [Storage Adapters](/plugins/storage): Awtomatikong pag-compress bago i-upload sa Supabase, Firebase, at Neocities.
- [CLI](/cli): Mga flag at utos sa terminal.
