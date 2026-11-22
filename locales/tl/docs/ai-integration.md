# AI Integration

Covers: Pagbuo ng mga AI-powered na pipeline para sa pag-convert at pag-optimize ng imahe gamit ang content signals, model hooks, manual crop coordinates, at custom metadata ng Zapwebp.
Does not cover: Internal na AI inference o bundled neural models. Ang Zapwebp ay 100% deterministiko, lokal, at walang AI dependency.
Applies to: `@zapwebp/core`, `@zapwebp/crop`, `@zapwebp/plugin-sdk`, `@zapwebp/mcp`, at mga pipeline ng developer (OpenAI, Anthropic Claude, Google Gemini, local Llama, custom models).

## Quick start

```javascript
import { inspect, convert } from '@zapwebp/core';
import { cropTransform } from '@zapwebp/crop';

// 1. Suriin ang imahe upang kunin ang content signals
const info = await inspect(imageBytes);
console.log(info.content.estimatedType); // 'photo', 'icon', 'text', 'diagram', atbp.
console.log(info.content.colorCount);    // bilang ng natatanging kulay
console.log(info.palette.dominant);      // hal. '#8dc63f'

// 2. Tawagin ang iyong vision model (sa labas ng Zapwebp)
const decision = await myVisionModel.decide(info);

// 3. I-convert gamit ang custom AI metadata at crop transforms
const result = await convert(imageBytes, {
  to: decision.format,
  quality: decision.quality,
  transforms: [
    cropTransform({
      mode: 'manual',
      x: decision.crop.x,
      y: decision.crop.y,
      width: decision.crop.width,
      height: decision.crop.height,
    }),
  ],
  customMetadata: {
    'ai:model': 'gpt-4o',
    'ai:confidence': decision.confidence,
    'ai:reason': decision.reason,
  },
});
```

## What it does

Hindi nag-i-import ang Zapwebp ng mga library ng AI, hindi tumatawag sa mga panlabas na AI API, at hindi nagtatago ng mga modelo ng machine learning. Sa halip, ibinibigay nito ang mga **Smart Layer primitives** upang makapagtayo ang mga developer ng mabilis at maaasahang mga pipeline ng imahe:

1. **Model-Friendly Content Signals (`inspect`)**: Nagbabalik ng mga mathematical metric na madaling basahin ng mga vision model nang walang hulaan sa bytes:
   - `edgeDensity`: Normalisadong dami ng detalye ($0\dots 1$).
   - `colorCount`: Bilang ng natatanging kulay sa quantized color space.
   - `sharpness`: Normalisadong sukat ng talas gamit ang Laplacian variance ($0\dots 1$).
   - `luminanceMean` & `luminanceVariance`: Liwanag at contrast distribution.
   - `transparencyCoverage`: Bahagdan ng pixel na may transparency ($0\dots 1$).
   - `estimatedType`: Deterministikong uri (`'photo'`, `'icon'`, `'screenshot'`, `'logo'`, `'diagram'`, `'text'`).
   - `palette`: Dominanteng kulay sa hex at color distribution.
2. **Kontekstwal na Rekomendasyon (`suggest`)**: Deterministikong rekomendasyon para sa target format at kalidad batay sa paglalagyan (`'icon'`, `'photo'`, `'hero'`, `'thumbnail'`, `'logo'`, `'banner'`).
3. **Custom Metadata (`customMetadata`)**: Magkabit ng model IDs, alt text, confidence scores, at bounding boxes sa container headers (WebP `ZAPM` RIFF chunk, PNG `tEXt` chunk, JPEG `COM` marker, SVG `<metadata>`).
4. **Deterministikong Coordinates (`@zapwebp/crop`)**: Buong suporta para sa manual crop coordinates (`{ mode: 'manual', x, y, width, height }`).
5. **Batch Streaming Architecture**: Sumusuporta sa model-in-the-loop streaming pipelines kung saan bawat imahe ay may sariling desisyon.

## Errors

| Error Code | Sanhi | Lunas |
|---|---|---|
| `E_CORRUPT_HEADER` | Sira o putol ang bytes ng imahe bago suriin. | Tiyaking buo ang file bago tumawag sa `inspect`. |
| `E_DIMENSION_EXCEEDED` | Lumagpas ang dimensyon sa 4096×4096 px limit. | Bawasan ang laki ng imahe bago iproseso. |
| `E_PLUGIN_SANDBOX_VIOLATION` | Sinubukan ng AI plugin na mag-access sa file system o network nang walang pahintulot. | Ideklara ang `permissions: ["network"]` sa `package.json`. |
| `E_UNSAFE_SVG` | May script o active event handler ang SVG vector. | Linisin ang SVG bago suriin. |

## For agents

```json
{
  "topic": "AI Integration & Smart Layer",
  "philosophy": "Zero-AI Core; Developer-Owned Intelligence",
  "primitives": {
    "inspect": {
      "returns": ["format", "width", "height", "hasAlpha", "bytes", "metadata", "content", "palette", "suggestions"],
      "contentSignals": ["edgeDensity", "colorCount", "sharpness", "luminanceMean", "luminanceVariance", "transparencyCoverage", "estimatedType", "estimatedTypeConfidence"],
      "palette": ["dominant", "colors"]
    },
    "suggest": {
      "signature": "suggest(info: InspectResult, useCase?: string): Suggestion[]",
      "useCases": ["icon", "photo", "hero", "thumbnail", "logo", "banner", "general"]
    },
    "customMetadata": {
      "description": "Arbitrary key-value metadata attached to output image container",
      "supportedContainers": ["webp", "png", "jpeg", "svg"]
    },
    "crop": {
      "module": "@zapwebp/crop",
      "mode": "manual",
      "parameters": ["x", "y", "width", "height"]
    }
  },
  "rules": [
    "Zapwebp core never imports AI libraries or executes neural network inference.",
    "Vision models operate outside the core engine and pass parameters via ConvertOptions.",
    "Custom metadata survives container serialization and is extractable via inspect()."
  ]
}
```

## Related

- [Core Engine API Reference](/sdk/core)
- [Plugin Development & Sandboxing](/sdk/plugin)
- [Crop Transform Plugin](/plugins/crop)
- [Error Dictionary](/errors)
