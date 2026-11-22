# Matalinong Pag-optimize ng Nilalaman (Smart Content Optimization)

Covers: Deterministikong pagsusuri ng pixel buffer, pagtukoy sa edge density gamit ang Sobel, color quantization, alpha channel coverage, gradient smoothness scoring, 10 awtomatikong profile ng nilalaman, CLI `--smart` at `--explain`, REST API `/smart`, at MCP `apply_smart`.

Does not cover: Panlabas na machine learning models, cloud vision APIs, neural network inferencing, o di-tiyak na panghuhula.

Applies to: Zapwebp v2.19.0 at mas bago.

## Quick start

Paganahin ang matalinong pag-optimize batay sa katangian ng bawat imahe:

```bash
# Awtomatikong piliin ang pinakamahusay na format at kalidad batay sa pixels
zap photo.png --smart

# Suriin ang mga signal at tingnan ang paliwanag nang hindi nagbabago ng file
zap logo.png --smart --explain --dry-run
```

## What it does

Sinusuri ng Smart Content Optimization ang raw RGBA pixel buffer sa memorya gamit ang tiyak na matematika—hindi kailanman gumagamit ng mga panlabas na neural model o cloud vision API. Tinutukoy nito ang limang estruktural na signal upang maikategorya ang imahe sa isa sa 10 profile (photo, photo_text, icon, logo, screenshot, diagram, graphic_alpha, thumbnail, hero, banner) at inilalapat ang angkop na format, kalidad, at lossless setting.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_SMART_UNSUPPORTED` | Hindi ma-decode ang buffer ng imahe sa raw RGBA pixels | Tiyakin ang format ng input o magpasa ng hayagang opsyon (`--to`, `--quality`) |
| `E_DIMENSION_LIMIT` | Lumampas ang dimensyon ng imahe sa 4096×4096 para sa pagsusuri ng pixel | Paliitin muna ang imahe o magpasa ng hayagang mga opsyon sa conversion |
| `E_ALPHA_CONFLICT` | Kinakailangan ang alpha preservation ngunit hindi ito sinusuportahan ng target format | Magbigay ng `--background` na kulay o pumili ng WebP, AVIF, o PNG |

## For agents

```json
{
  "capability": "smart-optimization",
  "tool": "apply_smart",
  "parameters": {
    "filePath": { "type": "string" },
    "explain": { "type": "boolean", "default": true }
  },
  "profiles": [
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
  ]
}
```

## Related

- [Patakaran ng Conversion (Policy Engine)](/policy) — Pamahalaan ang mga panuntunan ng koponan.
- [Preserbasyon ng Likuran (Backgrounds)](/backgrounds) — Pamamahala ng aninag at alpha channel.
- [Mga Format (Formats)](/formats) — Talaan ng mga sinusuportahang format ng imahe.
