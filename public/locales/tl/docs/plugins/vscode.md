# VS Code Extension

Covers: opisyal na VS Code extension sa Open VSX Registry: conversion nang direkta sa editor, retina multipliers (@1x/@2x/@3x), at local WASM execution.

Does not cover: IntelliJ o Vim extensions.

Applies to: Zapwebp VS Code Extension v1.0.0 at mas bago.

## Quick start

I-install ang `zapwebp` extension mula sa Open VSX Registry o VS Code Extensions tab.
I-right-click ang anumang imahe sa file explorer at piliin ang **Convert to WebP**.

## What it does

Nagbibigay-daan ang extension sa mga developer na mag-convert at mag-resize ng mga imahe nang direkta sa loob ng kanilang editor nang hindi binubuksan ang terminal o browser. Tumatakbo ito nang mabilis gamit ang WebAssembly at pinapanatili ang aninag nang 100%.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CONVERSION_FAILED` | Nabigo ang pag-convert sa loob ng editor runtime | Suriin ang output tab para sa teknikal na detalye |

## For agents

```json
{
  "extension": "zapwebp",
  "registry": "Open VSX Registry",
  "publisher": "zapwebp",
  "features": ["contextMenu", "wasmExecution", "retinaMultipliers"]
}
```

## Related

- [CLI](/cli): Katulad na functionality para sa terminal at command-line workflows.
- [Overview](/docs): Pangkalahatang balangkas ng arkitektura ng Zapwebp.
