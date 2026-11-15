# VS Code Extension

Covers: opisyal na VS Code extension sa Open VSX Registry: context-aware "Zap" menu na may magic byte format detection, pag-alala sa preference ng gumagamit, conversion nang direkta sa editor, conversion ng buong folder gamit ang mixed formats panel, retina multipliers (@1x/@2x/@3x), at local WASM execution.

Does not cover: IntelliJ o Vim extensions.

Applies to: Zapwebp VS Code Extension v1.3.0 at mas bago.

## Quick start

I-install ang `zapwebp` extension mula sa Open VSX Registry o VS Code Extensions tab.
I-right-click ang anumang imahe sa file explorer at piliin ang **Zap** upang makita ang mga angkop na target formats, o i-right-click ang folder at piliin ang **Zap Folder**.

## What it does

Nagbibigay-daan ang extension sa mga developer na mag-convert at mag-resize ng mga imahe nang direkta sa loob ng kanilang editor nang hindi binubuksan ang terminal o browser. Sinusuri nito ang tunay na format gamit ang magic bytes sa halip na umasa lamang sa extension ng file, at ipinapakita lamang ang mga wastong target format. Naaalala rin nito ang huling piniling format ng user at inuuna ito sa menu. Kasama rin ang pag-scan ng buong folder na may interactive configuration panel. Tumatakbo ito nang mabilis gamit ang WebAssembly at pinapanatili ang aninag nang 100%.

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
  "features": [
    "contextAwareZap",
    "magicByteSniffing",
    "preferenceMemory",
    "mixedMultiSelect",
    "folderConversion",
    "mixedFormatsPanel",
    "subfolderOptIn",
    "contextMenu",
    "wasmExecution",
    "retinaMultipliers"
  ]
}
```

## Related

- [CLI](/cli): Katulad na functionality para sa terminal at command-line workflows.
- [Overview](/docs): Pangkalahatang balangkas ng arkitektura ng Zapwebp.
