# About Zapwebp

Zapwebp is an enterprise-grade, transparency-safe image conversion and optimization engine engineered to eliminate the persistent defect of accidental transparency loss in modern software workflows. Operating under the strict product doctrine **"Drop. Convert. Done."**, the platform provides bit-for-bit alpha preservation, deterministic format encoding, zero telemetry, and memory-only execution across web browsers, developer terminals, AI agent protocols, code editors, and cloud integration pipelines.

Zapwebp is maintained by **Eldrex Delos Reyes Bula** in the Republic of the Philippines and is distributed globally under the permissive open-source **MIT License**.

---

## Project Origins & Evolution

### The Inception: The "Black Background Bug" (Late 2025)

The genesis of Zapwebp stems from a pervasive, long-standing issue in image processing software: the silent destruction of alpha transparency channels. Developers, designers, and content authors frequently observed that when transparent vector assets (such as SVG icons, UI badges, and brand logos) or transparent PNGs were converted using conventional command-line utilities (like legacy ImageMagick configurations or naive HTML5 Canvas rendering scripts), the transparent regions were composited onto an uninitialized default canvas—rendering as solid black boxes (RGB 0, 0, 0).

This defect corrupted production assets, wasted developer hours in manual remediation, and created substantial visual regressions in dark-mode and custom-themed web applications.

To permanently solve this problem, Zapwebp was created as a lightweight, single-purpose SVG-to-WebP converter operating 100% in local browser memory. By directly calculating alpha channel bounds and avoiding implicit flattening, Zapwebp guaranteed zero black backgrounds without requiring manual command flags, account creation, or file uploads.

### Evolution to a Multi-Format Engine (v1.x)

As adoption expanded, developers demanded identical transparency preservation across the full spectrum of image formats used on the web. The core conversion layer was decoupled into an independent engine (`@zapwebp/core`), combining the high-speed Rust-based SVG rasterizer (`@resvg/resvg-js`) with `libvips` (`sharp ^0.35.5`) for native raster operations, alongside WebAssembly (WASM) for client-side browser execution.

The format matrix expanded to support comprehensive two-way conversions across:
- **Scalable Vector Graphics (SVG)**: Strict XML validation, entity sanitization, and variable-scale rasterization.
- **Portable Network Graphics (PNG)**: Full 8-bit and 16-bit alpha channel preservation.
- **WebP**: Lossy and lossless modes with alpha chunk validation.
- **AVIF**: Next-generation high-compression format with complete alpha support.
- **JPEG**: Opaque standard format requiring explicit background color declaration before flattening.
- **GIF & TIFF**: Animated and multi-layer format decoding with transparency detection.

Critically, Zapwebp established a strict security and safety invariant: **transparent images are never silently flattened to opaque formats**. Converting a transparent image to JPEG immediately halts with `E_ALPHA_NOT_REPRESENTABLE` unless the developer explicitly provides a background matte color (e.g. `--background "#ffffff"`), preventing silent data loss.

### Expanding Across the Developer Toolchain

Recognizing that modern engineering teams operate across diverse surfaces, Zapwebp transitioned from a web utility into a unified image infrastructure platform:

1. **Terminal CLI (`zap` / `zapwebp`)**: Single file, batch globbing, watch mode, multiplier scale generation (`@1x`, `@2x`, `@3x`), responsive HTML `srcset` output, and reversible undo/redo transaction journals persisted in `.zapwebp/journal/`.
2. **AI Agent Protocol (`@zapwebp/mcp`)**: A dedicated Model Context Protocol server exposing 15 structured tools, 6 prompts, and 7 resources over stdio and SSE, allowing autonomous AI coding assistants (Claude Desktop, Cursor, Windsurf, Antigravity) to inspect, optimize, and convert project images safely.
3. **Editor Integration (`ebula.zapwebp-vscode`)**: Published to both the Open VSX Registry and Visual Studio Marketplace, providing right-click "Zap" context menus, file format sniffing via magic bytes, preference memory, and batch folder conversion.
4. **Cloud Storage Adapters (`@zapwebp/storage`)**: First-party adapters for Supabase Storage, Firebase Storage, and Neocities, executing in-memory pre-upload conversion and cascading scale deletions under a defined Shared Responsibility Model.
5. **Framework Integrations**: Dedicated build-time plugins for Vite (`zapwebp-vite`), Next.js (`zapwebp-next`), and Laravel (`zapwebp/laravel`).

### Modern Enterprise Architecture & Platform Maturity (v2.x – v2.28.0)

Throughout the v2.x lifecycle, Zapwebp underwent a comprehensive Enterprise Architecture transformation, adhering to ISO/IEC 25010 (software quality) and ISO/IEC 27001/27017 (information security) standards:

- **Target Lock Architecture (`@zapwebp/lock`)**: Enforces canonical many-to-one ingestion contracts across edge handlers and APIs, guaranteeing zero generational quality loss and skipping redundant reconversions.
- **Clean Mode Metadata Scrubbing**: Eliminates privacy leaks and AI tracking fingerprints by stripping EXIF, GPS coordinates, camera serials, and C2PA Content Credentials, issuing verifiable SHA-256 Clean Certificates.
- **Smart Optimization Engine**: Implements deterministic pixel buffer analysis, edge density detection, and 10 automatic format and quality profiles.
- **Bit-Exact Lossless Verification**: Mathematically validates output pixel fidelity against transformed sources.
- **Original File Deletion Opt-In Architecture**: Strictly disabled by default; allows voluntary source asset deletion only with explicit consent, backed by SHA-256 pre-verification and 30-day reversible backup trees in `.zapwebp/backups/`.
- **Specialized Format Plugins**: High-resolution multi-size ICO/CUR container generation and favicon suite creation (`@zapwebp/format-ico`), and intelligent binary-search byte constraint compression with adaptive Lanczos3 downscaling (`@zapwebp/compressor`).
- **Universal Documentation Delivery Engine (`@zapwebp/docs`)**: A zero-dependency, zero-framework documentation delivery engine that transforms Markdown files into static, bot-crawlable HTML, byte-exact `.md` context mirrors for AI crawlers, XML sitemaps, and `llms.txt` directories.
- **Multi-Tier Concurrency & Atomic Rate Limiting**: Multi-instance file-backed sliding window rate limiters (`.zapwebp/ratelimit.json`), cross-surface session managers (`.zapwebp/session.json`), and worker pool semaphores.

---

## Architectural Principles

Zapwebp's engineering philosophy is anchored in six foundational principles:

| Principle | Meaning & Implementation |
|---|---|
| **Drop. Convert. Done.** | Zero signup requirements, zero paywalls, zero ads, and zero telemetry. Conversions execute immediately without unnecessary ceremony. |
| **Fail Loudly** | Silence is a defect. If an alpha channel cannot be preserved, if an SVG contains suspicious active content, or if an output exceeds byte limits, the engine halts immediately with a structured, actionable error code. |
| **Minimum Sufficient Architecture** | Built with zero bloated dependencies. Core logic uses native Web APIs, standard CJS/ESM modules, and proven libvips/Rust bindings. Every abstraction must trace directly to a verified requirement. |
| **Zero Telemetry & Local Execution** | Conversions in the browser execute 100% inside client-side RAM via WASM; files never touch remote Zapwebp servers. CLI, MCP, and SDK workflows operate entirely on the developer's local filesystem with zero phone-home network requests. |
| **Strict Downward Dependency Flow** | Architectural separation is absolute: `apps/*` $\rightarrow$ `packages/features` $\rightarrow$ `packages/core` $\rightarrow$ `packages/shared`. Core logic never imports upward from UI or feature layers. |
| **Agentic Readiness** | Every capability is accessible both to human developers via clean CLIs and web UIs, and to AI coding agents via typed MCP tools, structured JSON schemas, and machine-readable `llms.txt` documentation mirrors. |

---

## Ecosystem Repositories

All official Zapwebp repositories are organized under the [`github.com/Zapwebp`](https://github.com/Zapwebp) organization:

| Repository | Capability | Description |
|---|---|---|
| [`core`](https://github.com/Zapwebp/core) | `@zapwebp/core` | Core raster and vector conversion engine with libvips and resvg-js bindings. |
| [`cli`](https://github.com/Zapwebp/cli) | `zapwebp`, `@zapwebp/cli` | Terminal CLI executable, watch mode, multiplier generation, and undo journals. |
| [`mcp`](https://github.com/Zapwebp/mcp) | `@zapwebp/mcp` | Model Context Protocol server exposing image tools and resources to AI agents. |
| [`web`](https://github.com/Zapwebp/web) | Web Application | Client-side in-browser converter running 100% in local memory ([zapwebp.vercel.app](https://zapwebp.vercel.app)). |
| [`docs`](https://github.com/Zapwebp/docs) | `@zapwebp/docs` | Documentation portal engine and Markdown documentation mirrors ([zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)). |
| [`ui`](https://github.com/Zapwebp/ui) | `@zapwebp/ui` | Universal UI kit, design tokens, error mapping, and framework dropzones. |
| [`vscode`](https://github.com/Zapwebp/vscode) | `zapwebp-vscode` | Official editor extension for VS Code, VSCodium, Cursor, and Windsurf (`ebula.zapwebp-vscode`). |
| [`storage`](https://github.com/Zapwebp/storage) | `@zapwebp/storage` | Cloud storage upload adapters for Supabase, Firebase, and Neocities. |
| [`plugins`](https://github.com/Zapwebp/plugins) | `@zapwebp/plugin-sdk` | Vite, Next.js, and GitHub Actions build plugins and lifecycle contracts. |
| [`laravel`](https://github.com/Zapwebp/laravel) | `zapwebp/laravel` | Laravel service provider, `Zap` facade, and `ConvertUploads` middleware. |
| [`zapwebp`](https://github.com/Zapwebp/zapwebp) | Monorepo Workspace | The canonical monorepo unifying all packages, test suites, and documentation. |

---

## Leadership & Governance

Zapwebp is designed, architected, and maintained by **Eldrex Delos Reyes Bula**.

- **Maintainer:** Eldrex Delos Reyes Bula
- **Jurisdiction:** Republic of the Philippines
- **Primary Website:** [https://zapwebp.vercel.app](https://zapwebp.vercel.app)
- **Documentation Portal:** [https://zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)
- **Source Code:** [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **npm Organization:** [https://www.npmjs.com/org/zapwebp](https://www.npmjs.com/org/zapwebp)
- **Publisher Namespace:** `ebula` (Open VSX Registry & VS Marketplace)
- **Contact:** `eldrexdelosreyesbula@gmail.com`
- **Licensing:** The Zapwebp codebase and official packages are licensed under the [MIT License](https://github.com/Zapwebp/zapwebp/blob/main/LICENSE).
