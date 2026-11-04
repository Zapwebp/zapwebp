# Skills.md — Zapwebp

## 1. Languages & Frameworks (with versions)

- **Node.js** >=22.0.0 (Target runtime across all workspace packages and servers)
- **JavaScript** (ES2023 / Dual CommonJS & ESM modules)
- **TypeScript** ^5.7.0 (Strict mode type definitions, interface contracts, and schema declarations)
- **Rust** 1.80+ (Underlying vector rasterization engine via `@resvg/resvg-js`)
- **WebAssembly (WASM)** (In-browser isolated compilation target for client-side conversions)
- **HTML5 & CSS3** (Vanilla web standards, zero client framework runtime)
- **Express** v4.21.2 (HTTP REST routing & static file serving)

---

## 2. Libraries & Tools (and architectural justification)

- `sharp` (^0.33.5) — High-performance libvips wrapper for raster encoding, decoding, resizing, and metadata stripping.
- `@resvg/resvg-js` (^2.6.2) — Native Rust-based SVG rasterizer ensuring compliant, vector-pure alpha rendering without browser DOM dependency.
- `@modelcontextprotocol/server` (^2.4.0) — Official SDK for exposing standard JSON-RPC tools, prompts, and resources to AI agent runtimes.
- `zod` (^4.0.0) — Strict runtime validation and JSON-schema generation for MCP tool inputs.
- `multer` (^2.5.0) — In-memory streaming multipart file upload parsing.
- `@kitelet/core` (^1.0.0) — Framework-free, HTML-first client toolkit for reactive document components.
- `marked` (^18.1.2) — Lightweight, fast Markdown to HTML parser for agentic documentation rendering.
- `esbuild` (^0.25.0) — Ultra-fast bundler for VS Code extension packaging.
- `@changesets/cli` (^2.29.8) — SemVer automated versioning and package release governance.
- `@zapwebp/shared` — Canonical types, supported format matrices, MIME lookup tables, i18n dictionaries, and URL helpers.
- `@zapwebp/ui` — Universal error and upload UI kit, design system tokens, 4 presets, 4 notification primitives, 3 upload components, localized error mappings with auto-retry, and framework adapters (React, Vue, Svelte, Blade, Vanilla).
- `@zapwebp/features` — Modular vertical slices: pure convert state machine, worker dispatcher, batch manager, clean service, and multipliers.
- `@zapwebp/config` — Shared ESLint rules (forbidding hex colors and restricting downward-only imports) and TypeScript base configs.
- `@zapwebp/sdk` — Official JS/TS developer SDK enabling zero-config offline execution and remote edge API client integration.
- `@zapwebp/plugin-sdk` — Contract and lifecycle manager for community and first-party framework integrations.
- `zapwebp-vite` — First-party Vite plugin for zero-config SVG-to-WebP build-time conversion with Retina multipliers (@1x/@2x/@3x), alpha verification, and manifest generation.
- `zapwebp-next` — First-party Next.js plugin for zero-config SVG-to-WebP build-time conversion with Retina multipliers (@1x/@2x/@3x), alpha verification, and next/image compatibility.
- `zapwebp-github-action` — First-party GitHub Action for automated CI SVG-to-WebP conversion, verification (`check` mode), and PR commenting.
- `@zapwebp/storage` — First-party cloud storage adapters (Supabase, Firebase, Neocities) providing pre-upload conversion, alpha safety, delete cascades, and multi-scale generation.
- `@zapwebp/crop` — Pure transform crop plugin providing auto-crop (aspect ratios, gravity anchors, face detection), manual coordinate slicing, cover/contain fits, and named platform presets.
- `@zapwebp/edge` — High-performance edge runtime and fetch handler for serverless and edge networks (Cloudflare Workers, Vercel Edge) enforcing target lock ingestion contracts.
- `@zapwebp/lens` — Read-only image inspection suite with chunk analysis, alpha mask inspection, and browser-based checkerboard viewer.
- `fflate` (^0.8.3) — Ultra-fast, lightweight streaming ZIP compression and decompression for in-browser client-side downloads and CLI export archives.
- `ignore` (^7.0.14) — Standard gitignore pattern matcher evaluating 3-layer ignore hierarchy and file candidate scoping.

---

## 3. Domain Model

- **Entities**:
  - `ImageInput`: In-memory Buffer or stream with intrinsic dimensions, detected format, and optional alpha channel.
  - `RawImage`: Uncompressed RGBA pixel buffer (`Uint8ClampedArray` with width and height) for format-agnostic pixel manipulation.
  - `ConversionOptions`: Quality (0–100), effort (0–9), width/height bounds, fit mode, lossless flag, background color.
  - `ConversionResult`: Encoded Buffer, format, output width/height, byte size, and alpha preservation flag.
  - `CleanCertificate`: Cryptographic JSON receipt containing input/output SHA-256 hashes, stripped metadata categories, and timestamp.
- **Business Rules**:
  - Alpha preservation is mandatory on alpha-capable outputs (`webp`, `png`, `avif`).
  - Flattening transparent images to JPEG requires an explicit background color (default `#ffffff`); implicit alpha dropping is forbidden (`E_ALPHA_NOT_REPRESENTABLE`).
  - SVG active scripts (`<script>`, inline `on*`), external resources (`href`, `src`, `url()`), and DOCTYPE/entities are strictly rejected.
  - Maximum image resolution is bounded at 4096 × 4096 pixels (16M pixels) to prevent pixel-flood DoS.
  - Output file writing must be atomic via temporary UUID files.
- **Glossary**:
  - **Alpha**: The 4th image channel representing opacity (0 = transparent, 255 = fully opaque).
  - **Lossless**: Pixel-identical compression mode preserving exact source pixels.
  - **Lossy**: Perceptually tuned compression reducing byte weight.
  - **MCP**: Model Context Protocol enabling AI assistants to invoke image conversion tools directly.
  - **Target Lock**: Ingestion mode forcing all incoming image assets to be encoded to a single canonical format.

---

## 4. Skills Required for Contributors

Contributors, architects, and AI agents working on Zapwebp require proficiency across the following technical domains:

### 4.1 TypeScript & Modern Node.js Architecture
- Dual CommonJS and ESM packaging (`exports` map with `import` and `require` conditions).
- Strict TypeScript declarations (`.d.ts`), generics, and type narrowing.
- High-performance asynchronous stream processing, `ArrayBuffer`, and `TypedArray` (`Uint8ClampedArray`) handling.
- Event-driven state machines and worker thread messaging.

### 4.2 WebAssembly (WASM) & Low-Level Image Processing
- In-browser execution of compiled C/Rust binaries in memory without filesystem access.
- Understanding image container formats, headers, chunks, magic bytes, and ICC color profiles.
- Raw RGBA pixel buffer slicing, stride calculation, and bilinear interpolation.

### 4.3 Rust & Native Vector Rendering
- SVG specification compliance (paths, viewports, clip paths, linear/radial gradients).
- Memory-safe vector rasterization using `@resvg/resvg-js`.
- Preventing memory leaks across the Node-to-Rust native addon boundary.

### 4.4 CLI Engineering & Terminal Interaction Design
- Non-blocking terminal I/O, cursor control, and ANSI escape sequences.
- Interactive terminal selectors using `node:readline`.
- Atomic file system operations (write-to-temp-then-rename) with cross-platform resilience (Windows long paths, locking retries on `EBUSY`, Android Termux fsync overrides).
- Reversible transaction journal design (undo/redo engines).

### 4.5 Security Auditing & Defensive Programming
- XML/SVG attack vector mitigation: XML External Entity (XXE) attacks, Billion Laughs entity expansion, `<foreignObject>` HTML injection.
- Server-Side Request Forgery (SSRF) defense: validating and filtering private, loopback, and link-local IP addresses in URL fetchers.
- Memory exhaustion and decompression bomb mitigation: enforcing strict byte size and pixel dimension limits prior to full decompression.

### 4.6 Enterprise Architecture & Code Quality
- ADM (Architecture Development Method) discipline: requirements &rarr; architecture &rarr; implementation &rarr; governance.
- Strict test-driven verification using `node:test` (100% passing tests required before merge).
- Semantic Versioning (SemVer 2.0.0) and Keep a Changelog documentation.

### 4.7 HCI, Accessibility & Internationalization (i18n)
- Minimalist, symbol-first product design ("No text where a symbol works. Drop. Convert. Done.").
- WCAG 2.2 AA accessibility: keyboard focus rings, high contrast, reduced-motion media queries.
- Catalog-based multi-lingual localization (`locales/en/`, `locales/tl/`) with zero unescaped strings.

---

## 5. Skills Explicitly Out of Scope

To prevent architectural bloat and maintain a razor-sharp product focus, the following are strictly out of scope:
- **No heavy client-side frameworks** (React, Angular, Vue, Next.js) in the web app: the web interface remains zero-dependency HTML5/CSS3/vanilla JS.
- **No remote database or session management**: no Postgres, MongoDB, Redis, or user login systems.
- **No remote image storage servers**: no central asset storage; conversion runs locally.
- **No third-party advertising or commercial tracking SDKs**: zero telemetry guarantee.
- **No speculative features**: no complex video editing, 3D modeling, or generative image synthesis.
