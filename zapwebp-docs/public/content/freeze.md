# Core Engine Freeze

Covers: The freeze-and-extend architectural model, the seven canonical core functions, the five interfaces, the five-layer hierarchy, the ten hardening disciplines, and ISO 25010/27001/27017/27018 standards alignment.

Does not cover: Application-layer configurations, UI widgets, or cloud adapter implementations. See [Storage Adapters](/plugins/storage) and [UI Kit](/ui).

Applies to: `@zapwebp/core` v1.0.0 and all downstream consuming packages.

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

// 1. Inspect image bytes without conversion
const info = await inspect(imageBytes);

// 2. Pure bytes-to-bytes conversion with zero ambient state
const outputBytes = await convert(imageBytes, {
  to: "webp",
  quality: 85,
  clean: true,
});

// 3. Inspect frozen engine metadata
console.log(`Zapwebp Core v${getVersion()}`);
console.log(`Active Formats: ${getFormats().join(", ")}`);
```

## What it does

Zapwebp Core is the immutable, zero-dependency foundation of the entire image conversion ecosystem. It enforces a strict **freeze-and-extend** doctrine: the core stops changing so that the ecosystem of plugins and integrations can grow infinitely without breaking changes.

### The Five Enterprise Layers

1. **Layer 5: Applications** — Web converter, CLI, MCP agent server, VS Code extension, Laravel bridge, docs.
2. **Layer 4: Features** — Batch engine, responsive multipliers, AI-aware cropping, metadata scrubbing.
3. **Layer 3: Plugin SDK** — `FormatHandler`, `StorageAdapter`, `MetadataHandler`, `TransformStep`, `ZapwebpPlugin`.
4. **Layer 2: Core Engine (FROZEN)** — Pipeline orchestrator (`decode → transform → encode`), safety parser, transaction journal, format registry.
5. **Layer 1: WASM Modules** — Pure WebAssembly binaries (`@resvg/resvg-wasm`, `@jsquash/*`).

Dependencies point downward only. Layer 2 never imports from Layers 3, 4, or 5.

### The Seven Public Core Functions & Five Interfaces

The public API of `@zapwebp/core` is strictly locked to seven functions and five interfaces:

| Canonical Function          | Signature                                                              | Purpose                                         |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `convert()`                 | `(input: Uint8Array, options?: ConvertOptions) => Promise<Uint8Array>` | Pure bytes-in, bytes-out transformation         |
| `inspect()`                 | `(input: Uint8Array) => Promise<InspectResult>`                        | Inspect format, dimensions, alpha, and metadata |
| `registerFormat()`          | `(handler: FormatHandler) => void`                                     | Open/Closed extensibility for new file formats  |
| `registerMetadataHandler()` | `(handler: MetadataHandler) => void`                                   | Extensible metadata inspector and stripper      |
| `registerTransform()`       | `(transform: TransformStep) => void`                                   | Extensible image manipulation pipeline step     |
| `getVersion()`              | `() => string`                                                         | Returns the immutable core SemVer version       |
| `getFormats()`              | `() => string[]`                                                       | Enumerates all currently registered formats     |

The five frozen interfaces: `ConvertOptions`, `InspectResult`, `FormatHandler`, `MetadataHandler`, and `TransformStep`.

### The Ten Hardening Disciplines

1. **Zero External Dependencies**: Pure TypeScript and WASM runtime only. No ambient network libraries or bulky utilities.
2. **Zero I/O in Core**: Pure mathematical function from `Uint8Array` to `Uint8Array`. No `fs`, `net`, `process.env`, or `window`.
3. **Zero Configuration Files**: Core reads no `.zapwebp.config.json` or environment variables; options are passed explicitly as arguments.
4. **Deterministic Output**: Same input + same options = byte-identical output, cryptographically verified by SHA-256 hash.
5. **No Silent Failures**: Every error throws a structured `ZapwebpError` with error code, message, fix, and documentation link.
6. **Full Test Coverage**: 95%+ coverage with 100% verification across public functions and error codes.
7. **Bypass-Proof Safety Chain**: Ingress validation, SVG sanitization, dimension limits, decode, transform, encode, and egress verification run on every invocation.
8. **Physical Zero Telemetry**: Core contains zero HTTP clients, trackers, beacons, or analytics.
9. **Cross-Platform Parity**: Identical execution across Windows, macOS, Linux, Android, WebAssembly, and Edge runtimes.
10. **Strict Semantic Versioning**: Public surfaces are immutable contracts.

## ISO Standards Alignment

| Standard          | Scope                | Core Implementation                                                                                          |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **ISO/IEC 25010** | Software Quality     | Functional suitability (hash verification), performance (<50ms SVG), compatibility across 6 OS targets.      |
| **ISO/IEC 27001** | Information Security | A.8.1 Asset management, A.9 Access control boundaries, A.10 Cryptographic digests, A.12 Operations security. |
| **ISO/IEC 27017** | Cloud Security       | Clear separation of responsibilities between core transformation and cloud storage adapters.                 |
| **ISO/IEC 27018** | Cloud Privacy        | Data minimization; zero user data retention; in-memory transient processing.                                 |

## Errors

| Code                        | Cause                                                          | Fix                                                        |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `E_EMPTY_FILE`              | Input byte array has a length of 0                             | Verify file stream source before passing to `convert()`    |
| `E_CORRUPT_HEADER`          | Bytes are truncated or do not match any format magic bytes     | Check source integrity or provide complete download        |
| `E_UNSAFE_SVG`              | SVG input contains `<script>`, inline event handlers, or XXE   | Remove active scripts or provide sanitized vector markup   |
| `E_TOO_LARGE`               | Input byte size exceeds configured `maxInputBytes` limit       | Downscale asset or adjust conversion policy limit          |
| `E_OUTPUT_TOO_LARGE`        | Output file size cannot fit within `maxOutputBytes` constraint | Lower quality parameter or reduce image dimensions         |
| `E_UNSUPPORTED_FORMAT`      | Format not registered in the core registry                     | Register format handler using `registerFormat()`           |
| `E_ALPHA_NOT_REPRESENTABLE` | Transparent input targeted to JPEG without background color    | Pass explicit `--background` color or target WebP/PNG/AVIF |

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

- [Stability](/stability): Global error boundaries and graceful degradation.
- [Performance](/performance): Performance budgets and memory isolation.
- [Security](/security): Coordinated vulnerability disclosure and threat defenses.
- [Plugin SDK](/sdk/plugin): How to author format, transform, and storage plugins on top of the frozen core.
- [Errors](/errors): Comprehensive error taxonomy.
