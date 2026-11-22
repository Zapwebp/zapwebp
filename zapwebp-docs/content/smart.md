# Smart Content Optimization

Covers: Deterministic pixel buffer analysis, Sobel edge density detection, color quantization, alpha channel coverage, gradient smoothness scoring, 10 automatic content profiles, CLI `--smart` and `--explain`, REST API `/smart`, and MCP `apply_smart`.

Does not cover: External machine learning models, cloud vision APIs, neural network inferencing, or non-deterministic heuristic guessing.

Applies to: Zapwebp v2.19.0 and later.

## Quick start

Enable intelligent, deterministic format and quality optimization on any image:

```bash
# Automatically optimize format and quality based on pixel characteristics
zap photo.png --smart

# Dry-run analysis with detailed explanation of signals and classification
zap logo.png --smart --explain --dry-run
```

Invoke Smart Optimization in the Node.js / Core SDK:

```javascript
import { convertImage, analyzeSmart } from '@zapwebp/core';

// 1. Inspect content signals and profile
const signals = await analyzeSmart(buffer);
console.log(signals.contentType, signals.recommendation);

// 2. Convert using smart recommendation
const result = await convertImage(buffer, { smart: true });
```

Or invoke via AI Agent MCP Tool:

```json
{
  "name": "apply_smart",
  "arguments": {
    "filePath": "assets/hero.png",
    "explain": true
  }
}
```

## What it does

Zapwebp Smart Optimization analyzes raw RGBA pixel buffers in memory using deterministic math—never external neural networks or cloud vision APIs. It extracts five structural signals to classify the image into one of 10 deterministic profiles and applies the exact format, quality, and compression mode recommended for that profile.

### 1. Structural Signal Analysis

- **Edge Density (Sobel 3×3):** Computes pixel intensity gradients to distinguish continuous-tone photographic imagery from flat shapes and crisp text lines.
- **Unique Color Quantization:** Counts palette depth across 16-bit color buckets to identify vector graphics, screenshots, or rich photography.
- **Alpha Coverage:** Measures transparency percentage across all pixels to protect icons, UI elements, and logos.
- **Gradient Smoothness:** Evaluates second-order gradient changes to avoid banding in smooth backgrounds and UI gradients.
- **Aspect Ratio & Resolution:** Classifies banners, heroes, thumbnails, and icons based on dimensional criteria.

### 2. The 10 Content Profiles

| Profile | Typical Asset | Format | Quality | Lossless |
|---|---|---|---|---|
| `photo` | Camera photos, real-world scenes | `avif` | 80 | No |
| `photo_text` | Photos with overlaid typography | `webp` | 85 | No |
| `icon` | Favicons, small symbols, UI glyphs | `webp` | 90 | Yes |
| `logo` | Brand logos, typography graphics | `webp` | 95 | Yes |
| `screenshot` | Software UI, documentation captures | `webp` | 85 | No |
| `diagram` | Flowcharts, wireframes, technical line art | `png` | 100 | Yes |
| `graphic_alpha`| Cutout illustrations with transparency | `webp` | 90 | Yes |
| `thumbnail` | Small previews (< 300px) | `webp` | 75 | No |
| `hero` | Large prominent headers (> 1600px) | `avif` | 82 | No |
| `banner` | Wide aspect headers (aspect ratio > 2.2) | `avif` | 80 | No |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_SMART_UNSUPPORTED` | Input image buffer cannot be decoded into raw RGBA pixels | Verify input format or use standard explicit options (`--to`, `--quality`) |
| `E_DIMENSION_LIMIT` | Input dimensions exceed 4096×4096 for pixel analysis | Downscale the asset before smart classification or pass explicit options |
| `E_ALPHA_CONFLICT` | Smart profile requires alpha preservation but output target cannot support transparency | Supply an explicit `--background` color or allow target WebP/AVIF/PNG |

## For agents

```json
{
  "capability": "smart-optimization",
  "tool": "apply_smart",
  "parameters": {
    "filePath": { "type": "string", "description": "Local path to source image" },
    "explain": { "type": "boolean", "default": true }
  },
  "contentProfiles": [
    "photo",
    "photo_text",
    "icon",
    "logo",
    "screenshot",
    "diagram",
    "graphic_alpha",
    "thumbnail",
    "hero",
    "banner"
  ],
  "signals": [
    "edgeDensity",
    "uniqueColors",
    "alphaRatio",
    "gradientSmoothness",
    "aspectRatio",
    "isLandscape",
    "hasAlpha"
  ]
}
```

## Related

- [Conversion Policy](/policy) — Team policy validation and governance rules.
- [Lossless Mode](/lossless) — Exact pixel preservation guidelines.
- [Performance & Reports](/reports) — Track cumulative bandwidth and carbon savings.
- [Formats Reference](/formats) — Comprehensive format matrix and features.
