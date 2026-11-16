# Core Engine Freeze

Covers: Arkitektura ng freeze-and-extend, ang pitong opisyal na core functions, limang interfaces, limang antas ng arkitektura, sampung disiplina sa pagpapatatag, at pagsunod sa mga pamantayang ISO 25010/27001/27017/27018.

Does not cover: Mga configuration ng application layer, UI widgets, o mga storage adapter. Tingnan ang [Storage Adapters](/plugins/storage) at [UI Kit](/ui).

Applies to: `@zapwebp/core` v1.0.0 at lahat ng mga downstream package.

## Quick start

```bash
npm i @zapwebp/core
```

```javascript
import {
  convert,
  inspect,
  registerFormat,
  registerMetadataHandler,
  registerTransform,
  getVersion,
  getFormats,
} from "@zapwebp/core";

// 1. Pagsusuri sa mga byte ng imahe nang hindi nagko-convert
const info = await inspect(imageBytes);

// 2. Pure bytes-to-bytes conversion na walang ambient state
const outputBytes = await convert(imageBytes, {
  to: "webp",
  quality: 85,
  clean: true,
});

console.log(`Bersyon ng Core: v${getVersion()}`);
```

## What it does

Ang Zapwebp Core ay ang hindi nababagong (immutable) pundasyon ng buong ekosistema. Ipinapatupad nito ang doktrinang **freeze-and-extend**: humihinto ang pagbabago sa core upang ang ekosistema ng mga plugin at integration ay lumago nang walang anumang breaking change.

### Ang Limang Antas ng Arkitektura

1. **Layer 5: Applications** — Web converter, CLI, MCP agent server, VS Code extension, Laravel bridge, docs.
2. **Layer 4: Features** — Batch engine, responsive multipliers, AI-aware cropping, metadata scrubbing.
3. **Layer 3: Plugin SDK** — `FormatHandler`, `StorageAdapter`, `MetadataHandler`, `TransformStep`, `ZapwebpPlugin`.
4. **Layer 2: Core Engine (FROZEN)** — Pipeline orchestrator (`decode → transform → encode`), safety parser, transaction journal, format registry.
5. **Layer 1: WASM Modules** — Pure WebAssembly binaries (`@resvg/resvg-wasm`, `@jsquash/*`).

### Ang Pitong Pampublikong Function at Limang Interface

Ang pampublikong kontrata ng `@zapwebp/core` ay opisyal na nakakandado sa pitong function:

1. `convert(input, options)`: Pure bytes-in, bytes-out transformation.
2. `inspect(input)`: Pagsusuri sa format, sukat, alpha, at metadata.
3. `registerFormat(handler)`: Pagdaragdag ng mga bagong format ng imahe.
4. `registerMetadataHandler(handler)`: Tagapamahala ng pagsusuri at paglilinis ng metadata.
5. `registerTransform(transform)`: Pasadyang hakbang sa pagmamanipula ng imahe.
6. `getVersion()`: Nagbabalik ng immutable na bersyon ng core.
7. `getFormats()`: Naglilista ng lahat ng aktibong format.

Ang limang interfaces: `ConvertOptions`, `InspectResult`, `FormatHandler`, `MetadataHandler`, at `TransformStep`.

### Ang Sampung Disiplina sa Pagpapatatag

- **Zero External Dependencies**: Purong TypeScript at WASM lamang.
- **Zero I/O sa Core**: Walang pagbasa o pagsulat sa filesystem o network sa loob ng core.
- **Zero Config Files**: Tumatanggap lamang ng tahasang options bilang arguments.
- **Deterministic Output**: Parehong input at options = magkaparehong output na may cryptographic SHA-256 hash.
- **Walang Silent Failures**: Bawat error ay nagbabalik ng structured `ZapwebpError` na may code, mensahe, at gabay sa pag-aayos.
- **Mataas na Test Coverage**: 95%+ coverage sa buong engine.
- **Hindi Nalalampasang Safety Chain**: Sapilitang sinusuri ang bawat input laban sa mga panganib bago i-decode.
- **Zero Telemetry**: Pisikal na walang kakayahang magpadala ng data sa internet.
- **Pagkakapantay-pantay sa Lahat ng Platform**: Parehong resulta sa Windows, macOS, Linux, Android, WASM, at Edge.
- **Mahigpit na Semantic Versioning**: Ang pampublikong API ay sagradong kontrata.

## Errors

| Code                   | Dahilan                                      | Solusyon                                                   |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| `E_EMPTY_FILE`         | Walang laman ang byte array (0 bytes)        | Suriin ang source ng file bago i-convert                   |
| `E_CORRUPT_HEADER`     | Putol o sira ang file header                 | I-verify ang integridad ng file                            |
| `E_UNSAFE_SVG`         | Naglalaman ang SVG ng active scripts o XXE   | Alisin ang mga script bago magpatuloy                      |
| `E_TOO_LARGE`          | Lumampas ang sukat sa maxInputBytes          | Liitan ang imahe o baguhin ang limitasyon                  |
| `E_UNSUPPORTED_FORMAT` | Hindi rehistrado ang format sa core registry | Magrehistro ng format handler gamit ang `registerFormat()` |

## For agents

```json
{
  "module": "@zapwebp/core",
  "architecture": "enterprise-frozen-core",
  "contract": {
    "functions": [
      "convert",
      "inspect",
      "registerFormat",
      "registerMetadataHandler",
      "registerTransform",
      "getVersion",
      "getFormats"
    ],
    "interfaces": [
      "ConvertOptions",
      "InspectResult",
      "FormatHandler",
      "MetadataHandler",
      "TransformStep"
    ]
  },
  "disciplines": [
    "zero-deps",
    "zero-io",
    "zero-config",
    "deterministic-hash",
    "fail-loud",
    "safety-chain-enforced"
  ],
  "standards": [
    "ISO/IEC 25010:2023",
    "ISO/IEC 27001:2022",
    "ISO/IEC 27017:2015",
    "ISO/IEC 27018:2019"
  ]
}
```

## Related

- [Stability](/stability): Global error boundaries at graceful degradation.
- [Performance](/performance): Performance budgets at memory isolation.
- [Security](/security): Pagsunod sa mga pamantayan sa seguridad.
- [Plugin SDK](/sdk/plugin): Paano gumawa ng mga plugin sa ibabaw ng frozen core.
- [Errors](/errors): Kumpletong listahan ng mga error code.
