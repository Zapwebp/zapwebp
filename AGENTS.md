# AGENTS.md — Zapwebp Operating Contract

## 1. Purpose

Zapwebp provides transparency-safe, high-performance image conversion across developer terminals, AI agents (MCP), code editors (VS Code), and an instant in-browser web app. It guarantees alpha channel preservation where supported, strictly prevents accidental transparent-to-opaque loss, and enforces zero-tracking, memory-only execution. The product promise is: **Drop. Convert. Done.**

- **Maintainer:** Eldrex Delos Reyes Bula
- **Organization:** Zapwebp
- **Web App:** [https://zapwebp.vercel.app](https://zapwebp.vercel.app)
- **Documentation:** [https://zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)
- **Source Code:** [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **npm Registry:** [https://www.npmjs.com/org/zapwebp](https://www.npmjs.com/org/zapwebp)
- **Open VSX Publisher:** `zapwebp`
- **Contact:** `eldrexdelosreyesbula@gmail.com`
- **Jurisdiction:** Republic of the Philippines
- **License:** MIT ([LICENSE](LICENSE))

---

## 2. Tech Stack (Locked)

- **Language / Runtime:** Node.js >=22.0.0
- **Module Formats:** Dual CommonJS & ESM (ES2023)
- **Package Manager:** pnpm 11.9.0
- **Core Raster Engine:** `sharp` ^0.33.5 (libvips)
- **Core Vector Engine:** `@resvg/resvg-js` ^2.6.2 (Rust SVG)
- **AI Agent Protocol:** Model Context Protocol (`@modelcontextprotocol/server` ^2.4.0, `zod` ^4.0.0)
- **HTTP Server:** Express ^4.21.2
- **Docs Client:** `@kitelet/core` ^1.0.0, `marked` ^18.1.2
- **Test Runner:** `node:test` (built-in Node test runner, zero extra test framework dependencies)
- **Bundler:** `esbuild` ^0.25.0 (VS Code extension and client distribution)
- **Release Governance:** `@changesets/cli` ^2.29.8

---

## 3. Structure

- `/packages/core` → Shared conversion engine, SVG validation, format sniffing, and extensible format registry (`src/formats/`).
- `/packages/shared` → `@zapwebp/shared` constants, MIME maps, format matrices, i18n helpers, and canonical URLs.
- `/packages/ui` → `@zapwebp/ui` universal error and upload UI kit, design system tokens, 4 presets (default, minimal, glass, dark), 4 notification primitives, 3 upload components, error mapping with auto-retry, and framework adapters (React, Vue, Svelte, Blade, Vanilla).
- `/packages/features` → `@zapwebp/features` vertical slices: convert state machine & worker, batch manager, clean service, and multipliers.
- `/packages/config` → `@zapwebp/config` shared ESLint rules (no hardcoded hex colors, downward dependencies) and TypeScript configs.
- `/packages/api` → Express router for REST endpoints (`/health`, `/inspect`, `/convert`, `/batch`).
- `/packages/cli` → `zap` and `zapwebp` executables (single, batch, glob, stdin, watch, manifest, check).
- `/packages/mcp` → `@zapwebp/mcp` server for AI agent tool invocations over stdio and SSE.
- `/packages/sdk` → `@zapwebp/sdk` official JS/TS client with offline in-memory and remote API execution.
- `/packages/plugin-sdk` → `@zapwebp/plugin-sdk` plugin contracts and adapter lifecycle hooks.
- `/packages/storage` → `@zapwebp/storage` first-party adapters for Supabase, Firebase, and Neocities with pre-upload conversion and delete cascades.
- `/packages/crop` → `@zapwebp/crop` pure transform auto-crop and coordinate slicing plugin with face detection.
- `/packages/edge` → `@zapwebp/edge` edge runtime fetch handlers enforcing target lock ingestion contracts.
- `/packages/lens` → `zapwebp-lens` image inspector CLI with container chunk analysis and checkerboard viewer.
- `/packages/create-zapwebp` → CLI scaffolder for community format and metadata plugins.
- `/apps/vscode` → VS Code extension with explorer actions, preview webview, and convert-on-save.
- `/public` → Web application assets (`index.html`, `styles.css`, `app.js`, `docs.js`, `llms.txt`).
- `/content` → Single source of truth for platform documentation (`*.md`).
- `/zapwebp-docs` → Standalone documentation web application (`zapwebp-docs.vercel.app`).
- `/locales` → Multi-lingual catalogs (`en`, `tl`) for UI, error dictionaries, CLI, and docs.
- `/contributing` → Public developer guides (adding format handlers, design system palette rules).
- `/docs` → Local-only EA architecture governance, ADRs, and process maps (local only, gitignored).
- `/test` → Workspace-level integration and documentation compliance tests.

---

## 4. Commands (Verified & Copy-Pasteable)

- **Install Workspace:** `pnpm install`
- **Local Dev Server:** `pnpm dev` (starts `node --watch server.js` on port 3000)
- **Start Production Server:** `pnpm start` (runs `node server.js`)
- **Run All Tests:** `pnpm test` (runs all 20 package suites + doc compliance tests)
- **Run Single Package Tests:** `pnpm --filter @zapwebp/core test`
- **Validate Docs Template:** `node --test test/docs.test.js`
- **Validate i18n Locales:** `node scripts/validate-locales.js`
- **Build Docs Client:** `node scripts/build-docs.js`
- **Build Standalone Docs App:** `npm run build --prefix zapwebp-docs`
- **Build llms.txt Catalog:** `pnpm build:llms`
- **Build VS Code Extension:** `pnpm build:vscode`
- **CLI Direct Execution:** `node packages/cli/bin/zap.js <file>`
- **MCP Server Local Execution:** `node packages/mcp/bin/zapwebp-mcp.js`

---

## 5. Architectural Standards

- **Naming**: camelCase for functions and variables, PascalCase for classes, kebab-case for files and folders.
- **Code Style**: Standard clean JavaScript, strict equality (`===`), guard clauses, early returns.
- **Docstrings**: JSDoc on every exported function, class, and method with `@param`, `@returns`, and `@throws`.
- **Comments**: Explain *why*, never *what*. If code requires a "what" comment, refactor the code into self-documenting units.
- **Commits**: Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, `perf:`).
- **Dependency Flow**: Strictly downward only (`apps/*` &rarr; `packages/features` &rarr; `packages/core` &rarr; `packages/shared`). Circular dependencies are blocked.

---

## 6. Zero Trust & Security Principles

1. **Zero Telemetry**: Never add analytics trackers, error monitoring beacons (Sentry/LogRocket), or phone-home requests. Image conversion executes 100% in local memory.
2. **Defensive Vector Ingestion**: Any SVG input containing active elements (`<script>`, inline `on*` event handlers, `javascript:`, `<foreignObject>`) or external entities (XXE) must be rejected with `E_UNSAFE_SVG` prior to rasterization.
3. **Private Subnet & SSRF Protection**: Ingest pipelines that fetch remote image URLs must reject private, loopback, and link-local IP addresses (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 equivalents).
4. **Memory & Resolution Bounds**: Dimension inputs must not exceed 4096 × 4096 pixels (16 Megapixels) unless explicitly configured by policy. WASM heaps are capped at 256MB.
5. **Path Sandboxing**: Operations on the local file system must verify target paths reside within authorized project roots (`resolveInside`). File traversal via `..` or unverified symlinks is rejected unless `--allow-outside` is explicitly supplied.
6. **Deterministic Alpha Preservation**:
   - Transparent inputs (`SVG`, `PNG`, `WebP`, `AVIF`, `GIF`, `TIFF`) retain transparency when converted to alpha-capable targets.
   - Opaque inputs remain opaque; never invent transparency.
   - Flattening transparent inputs to JPEG requires an explicit `--background` color; implicit alpha dropping is forbidden (`E_ALPHA_NOT_REPRESENTABLE`).

---

## 7. Rules for AI Agents

When modifying this repository, AI agents must adhere to the following non-negotiable rules:

1. **Production Code Only (Rule 7)**:
   - Never introduce mocks, stubs, simulations, fake data, or `TODO: implement later` blocks into shipped packages.
   - If an API or feature cannot be fully implemented, do not stub it—flag it to the user.
2. **Documentation Integrity (Rule 2 & Rule 3)**:
   - Documentation must reflect running code reality, not speculative intent.
   - Always run `node --test test/docs.test.js` after touching documentation.
   - Keep markdown files in `content/` and `zapwebp-docs/content/` completely in sync.
3. **SemVer & Changelog Discipline (Rule 6)**:
   - Any meaningful architectural change, new feature, deprecation, or bug fix must include an entry in [`CHANGELOG.md`](CHANGELOG.md) in the same change.
4. **Canonical Identity & URLs**:
   - Main Web App: `https://zapwebp.vercel.app`
   - Docs Portal: `https://zapwebp-docs.vercel.app`
   - Maintainer Contact: `eldrexdelosreyesbula@gmail.com`
   - Publisher: `zapwebp`
5. **Test Verification Before Completion**:
   - Always run relevant package tests or `pnpm test` to verify zero regressions before reporting task completion.

---

## 8. Scope Boundaries

### In Scope
- Transparency-safe conversion across SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF.
- Web app, CLI, MCP server, VS Code extension, REST API, storage adapters, edge handlers, crop engine, and lens inspector.
- Multiplier generation (@1x/@2x/@3x), responsive srcset markup, and in-memory ZIP archives.
- Clean Mode metadata stripping (EXIF, GPS, C2PA) with cryptographic verification certificates.
- Multi-lingual localization supporting English (`en`) and Tagalog (`tl`).
- Offline-first execution with zero cloud storage of user assets.

### Out of Scope
- Remote user accounts, session tracking, remote conversion servers, cloud databases.
- Heavy client-side frameworks (React, Angular, Vue) in the main web app (vanilla HTML/CSS/JS only).
- Commercial telemetry or tracking scripts.
- Legacy `--listen` file-sharing daemon (permanently removed in v2.4.0).
