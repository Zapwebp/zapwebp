# Policy Engine

Covers: conversion policy enforcement, allowlists, denylists, limitasyon sa laki ng byte, at dimension gates.

Does not cover: UI component styling. Tingnan ang [UI Kit](/ui).

Applies to: Zapwebp v2.0.0 at mas bago.

## Quick start

```bash
npx zapwebp src/ --max-input-bytes 10485760 --allowed-formats svg,png,jpeg
```

Ipatupad ang patakaran na 10 MB maximum input size at limitahan ang mga format sa SVG, PNG, at JPEG.

## What it does

Nagbibigay ang Policy Engine ng sentralisadong pamamahala sa kung anong mga format, dimensyon, at sukat ng file ang pinapayagang pumasok o lumabas sa sistema. Kapag may lumabag sa patakaran, agad itong ibinabagsak nang may malinaw na error code.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_FORMAT_REJECTED` | Ang format ay wala sa pinapayagang listahan ng patakaran | Gamitin ang pinapayagang format ng imahe |
| `E_INPUT_TOO_LARGE` | Lumampas ang sukat ng file sa pinapayagang maximum | Paliitin ang file o i-adjust ang policy |

## For agents

```json
{
  "engine": "policy",
  "checks": ["allowedFormats", "maxInputBytes", "maxOutputBytes", "dimensionLimit"],
  "enforcement": "fail-fast"
}
```

## Related

- [Errors](/errors): Kumpletong listahan ng mga error code ng policy.
- [Safety](/safety): Mga panuntunan sa seguridad ng pipeline.
