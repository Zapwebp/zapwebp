# Background Preservation & Flattening

Covers: Three background conversion states, transparent-to-transparent alpha preservation, opaque-to-opaque background preservation, transparent-to-opaque boundary safe flattening, structured error E_ALPHA_NOT_REPRESENTABLE, CLI --background flag, Storage adapter defaultBackground, and Web UI checkerboard preview controls.

Does not cover: Artificial background removal, magic chroma keying, or hallucinated transparency.

Applies to: Zapwebp v1.1.0 and later.

## Quick start

Preserve alpha transparency when converting SVG or PNG to WebP:

```bash
npx zapwebp logo.svg --to webp
```

Safely flatten onto an explicit background color when converting transparent assets to JPEG:

```bash
npx zapwebp logo.svg --to jpeg --background "#ffffff"
```

Or configure a deterministic background color once for your entire project in `zapwebp.json`:

```json
{
  "background": "#ffffff"
}
```

## What it does

**Zapwebp is not a background remover. It is a background respecter.** It does not invent transparency where none existed, and it strictly prevents accidental transparent-to-opaque black box corruption.

Every conversion falls into one of three deterministic states:

### 1. Transparent to Transparent (The Clean Path)
* **Input:** SVG or PNG with an alpha channel.
* **Target:** WebP, PNG, AVIF, or SVG.
* **Behavior:** Alpha transparency is preserved pixel for pixel.
* **Output:** `transparency: 'preserved'`, `alphaPreserved: true`.

### 2. Opaque to Opaque (The Safe Path)
* **Input:** JPEG, BMP, or PNG without alpha (or a solid background).
* **Target:** JPEG, WebP, PNG, or AVIF.
* **Behavior:** Zapwebp never guesses or strips solid pixels. Solid backgrounds are preserved exactly as they are.
* **Output:** `transparency: 'preserved_opaque'`, `backgroundStatus: 'preserved_opaque'`.

### 3. Transparent to Opaque (The Boundary)
* **Input:** SVG or PNG with an alpha channel.
* **Target:** JPEG (which cannot store an alpha channel).
* **Behavior:** The engine **refuses to default to black**. It fails loudly with structured error `E_ALPHA_NOT_REPRESENTABLE` unless an explicit `--background` color is provided or declared in project configuration.
* **Output:** `transparency: 'flattened'`, `flattenColor: '#ffffff'`.

### Surface Implementations

#### 1. Command Line Interface (CLI)
```bash
# Refuses to produce black background:
npx zapwebp logo.svg --to jpeg
# ⚡ zap! JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.
#    → Pass --background "#ffffff" or choose WebP/PNG/AVIF.

# Flattens cleanly:
npx zapwebp logo.svg --to jpeg --background "#ffffff"
```

#### 2. Storage Adapters (`@zapwebp/storage`)
```typescript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const zap = withZapwebp(supabaseAdapter(client), {
  targetFormat: 'jpeg',
  defaultBackground: '#ffffff', // Automatically flattens transparent inputs onto white
});

await zap.upload('avatars', 'user.svg', svgBuffer);
```

#### 3. Model Context Protocol (`@zapwebp/mcp`)
When an AI agent requests JPEG output for a transparent file without passing a background color, `convert_image` returns an actionable diagnostic error:
```json
{
  "error": "E_ALPHA_NOT_REPRESENTABLE",
  "message": "JPEG cannot store transparency. Retry with background:'#ffffff' to flatten, or choose to:'webp'/'png'/'avif'.",
  "suggestedFix": {
    "background": "#ffffff"
  }
}
```

#### 4. Web Application
The web app displays a transparency checkerboard behind transparent previews. When JPEG is selected, the cockpit reveals a background color picker (defaulting to `#FFFFFF`) and updates the preview immediately.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_ALPHA_NOT_REPRESENTABLE` | Converting a transparent image (SVG/PNG) to JPEG without an explicit background color. | Pass `--background "#ffffff"`, set `"background": "#ffffff"` in `zapwebp.json`, or choose WebP/PNG/AVIF. |
| `alpha_loss_forbidden` | Legacy alias for `E_ALPHA_NOT_REPRESENTABLE`. | Provide an explicit `--background` or select an alpha-capable target format. |

## For agents

```json
{
  "contract": "background_preservation_and_flattening",
  "states": [
    {
      "name": "transparent_to_transparent",
      "inputAlpha": true,
      "outputFormat": ["webp", "png", "avif"],
      "action": "preserve_alpha",
      "alphaPreserved": true
    },
    {
      "name": "opaque_to_opaque",
      "inputAlpha": false,
      "outputFormat": ["jpeg", "webp", "png", "avif"],
      "action": "preserve_background",
      "alphaPreserved": false
    },
    {
      "name": "transparent_to_opaque_boundary",
      "inputAlpha": true,
      "outputFormat": ["jpeg"],
      "action": "flatten_or_fail",
      "failureCode": "E_ALPHA_NOT_REPRESENTABLE",
      "suggestedFix": {
        "background": "#ffffff"
      }
    }
  ],
  "configurationKeys": [
    "background",
    "defaultBackground"
  ]
}
```

## Related

* [Convert](/convert.md) — Core raster and vector conversion pipeline.
* [Safety](/safety.md) — Transparency guarantees and SVG security gates.
* [Target Lock](/lock-target.md) — Many-to-one ingestion architecture and strict contracts.
* [Errors](/errors.md) — Complete error catalog with root cause analysis.
