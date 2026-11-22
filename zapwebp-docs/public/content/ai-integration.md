# AI Integration

Covers: Building AI-powered image conversion and optimization pipelines using Zapwebp content signals, developer model hooks, manual crop coordinates, and custom metadata.
Does not cover: Internal AI inference or bundled neural models. Zapwebp is 100% deterministic, local, and AI-free.
Applies to: `@zapwebp/core`, `@zapwebp/crop`, `@zapwebp/plugin-sdk`, `@zapwebp/mcp`, and developer vision pipelines (OpenAI, Anthropic Claude, Google Gemini, local Llama, custom models).

## Quick start

```javascript
import { inspect, convert } from '@zapwebp/core';
import { cropTransform } from '@zapwebp/crop';

// 1. Inspect image to extract mathematical content signals
const info = await inspect(imageBytes);
console.log(info.content.estimatedType); // 'photo', 'icon', 'text', 'diagram', etc.
console.log(info.content.colorCount);    // unique colors
console.log(info.palette.dominant);      // e.g. '#8dc63f'

// 2. Call your vision model (outside Zapwebp)
const decision = await myVisionModel.decide(info);

// 3. Convert with custom AI metadata and crop transforms
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

Zapwebp does not import AI libraries, call external AI APIs, or bundle machine learning weights. Instead, it provides the **Smart Layer primitives** that allow developers and autonomous AI agents to build high-performance image pipelines:

1. **Model-Friendly Content Signals (`inspect`)**: Returns mathematical image metrics that vision models can parse without raw byte guesswork:
   - `edgeDensity`: Normalized detail density ($0\dots 1$).
   - `colorCount`: Unique color count across quantized color space.
   - `sharpness`: Laplacian variance normalized focus metric ($0\dots 1$).
   - `luminanceMean` & `luminanceVariance`: Contrast and brightness distribution.
   - `transparencyCoverage`: Fraction of pixels with alpha transparency ($0\dots 1$).
   - `estimatedType`: Deterministic classification (`'photo'`, `'icon'`, `'screenshot'`, `'logo'`, `'diagram'`, `'text'`).
   - `palette`: Dominant hex color and frequency-sorted color distribution.
2. **Contextual Recommendations (`suggest`)**: Deterministic baseline recommendations for target format and quality based on placement context (`'icon'`, `'photo'`, `'hero'`, `'thumbnail'`, `'logo'`, `'banner'`).
3. **Arbitrary Custom Metadata (`customMetadata`)**: Write model identifiers, alt text, confidence scores, and bounding boxes into container headers (WebP `ZAPM` RIFF chunk, PNG `tEXt` chunk, JPEG `COM` marker, SVG `<metadata>`).
4. **Deterministic Coordinates (`@zapwebp/crop`)**: Full support for manual crop coordinates (`{ mode: 'manual', x, y, width, height }`) computed by vision models.
5. **Batch Streaming Architecture**: Supports model-in-the-loop streaming pipelines where every individual file receives tailored options.

### Integration Patterns

#### 1. Auto-Crop with OpenAI Vision (GPT-4o)

```typescript
import OpenAI from 'openai';
import { inspect, convert } from '@zapwebp/core';
import { cropTransform } from '@zapwebp/crop';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function smartCrop(fileBytes: Uint8Array): Promise<Buffer> {
  const info = await inspect(fileBytes);
  const base64 = Buffer.from(fileBytes).toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Locate main subject. Return JSON: {"x": number, "y": number, "width": number, "height": number} in pixels for image ${info.width}x${info.height}.` },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  const crop = JSON.parse(response.choices[0].message.content || '{}');

  return convert(fileBytes, {
    to: 'webp',
    transforms: [
      cropTransform({
        mode: 'manual',
        x: Math.round(crop.x),
        y: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      }),
    ],
    customMetadata: {
      'ai:cropper': 'gpt-4o',
      'ai:subject': 'detected',
    },
  });
}
```

#### 2. Content-Aware Format Selection with Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { inspect, convert, suggest } from '@zapwebp/core';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function smartConvert(fileBytes: Uint8Array): Promise<Buffer> {
  const info = await inspect(fileBytes);
  const baseline = suggest(info, 'hero');

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Image type is "${info.content.estimatedType}" with ${info.content.colorCount} colors and sharpness ${info.content.sharpness}. Baseline suggestion is ${baseline[0].to} at quality ${baseline[0].quality}. Choose final format (webp/avif) and quality (60-95). Return JSON: {"format": "webp"|"avif", "quality": number, "reason": string}.`,
      },
    ],
  });

  const decision = JSON.parse(response.content[0].type === 'text' ? response.content[0].text : '{}');

  return convert(fileBytes, {
    to: decision.format || baseline[0].to,
    quality: decision.quality || baseline[0].quality,
    customMetadata: {
      'ai:optimizer': 'claude-3-5-sonnet',
      'ai:reason': decision.reason,
    },
  });
}
```

#### 3. Decision Caching by SHA-256

Vision model API calls introduce network latency and cost. Cache AI decisions using cryptographic hashes:

```javascript
import { createHash } from 'node:crypto';
import { convert } from '@zapwebp/core';

const cache = new Map();

async function cachedSmartConvert(fileBytes, visionModel) {
  const sha256 = createHash('sha256').update(fileBytes).digest('hex');
  let decision = cache.get(sha256);

  if (!decision) {
    decision = await visionModel.evaluate(fileBytes);
    cache.set(sha256, decision);
  }

  return convert(fileBytes, decision);
}
```

## Errors

| Error Code | Trigger | Remediation |
|---|---|---|
| `E_CORRUPT_HEADER` | Input image bytes are malformed or truncated before analysis. | Verify file complete download before calling `inspect`. |
| `E_DIMENSION_EXCEEDED` | Image dimensions exceed 4096×4096 px limit. | Downscale image before processing or adjust limits policy. |
| `E_PLUGIN_SANDBOX_VIOLATION` | AI plugin attempted unauthorized file system or network access. | Declare `permissions: ["network"]` in `package.json` and request consent. |
| `E_UNSAFE_SVG` | Vector input contains scripts or active event handlers. | Sanitize SVG vectors before vision analysis. |

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
