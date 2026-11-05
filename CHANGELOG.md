# Changelog

This changelog records the changes included in each Zapwebp version.

## [2.10.0] - 2026-11-05

### Added

- **Web App 3-Tap Layout Architecture & Landing Page Migration**:
  - Restructured the primary web application (`public/index.html`, `public/styles.css`, `public/app.js`) to strictly satisfy the 3-Tap doctrine: Tap 1 (Drop file), Tap 2 (Optional settings/quick toggles), Tap 3 (Download).
  - Migrated marketing showcase, pillars, and comparison matrix from the web application root into the official documentation portal (`zapwebp-docs.vercel.app` / `content/index.md`).
  - Added streamlined App Header with instant workspace reset via the brand logo (`#brand-reset-btn`), single accessible theme toggle (Sun/Moon), and Settings Gear button (`#settings-btn`).
  - Added lean App Footer with creator attribution (`⚡ Zapwebp · Convert correctly.`), multilingual toggle (`🌐 EN`), and documentation link.
- **Output File Size Enforcer & Multi-Mode Compression**:
  - Integrated four distinct output size modes: Auto (default quality 85, unbounded), Limit strict (iterative quality step-down until $\le \text{limit}$ KB), Target best-effort (5-step binary search to get as close to target KB as possible without exceeding), and Pass-through / Unlimited (Lossless).
  - Implemented automatic Quality Downgrade Badge (`📉 Quality reduced from X to Y to fit Z KB`) displayed on single result cards, batch rows, and grid cards.
  - Implemented Lossless & Size Limit Conflict Warning System (`#lossless-conflict-banner`) with one-click resolution actions: `[ Switch to Lossy ]` and `[ Remove Size Limit ]`.
  - Added Input Size Restriction enforcing rejection of files exceeding configurable threshold (default 50 MB) before processing.
- **Slide-Over Settings Drawer with Dual-Tab Architecture**:
  - Upgraded settings interface into a responsive right-side slide-over panel with two distinct tabs:
    - **Essentials Tab**: Target format (WebP, AVIF, PNG, JPEG), Quality slider (1–100), Output Size Limit (Auto / Custom Limit in KB), Theme (Auto, Light, Dark), and Clean Metadata stripping toggle.
    - **Advanced Tab**: Compression Target strategy (Limit strict vs Target best-effort), Input Size Restriction (MB), and Lossless Mode with override warnings.
  - Offloaded compression loops to Web Worker (`public/worker.js`) with automatic canvas fallback.

## [2.9.0] - 2026-11-05

### Added

- **Full Enterprise SEO Suite Across Web Platform**:
  - Embedded complete canonical link and multilingual `hreflang` alternates (`en`, `tl`, `x-default`).
  - Added full OpenGraph dimensions (`og:image:width="1200"`, `og:image:height="630"`, `og:image:type="image/svg+xml"`, `og:locale="en_US"`, `og:locale:alternate="tl_PH"`).
  - Integrated comprehensive Schema.org JSON-LD graph containing `WebApplication`, `Organization`, `WebSite` (with SearchAction), and `FAQPage` rich search snippets.
  - Dynamic `<meta name="theme-color">` synchronization matching light (`#f7f7f4`) and dark (`#10120f`) themes.
- **Web App Full Revamp: Single Dropzone & Auto-Detection**:
  - Auto-detection without manual mode toggling: single file uploads render high-craft focused card (`single-result-card`), while batches of 2+ files render summary header (`X files converted · In → Out (-Z%)`), ZIP export, and Grid/List view toggle.
  - Offloaded background conversion to dedicated Web Worker (`public/worker.js`) with bounded concurrency (2 threads, dropping to 1 on devices with $< 4\text{GB}$ RAM) and seamless Canvas/DOM fallback.
  - Persistent queue via IndexedDB (`zapwebp-db`), restoring converted files across tab closes and refreshes.
  - Keyboard shortcuts (`1` -> WebP, `2` -> AVIF, `3` -> PNG, `4` -> JPEG) and quick format badge toggle.
  - Minimal Settings Modal (gear icon ⚙️) for default format, quality slider (1–100), theme (Auto/Light/Dark), and clean metadata stripping.
  - Confirm Delete All modal preventing accidental loss of batch assets.

### Fixed

- **Duplicate Mode Toggle Button**:
  - Eliminated redundant duplicate `<button id="theme-toggle-btn">` from the top header navigation.
  - Enforced single accessible theme switcher toggling between Light and Dark mode with Sun/Moon SVGs.
  - Connected `tokens.css` and added complete `[data-theme="dark"]` token overrides in `styles.css` ensuring full page background and text contrast updates immediately upon toggle.

## [2.8.0] - 2026-11-05

### Added

- **Dual Mode Switch Toggles (Clean Mode & Lossless)**:
  - Implemented accessible, high-craft switch toggles (`role="switch"`, `aria-checked`, pill track and sliding thumb) for both **Clean Mode** and **Lossless** in the web converter cockpit toolbar.
  - Linked Lossless toggle with automatic quality slider lock (disabling slider and displaying `100% (Lossless)`), live client-side re-conversion, and local preference persistence (`zapwebp_lossless`).
- **Comprehensive SEO & Machine Discoverability Across Web App and Docs**:
  - Embedded complete OpenGraph (`og:title`, `og:description`, `og:url`, `og:image`, `og:type`) and Twitter Cards (`summary_large_image`) across `public/index.html` and `zapwebp-docs/index.html`.
  - Added dynamic meta tag synchronization in `zapwebp-docs/src/render.ts` updating document title, description, canonical link, and OpenGraph/Twitter tags on route transitions.
  - Enforced canonical domains `https://zapwebp.vercel.app/` for the main converter web application and `https://zapwebp-docs.vercel.app/` for the documentation platform.

### Fixed

- **Mobile Documentation Responsiveness & Viewport Clipping**:
  - Eliminated horizontal layout overflow on mobile screens ($\le 768\text{px}$ and $\le 480\text{px}$) by enforcing `overflow-x: hidden` and `max-width: 100vw` across root containers.
  - Collapsed secondary header actions on small screens and truncated language dropdown labels, preventing the header from pushing the sidebar toggle button and article headings off-canvas.
  - Fixed mobile drawer clipping by hiding closed off-canvas navigation from layout scroll calculation (`visibility: hidden; pointer-events: none;`).
  - Added auto-close behavior when mobile users select any documentation link in the navigation drawer.

### Changed

- **High-Craft Drag-and-Drop Converter Interface**:
  - Elevated `.dropzone-area` with radial surface gradient, double-bezel border tokens, refined drop circle icon, high-contrast typography, and tokenized format chips with transparency indicators (`chip-alpha`).
  - Enhanced active drag-over state (`.is-dragging`) with smooth scaling feedback (`scale(1.008)`), pulsing green accent border glow, and interactive hover feedback.

## [2.7.0] - 2026-11-04

### Added

- **Ecosystem Production Registry Publication**:
  - Published all 19 Zapwebp packages to the official npm registry (`https://www.npmjs.com/org/zapwebp`) with public access:
    - Core & Engine: `@zapwebp/core` (1.1.0), `@zapwebp/shared` (1.1.2), `@zapwebp/config` (1.0.0), `@zapwebp/ui` (1.1.0), `@zapwebp/features` (1.0.0).
    - SDK & Edge: `@zapwebp/sdk` (1.1.0/1.1.1), `@zapwebp/edge` (2.0.0), `@zapwebp/api` (1.1.0).
    - Plugins & Adapters: `@zapwebp/plugin-sdk` (1.1.0), `@zapwebp/storage` (1.1.0), `@zapwebp/crop` (1.0.0), `@zapwebp/laravel` (1.0.0).
    - CLIs & AI Protocols: `zapwebp` (1.1.0), `@zapwebp/mcp` (1.1.0), `zapwebp-lens` (1.0.0), `create-zapwebp` (1.0.1).
    - Framework Integrations: `zapwebp-vite` (1.0.0), `zapwebp-next` (1.0.0), `zapwebp-github-action` (1.0.0).
  - Built, validated, and published VS Code extension `ebula.zapwebp-vscode` (1.1.0) to Open VSX Registry (`https://open-vsx.org/extension/ebula/zapwebp-vscode`).
  - Packaged standalone VSIX bundle (`apps/vscode/zapwebp-vscode-1.1.0.vsix`) with zero SVGs in metadata, dedicated 128x128 PNG icon, and full offline conversion command integration.

## [2.6.0] - 2026-11-04

### Added

- **Documentation Platform Integration & Elimination of Redundant Duplicates**:
  - Integrated all 7 governance and community policies ([`PRIVACY.md`](PRIVACY.md), [`TERMS.md`](TERMS.md), [`SECURITY.md`](SECURITY.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), [`CONTRIBUTING-TRANSLATIONS.md`](CONTRIBUTING-TRANSLATIONS.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`TRANSLATORS.md`](TRANSLATORS.md)) with official documentation portal routes at `https://zapwebp-docs.vercel.app/` and machine-readable agent mirrors.
  - Added dedicated documentation pages for `security.md`, `code-of-conduct.md`, `contributing.md`, and `translators.md` in `content/` and `locales/tl/docs/` conforming to strict agentic specifications.
  - Registered `/security`, `/code-of-conduct`, `/contributing`, and `/translators` routes in `zapwebp-docs/src/routes.ts`, `server.js`, `zapwebp-docs/src/i18n.ts`, and catalog files.
  - Synchronized complete documentation to `zapwebp-docs/public/content/` and purged obsolete duplicate directory `zapwebp-docs/content/` to eliminate content drift.
- **Legal, Policy, and Community Governance Formalization**:
  - Authored comprehensive Terms of Use ([`TERMS.md`](TERMS.md)) with governing law (Republic of the Philippines), AS-IS warranty disclaimers, user content responsibilities, and limitation of liability.
  - Rewrote and expanded Privacy Policy ([`PRIVACY.md`](PRIVACY.md)) detailing local in-browser and terminal execution, zero server uploads, zero telemetry, local storage keys, and Data Privacy Act compliance.
  - Formalized Security Policy ([`SECURITY.md`](SECURITY.md)) with version support matrix, coordinated disclosure protocol via `eldrexdelosreyesbula@gmail.com`, 48h/72h/7d response SLA, and architectural scope definitions (SVG XXE/XSS defense, WASM bounds, SSRF private network filters).
  - Authored Translation Guide ([`TRANSLATIONS.md`](TRANSLATIONS.md)) and Contributor Recognition Directory ([`TRANSLATORS.md`](TRANSLATORS.md)).
  - Formalized contributor and AI agent operating contracts in [`AGENTS.md`](AGENTS.md) and [`Skills.md`](Skills.md).
  - Updated [`README.md`](README.md) with tagline ("Convert correctly."), canonical documentation URLs, and policy references.

## [2.5.0] - 2026-11-04

### Added

- **Exhaustive Localization Parity & Full Tagalog Documentation (`locales/`)**:
  - Achieved 100% key parity between English (`en`) and Tagalog (`tl`) across all localization catalogs (`common.json`, `errors.json`, `cli.json`, `docs.json`), expanding from 89 to 185 validated keys with 0 missing or orphaned keys.
  - Added 31 structured error codes to `locales/en/errors.json` and `locales/tl/errors.json` with exact placeholder interpolation alignment (`{{from}}`, `{{to}}`, `{{maxBytes}}`, `{{locale}}`, `{{targetFormat}}`, `{{path}}`, `{{scale}}`, `{{message}}`).
  - Added complete CLI command and flag descriptions to `cli.json` with human-readable Tagalog translations while preserving English flag names (`--quality`, `--to`, `--background`).
  - Synchronized in-code catalogs in `@zapwebp/shared` and `zapwebp-docs/src/i18n.ts`.
  - Added 32 full Tagalog documentation pages under `locales/tl/docs/` with zero untranslated English paragraphs, strictly preserving code blocks, commands, flags, and error codes.
  - Enhanced CI validation script `scripts/validate-locales.js` and added automated test suite `test/locales-docs.test.js`.

## [2.4.0] - 2026-11-04

### Removed

- **Complete Removal of `listen` Feature**:
  - Removed `--listen` local Wi-Fi / directory watch daemon and all associated endpoints.
  - Removed `content/listen.md` and `/listen` route from documentation platform.
  - Removed `title.Listen` keys from localization catalogs (`locales/en/docs.json`, `locales/tl/docs.json`).
  - Removed `listen` command definition from `packages/cli/agent.json`.

## [2.3.0] - 2026-11-04

### Added

- **`@zapwebp/crop` Transform Plugin**:
  - Implemented pure transform crop step (`cropTransform`, `cropImage`, `calculateCropBox`) executing between decode and encode stages on in-memory `RawImage` RGBA buffers.
  - Auto-crop mode with aspect ratio evaluation (`1:1`, `16:9`, `4:5`, `3:2`, `9:16`, `21:9`) and gravity anchors (`center`, `top`, `bottom`, `left`, `right`, `face`, and custom `{ x, y }`).
  - Face detection heuristic with skin-tone clustering analysis and 500ms safety timeout fallback to `center`.
  - Manual coordinate crop supporting pixels and percentages with automatic boundary clamping and `E_CROP_EMPTY` protection.
  - Dual fit strategies: `cover` (crops excess borders) and `contain` (letterbox padding with custom background color).
  - Predefined platform crop presets (`avatar`, `thumbnail`, `banner`, `product`, `story`).
  - Composable `withZapwebp` cloud storage integration supporting `crop` preset options and `transforms` pipeline.
  - Interactive web application cropper modal (`#crop-dialog`) with aspect ratio preset buttons, draggable crop selection box, resize handles, and keyboard accessibility.
  - Scaffolding generator `create-zapwebp` updated with `transform` archetype template.
  - Agentic documentation at `/plugins/crop` (`content/plugins/crop.md` and `zapwebp-docs/content/plugins/crop.md`).

## [2.2.0] - 2026-11-04

### Added

- **`@zapwebp/ui` Universal Error & Upload UI Kit**:
  - Zero-dependency, framework-agnostic UI kit with vanilla DOM core and tree-shakable subpath exports (`/toast`, `/banner`, `/modal`, `/card`, `/dropzone`, `/button`, `/progress`, `/errors`, `/state`).
  - 4 notification primitives: `ZapToast`, `ZapBanner`, `ZapModal`, `ZapErrorCard` with built-in accessibility (WCAG 2.1 AA, keyboard focus traps, `role="alert"`, `aria-live`).
  - 3 upload components: `ZapDropzone`, `ZapUploadButton`, `ZapUploadProgress` supporting drag-and-drop, clipboard paste (`Ctrl+V`), and upload progress tracking.
  - Comprehensive `ERROR_MAP` mapping all Zapwebp error codes to human-readable titles, contextual messages, actionable fixes, component targets, and one-click self-correcting auto-retries.
  - Unified CSS custom properties token system with 4 presets (`default`, `minimal`, `glass`, `dark`) and layout customization.
  - First-class framework adapters for React/Next.js (`@zapwebp/ui/react`), Vue (`@zapwebp/ui/vue`), Svelte (`@zapwebp/ui/svelte`), Laravel Blade components (`@zapwebp/ui/blade`), and Vanilla Custom Elements (`<zap-toast>`, `<zap-banner>`, `<zap-modal>`, `<zap-error-card>`, `<zap-dropzone>`, `<zap-upload-button>`, `<zap-upload-progress>`).
  - Optional conversion state management store (`createZapStore` / `useZapStore`).
  - Agentic-ready documentation at `/ui` (`content/ui.md`).

## [2.1.0] - 2026-11-04

### Changed

- **Global Domain & Canonical URLs**:
  - Main Web App canonical URL updated to `https://zapwebp.vercel.app`.
  - Documentation canonical URL updated to `https://zapwebp-docs.vercel.app` (dedicated Vite + Marked deployment).
  - API base URL updated to `https://zapwebp.vercel.app/api`.
  - Contact email globally unified to `eldrexdelosreyesbula@gmail.com` across `SECURITY.md`, `CODE_OF_CONDUCT.md`, package manifests, web app, and documentation footers.
  - All workspace `package.json` files updated with canonical `homepage`, `bugs`, and `repository` links.

- **Extension Registry & VSIX Deployment**:
  - Shifted deployment target from VS Code Marketplace to the Open VSX Registry.
  - Publisher namespace configured to `zapwebp` with homepage `https://zapwebp.vercel.app`.
  - GitHub Actions release workflow configured with `ovsx publish`.

- **Web Application UI/UX & Functional Overhaul (`public/`)**:
  - **Automatic Batch Detection**: Eliminated manual Single/Batch toggle buttons; file input and dropzone automatically detect single versus batch workflows.
  - **Non-Destructive Ingestion Queue**: Dropping or selecting additional files appends them to the active session without overwriting or clearing previously converted files.
  - **Interactive Image Preview**: Added high-resolution modal dialog (`#preview-dialog`) supporting Converted, Original, and Side-by-Side comparison views over transparency checkerboard, showing exact pixel dimensions, file size comparison, and percentage reduction.
  - **Reactive Live Re-conversion**: Changing Target Format (WebP/AVIF/PNG/JPEG), Multipliers (1x/2x/3x), Quality, Clean Mode, or Lossless immediately re-converts all loaded items in-place without requiring re-upload.
  - **Client-Side Persistence**: Preserves user format, quality, scale, clean mode, and lossless preferences in `localStorage` (`zapwebp_settings_v2`).
  - **Lossless & Clean Mode Controls**: Added Lossless compression toggle and Clean Mode metadata stripping with full multi-scale `@1x`/`@2x`/`@3x` packaging and manifest generation.

## [2.0.0] - 2026-11-03

### Added

- **Background Preservation & Deterministic Flattening**:
  - Three background states guaranteed: transparent-to-transparent (exact alpha preserved), opaque-to-opaque (zero invented transparency), and transparent-to-opaque boundary safe flattening.
  - Fail-fast boundary enforcement with structured `E_ALPHA_NOT_REPRESENTABLE` when converting transparent assets to JPEG without an explicit background.
  - Pixel-accurate background blending via `--background <color>`, `defaultBackground`, and `background` project configuration with zero black boxes.
  - Web UI checkerboard preview with contextual JPEG background color picker and conversion transparency report.
  - Storage adapter `defaultBackground` configuration and MCP `convert_image` automated `suggestedFix: { background: "#ffffff" }`.
  - Documentation page `/docs/backgrounds` (`content/backgrounds.md`) detailing three states, CLI workflows, and storage configurations.

- **Many-to-One Conversion & Target Lock Gateway**:
  - Universal target lock configuration across Core, Storage, Edge, CLI, MCP, Web App, and Laravel (`decode(any) -> pixels -> encode(target)`).
  - Strict mode contract (`strict: true`): guarantees unconvertible or corrupt inputs fail fast with structured `E_UNSUPPORTED_FORMAT`.
  - Best-effort mode (`strict: false`): passes unconvertible inputs through unchanged without breaking ingestion pipelines.
  - CLI flags `--lock-target <format>`, `--strict`, `--no-strict`, and `--override-lock`.
  - Edge runtime package `@zapwebp/edge` with `createZapHandler` for Cloudflare Workers, Vercel Edge, and Node.js fetch runtimes.
  - Storage adapter target locking and opt-in per-upload override auditing in `@zapwebp/storage`.
  - MCP `convert_image` locked target enforcement and Web App dynamic format picker hiding.
  - Fluent builder API in Laravel bridge (`Zap::convert($path)->lockTarget('webp')->strict()->save($outPath)`).

- **Format Expansion Registry (`@zapwebp/core`)**:
  - Decoupled `FormatRegistry` with dynamic Gate 4 file sniffer and Open/Closed extensibility.
  - Actionable `E_UNKNOWN_FORMAT` hints when encountering community format signatures (TIFF, HEIC, JXL).
- **`zapwebp-lens` (`packages/lens`)**:
  - Dedicated read-only image inspection and visual comparison companion CLI (`compare`, `inspect`, `alpha`, `diff`, `report`).
  - Terminal ANSI, ephemeral browser viewer with SVG checkerboard (`--open`), and structured JSON (`--json`).
  - Strict read-only guarantee preventing writes outside system `tmpdir()`.
- **Advanced CLI DX & Green Batch Execution (`packages/cli`)**:
  - Interactive selection via `--pick` using Node.js built-in `node:readline/promises` with zero dependencies.
  - File discovery via `--list` (with `--json` automation) and programmatic file lists via `--files <path>`.
  - Bounded concurrency streaming worker pool (default 4 workers) with `setImmediate` event loop yielding.
  - Windows file locking resiliency: `writeAtomic` with 3-attempt exponential backoff on `EBUSY`/`EPERM`.
  - Standardized exit codes: `0` (success), `1` (user/file error), `2` (config error), `3` (internal error), `130` (SIGINT).
- **Web App Rich Ingestion & Zero-Telemetry (`public/app.js`)**:
  - Global clipboard `paste` event handler: direct image blobs (`Ctrl+V`), raw `<svg...>` text, and image URLs.
  - Cross-tab drag-and-drop (`text/uri-list`, `text/html`).
  - Direct in-browser CORS fetch with strict SSRF/private-subnet guards and educational fallback prompt.
- **Localization (i18n) Engine (`@zapwebp/shared`)**:
  - Zero-dependency `t(key, vars)` localization engine supporting English (`en`) and Tagalog (`tl`) with canonical fallback.
  - CLI `--lang <locale>` flag and `process.env.LANG` auto-detection.
  - Web UI footer language selector with `<html lang>` updates and `localStorage` persistence.
  - Automated CI validator script `scripts/validate-locales.js` checking key parity and XSS injection.
- **Clean Mode Extensibility (`@zapwebp/core`)**:
  - Open/Closed `MetadataRegistry` and `MetadataHandler` contract for EXIF, XMP, C2PA, PNG-tEXt, and ICC profiles.
  - Granular `--keep <handlers>` and `--strip <handlers>` flags in CLI.
  - Zero-Trust verification re-inspection pass asserting zero targeted metadata remains.
- **Scaffolding CLI & Public Plugin SDK (`@zapwebp/plugin-sdk`, `packages/create-zapwebp`)**:
  - `create-zapwebp` CLI generator supporting format plugins, storage adapters, build plugins, and custom CLI wrappers.
  - SDK safety utilities: `safeDecode()`, `createMockRawImage()`, `validateStorageWrite()`.
- **Cross-Platform Filesystem Abstraction (`packages/cli/src/fs.js`)**:
  - Cross-platform paths supporting Windows extended paths (`\\?\`), UNC paths, and Android Termux (`process.env.ANDROID_ROOT` fsync bypass).
- **First-Party Laravel Bridge (`packages/laravel`)**:
  - Composer package `zapwebp/laravel` with `Zap` facade, `SafeImage` validation rule, `ConvertUploads` middleware, and Laravel Filesystem disk support via `Illuminate\Support\Facades\Process`.
- **Community Governance & Security Scaffolding**:
  - Issue forms (`.github/ISSUE_TEMPLATE/`), PR template (`.github/PULL_REQUEST_TEMPLATE.md`), `CODE_OF_CONDUCT.md`, `SECURITY.md`, `TRANSLATORS.md`.
  - JSON schema `schemas/plugins.schema.json` and `.github/workflows/validate-plugin.yml`.

## [1.6.0] - 2026-11-03

### Added

- **Zapwebp for VS Code (`apps/vscode` — Master Plan)**:
  - Feature 1: Explorer context menu command `zapwebp.convert` ("Zap to WebP") supporting single and multi-selection across `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, and `.avif`. Converts in-memory without modifying source files, writing sibling outputs and surfacing actionable toast notifications (`✅ logo.webp saved (2.1 KB, −75%)`).
  - Feature 2: Convert on save (`zapwebp.convertOnSave`, opt-in) debounced to 500ms for `.svg` edits with silent Output channel logging.
  - Feature 3: Multi-scale output command `zapwebp.convertScales` ("Zap to WebP (@1x, @2x, @3x)") generating `@1x`, `@2x`, and `@3x` Retina variants using configurable `zapwebp.baseWidth` (default: 512).
  - Feature 4: Hover preview provider on `.svg`, `.png`, `.jpg`, `.jpeg` rendering WebP previews with an SVG checkerboard background in native editor hover tooltips.
  - Feature 5: Native status bar counter (`⚡ Zapwebp: X files converted`) with daily automatic reset, total bytes saved metrics, and click-to-view Output channel logs.
  - Structured modular architecture in `apps/vscode/src/` (`commands/convert.js`, `commands/convert-scales.js`, `hover/provider.js`, `watcher/on-save.js`, `ui/status-bar.js`, `ui/toast.js`, `config.js`, `core.js`).
  - Fail-fast error classification: `E_UNSAFE_SVG`, `E_UNSUPPORTED_FORMAT`, `E_WRITE_FAILED`.
  - Comprehensive unit test suite with 20 tests (`apps/vscode/test/`).

## [1.5.0] - 2026-11-03

### Added

- **Extensible Storage Architecture (`@zapwebp/storage` ^1.1.0)**:
  - Exported canonical `StorageAdapter`, `WriteOptions`, `WriteResult`, and `ZapwebpStorageInstance` TypeScript interfaces alongside `withZapwebp()`.
  - Created [`docs/plugins/storage-adapters.md`](file:///C:/Users/Eldrex/.gemini/antigravity/brain/b2327880-2e62-4359-be22-660e758622b7/docs/plugins/storage-adapters.md) guide with full contract specifications and a production-grade AWS S3 / Cloudflare R2 adapter implementation.
  - Subpath entry points for lightweight consumption: `@zapwebp/storage/supabase`, `@zapwebp/storage/firebase`, and `@zapwebp/storage/neocities`.
  - Bumped `plugins.json` and `plugins/registry.json` to version `1.1.0` registering modular adapter packages under the canonical `https://github.com/Zapwebp/` organization.

### Changed

- Updated GitHub Action, Vite, and Next.js plugin descriptors in `plugins.json` to universal format conversion.

## [1.4.0] - 2026-11-02

### Added

- **First-Party Storage Adapters `@zapwebp/storage` (`packages/storage`)**:
  - Full implementation of the `Zapwebp Storage Adapters` Master Plan contract (`withZapwebp(adapter, options)`).
  - Intercept → Convert → Upload architecture: converts assets in-process with `@zapwebp/core` before files leave infrastructure.
  - Three production storage adapters sharing a single unified interface:
    - `supabaseAdapter(client)`: Wraps `@supabase/supabase-js` storage API (`upload`, `download`, `remove`, `list`, `exists`, `getPublicUrl`).
    - `firebaseAdapter(storage)` & `firebaseAdminAdapter(storage)`: Wraps modular Firebase v9+ client SDK and `firebase-admin/storage`.
    - `neocitiesAdapter({ user, password, site? })`: Uses native Node.js `fetch` and `FormData` with HTTP Basic auth, rate limit (HTTP 429) mapping to `E_RATE_LIMIT`, and auth (HTTP 401) mapping to `E_AUTH`.
  - Multiplier Retina rendering (@1x, @2x, @3x) with automatic `<img srcset>` metadata.
  - Delete cascades: `remove(bucket, path)` deterministically cascades deletion across all scaled outputs (@1x, @2x, @3x), manifests, and original assets.
  - Strict SVG security validation: halts execution on active `<script>`, `<foreignObject>`, or external URLs (`E_UNSAFE_SVG`).
  - Size constraint protection: rejects assets exceeding `maxBytes` (`E_TOO_LARGE`).
  - Conflict resolution strategies: `overwrite`, `skip`, and `error` (`E_CONFLICT`).
  - Exported through `@zapwebp/plugin-sdk/storage`.
  - Comprehensive unit and integration test suite (29 tests in `packages/storage/test/`).
  - 8-section agentic-ready package `README.md` and updated `content/plugins/storage.md`.
- **First-Party GitHub Action `zapwebp-github-action` (`packages/github-action`)**:
  - Full implementation of the `zapwebp-github-action` Master Plan contract (`action.yml`, `Dockerfile`, `entrypoint.sh`).
  - Supports three distinct workflow modes: `commit` (converts and commits back), `check` (verifies in CI and exits code 1 on diff), and `comment` (posts markdown comparison table to PRs).
  - Multiplier Retina rendering (@1x, @2x, @3x) with proportional aspect ratio math into source directories or custom `out-dir`.
  - Fail-fast security validation: halts builds loudly with actionable diagnostics if active SVG scripts (`<script>`, `<foreignObject>`, or `on*=` handlers) are detected.
  - Automatic `zapwebp.manifest.json` report generation with cryptographic SHA-256 hashes and compression savings.
  - Idempotent execution: produces zero new git modifications on repeated runs against clean outputs.
  - Exported through `@zapwebp/plugin-sdk/action`.
  - Comprehensive unit and integration test suite (10 tests in `packages/github-action/test/`).
  - 8-section agentic-ready package `README.md` and updated `content/plugins/github-action.md`.
- **First-Party Next.js Plugin `zapwebp-next` (`packages/next`)**:
  - Full implementation of the `zapwebp-next` Master Plan contract (`withZapwebp(options)(nextConfig)`).
  - Webpack hook injection (`applyWebpack`) converting discovered SVGs across `sourceDirs` during `next build` before compilation starts.
  - Generates multipliers (@1x, @2x, @3x) with proportional aspect ratio math into `outDir` (`public/icons`).
  - Seamless `next/image` integration: registers `image/webp` in `nextConfig.images.formats` when `respectNextImage: true`.
  - Injects Webpack `.svg` loader resolving SVG imports directly to WebP public URLs.
  - Automatic `zapwebp.manifest.json` report generation reporting total files, byte savings, and SHA-256 hashes.
  - Strict SVG immutability and fail-fast XSS/script validation.
  - Dual import export: `import { withZapwebp } from 'zapwebp-next'` and `import { withZapwebp } from '@zapwebp/plugin-sdk/next'`.
  - Comprehensive unit and integration test suite (13 tests in `packages/next/test/`).
  - 8-section agentic-ready package `README.md` and updated `content/plugins/next.md`.
- **First-Party Vite Plugin `zapwebp-vite` (`packages/vite`)**:
  - Full implementation of the `zapwebp-vite` Master Plan contract (`scale`, `baseWidth`, `quality`, `lossless`, `clean`, `outDir`, `emitManifest`, `emitToPublic`, `onConflict`, `include`, `exclude`).
  - In-process rasterization powered directly by workspace `@zapwebp/core` (`convertImage`, `validateSvg`).
  - Strict SVG vector immutability (source SVGs are never altered or overwritten).
  - Multiplier Retina rendering (@1x, @2x, @3x) with proportional aspect ratio math.
  - Fail-fast security validation: halts builds loudly with actionable diagnostics if active SVG scripts (`<script>`, `<foreignObject>`, or `on*=` handlers) are detected.
  - Manifest generation writing `zapwebp.manifest.json` with cryptographic SHA-256 hashes, byte savings, and conversion totals.
  - Dual import export: `import { zapwebp } from 'zapwebp-vite'` and `import { zapwebp } from '@zapwebp/plugin-sdk/vite'`.
  - Comprehensive unit and integration test suite (10 tests in `packages/vite/test/`).
  - 8-section agentic-ready package `README.md` and updated `content/plugins/vite.md`.

### Fixed

- **Web Application Converted State Visibility**: Fixed `resultsContainer.hidden = false` in `public/app.js` so converted result cards and previews render immediately upon drop.
- **Development Cache Prevention**: Configured `no-store, no-cache, must-revalidate` response headers on Express static assets in `server.js` and added cache-busting version query parameters (`?v=2.1.0`) in `public/index.html` to eliminate stale browser rendering.

## [1.3.0] - 2026-11-02

### Added

- **Platform Documentation Consolidation in `content/`**: Added comprehensive agentic-ready Markdown documentation for `api.md` (REST API), `developers.md` (developer tools), `about.md` (mission & architecture), `privacy.md` (zero-telemetry guarantees), and `terms.md` (MIT terms). Updated Kite SPA router and sidebar navigation in `zapwebp-docs/` to index all 17 platform documents.
- **Vibrant, Interactive Web Application & Landing Page**: Overhauled `public/index.html` and `public/styles.css` with a lively, responsive developer interface:
  - Sticky glassmorphic header with brand identity, live status pulse, quick docs navigation, and mode switcher (`Single` / `Batch`).
  - Interactive converter cockpit with highlighted dropzone, supported format chips, target format segmented pills (`WebP`, `AVIF`, `PNG`, `JPEG`), quality slider with live percentage display, multiplier scales (`1x`, `2x`, `3x`), and Clean Mode toggle.
  - Results grid with transparent checkerboard thumbnails, dimension/size savings metrics, single-click downloads, ZIP batch bundles via `fflate`, and responsive `<img srcset>` copy buttons.
  - Four engineering value pillar cards with SVG icons.
  - Interactive developer command center with tabbed snippets (CLI, MCP, Vite, cURL) and one-click copy buttons.
  - Feature audit comparison matrix table.
  - Rich 5-column accessible footer with system status indicator, product navigation, documentation index, and legal links.

### Changed

- **Ignored Internal Governance Docs (`docs/`)**: Added `docs/` to `.gitignore` so internal architectural decision records (ADRs), process maps, and governance documents remain local to developer machines and are strictly excluded from public repository commits.
- **Documentation Single Source of Truth**: All documentation for the entire platform is now canonically housed in `content/` and rendered via the Kite documentation SPA.

### Removed

- **Redundant Static HTML Files in `public/`**: Deleted obsolete static HTML directories (`public/api/`, `public/developers/`, `public/mcp/`, `public/about/`, `public/privacy/`, `public/terms/`, and static format redirect folders), leaving `public/` lean and clean.

## [1.2.0] - 2026-11-02

### Added

- **Format Registry in `@zapwebp/core` (`packages/core/src/formats/`)**: Implemented decoupled `FormatHandler` interface and `FormatRegistry` supporting Open/Closed format extensions without touching conversion core. Ships 7 built-in handlers (`svg`, `png`, `jpeg`, `webp`, `avif`, `gif`, `tiff`) with automated roundtrip tests.
- **Design System Package `@zapwebp/ui` (`packages/ui`)**: Implemented three-tier token architecture (`primitives.css` &rarr; `semantic.css` &rarr; component classes), fluid clamp typography (`--step--1` to `--step-5`), centralized motion tokens (`duration`, `easing`, `reducedMotion`), Tailwind CSS preset (`tailwind.preset.js`), and 12 core accessible primitives (`Button`, `IconButton`, `Input`, `Switch`, `Badge`, `Card`, `Dropzone`, `Progress`, `Dialog`, `Toast`, `Skeleton`, `Tooltip`).
- **Vertical Features Package `@zapwebp/features` (`packages/features`)**: Implemented pure conversion state machine (`ConvertState`, `ConvertEvent`, `reduce(state, event)`), Web Worker message dispatcher (`convert.worker.js`), concurrency-limiting `BatchManager`, `CleanService` for AI metadata detection and certification, and `MultiplierService` for @1x/@2x/@3x scaling.
- **Kite Documentation Engine (`zapwebp-docs/`)**: Rebuilt documentation using `@kitelet/core` and `marked` across 13 Markdown documents (9 core pages + 4 plugin guides: `vite.md`, `next.md`, `github-action.md`, `storage.md`). Features client-side markdown rendering, unified responsive sidebar, 1-click code copying, and updated `llms.txt`.
- **Centralized Defaults & Constants in `@zapwebp/shared`**: Extracted all default parameters into `packages/shared/src/defaults.js` (`DEFAULT_OPTIONS`), magic numbers and limits into `packages/shared/src/constants.js`, and code-keyed errors into `packages/shared/src/errors.js`.
- **Configuration Package `@zapwebp/config` (`packages/config`)**: Exported shared ESLint rules banning literal hex color strings in UI code (`no-restricted-syntax`), hardcoded URLs, and magic numbers, alongside downward-only dependency boundaries (`no-restricted-imports`).
- **Community Documentation & ADRs**: Created `docs/design/palette-rules.md` (6 palette guardrails), `docs/contributing/adding-a-format.md` (30-minute guide to adding format handlers), root `CONTRIBUTING.md`, and four comprehensive ADRs in `docs/adr/` (`0001-two-stage-pipeline.md`, `0002-wasm-in-worker.md`, `0003-format-registry.md`, `0004-design-tokens.md`).

### Removed

- **Static HTML Documentation**: Deleted legacy `public/docs.html` in favor of the Kite-based documentation app.

### Fixed

- **Web Service UI State Overlap**: Fixed author stylesheet specificity bug where `.converting-state` and `.results-container` had `display: flex`/`grid` in `public/styles.css`, overriding HTML5 `hidden` attribute. Added `[hidden] { display: none !important; }`, guarded empty thumbnail `src`, and fixed footer alignment.

## [1.1.2] - 2026-11-02

### Fixed

- Removed raw absolute Windows filesystem paths (`C:\Users\Eldrex\...`) from all package `README.md` headers.
- Replaced all incorrect references to `zapwebp.dev` with the canonical production URL `https://zapwebp.vercel.app/` across all code, error links, and documentation.
- Fixed root `README.md` and `public/index.html` logo references by ensuring `public/assets/zapwebp.svg` is properly linked and served as both `/assets/zapwebp.svg` and `/zapwebp.svg`.

### Changed

- Completely overhauled all package README files across the monorepo (`@zapwebp/core`, `@zapwebp/api`, `zapwebp` CLI, `@zapwebp/mcp`, `@zapwebp/sdk`, `@zapwebp/plugin-sdk`, `apps/vscode`, and root `README.md`) to be comprehensive, detailed, and informative.
- Added full REST API endpoint specifications with cURL examples and OpenAPI 3.1 documentation to `packages/api/README.md`.
- Documented all 16 CLI subcommands, 10-Gate selection chain, flags, and reversible transaction journal in `packages/cli/README.md`.
- Added complete reference tables for all 15 MCP tools, 6 prompts, and 7 resources in `packages/mcp/README.md`.
- Completed branded SVG badge assets in `public/assets/packages-readme-icons` for all workspace packages and apps.

## [1.1.1] - 2026-11-01

### Fixed

- Resolved test suite assertion failure in `packages/core/test/conversion.test.js` where the test fixture generated opaque TIFF data via default JPEG compression instead of lossless deflate compression.
- Corrected default output path resolution in `@zapwebp/mcp` (`convert_image` and `convert_svg_to_webp`) so that omitting `outputPath` writes next to the source file rather than in the project root.
- Aligned Node engine specifications to `>=22` across root `package.json`, `Dockerfile`, and GitHub Actions workflows, resolving universal engine mismatch warnings.

### Added

- Complete Agentic-Ready Documentation suite across 9 pages (`index`, `convert`, `cli`, `mcp`, `listen`, `clean`, `formats`, `safety`, `errors`) strictly adhering to the six-rule template with structured `For agents` JSON metadata blocks.
- Root `public/llms.txt` index and raw Markdown serving endpoints (`/:page.md`) with `text/markdown; charset=utf-8`.
- Automated documentation integrity test suite (`test/docs.test.js`) and LLMS generation script (`scripts/build-llms.js`).
- Automated integration test suite for `@zapwebp/mcp` (`packages/mcp/test/mcp.test.js`) and VS Code extension activation (`apps/vscode/test/extension.test.js`).
- Rule 0 Enterprise Architecture governance contracts: root `Skills.md`, `/docs/architecture/overview.md`, `/docs/decisions/` ADRs, and `/docs/processes/image-conversion.md`.
- Universal format-agnostic pipeline (`decodeToRgba`, `encodeFromRgba`, `convert`) and comprehensive TypeScript definitions (`index.d.ts`) in `@zapwebp/core`.
- 28-combination Golden Matrix test suite in `packages/core/test/conversion.test.js` validating every input (`svg`, `png`, `jpeg`, `webp`, `avif`, `tiff`, `gif`) to every output (`webp`, `png`, `jpeg`, `avif`) with alpha retention and JPEG flattening assertions.
- Format-aware MCP agent prompts: `optimize-web-assets`, `convert-with-alpha-safety`, and `icon-pipeline`.
- VS Code direct shortcut commands (`zapwebp.convertToWebp`, `zapwebp.convertToAvif`, `zapwebp.convertToPng`) and `zapwebp.multiTarget` workspace configuration.
- Dedicated format-direction SEO routes (`/svg-to-webp`, `/png-to-webp`, `/jpg-to-webp`, `/webp-to-png`, `/svg-to-png`, `/png-to-avif`, `/avif-to-webp`) in `server.js` and route-aware target auto-selection in `public/app.js`.
- Quick-copy developer affordances: 1-click CLI command generator on converted web result cards and copy buttons on documentation code blocks.
- Comprehensive package README files for root, CLI, MCP, VS Code, and Core with client configuration snippets (Claude Desktop, Cursor, Windsurf).
- Launched official `@zapwebp/sdk` (JS/TS SDK) supporting zero-config offline in-memory execution, remote edge API mode, multi-target generation, and webhook HMAC-SHA256 signature verification.
- Introduced `@zapwebp/plugin-sdk` and public plugin catalog `plugins/registry.json` supporting lifecycle hooks (`beforeConvert`, `afterConvert`) and cloud storage adapters.
- Published OpenAPI 3.1 specification at `openapi/openapi.json` and implemented `/api/v1/inspect` metadata inspection endpoint.
- Shipped `zap` CLI alias binary alongside `zapwebp` for zero-friction terminal workflows.
- Client-side in-browser image conversion with 100% local processing, zero server upload, privacy badge indicator, and automatic serverless API fallback.
- Multiplier scale generation (@1x/@2x/@3x): responsive `<img srcset>` generation, `@2x`/`@3x` filename conventions, and `manifest.json`.
- Batch and recursive folder drop with client-side ZIP bundle download using `fflate`.
- CLI flags for multipliers and archives: `--scale`, `--base-width`, `--zip`, `--srcset`.
- Clean Mode container sanitization: raw RGBA memory-only pipeline that scrubs C2PA manifests, EXIF, XMP, Photoshop IPTC, and trailing comments, with tamper-evident Clean Certificate generation (`generateCleanCertificate`).
- AI Agent Alpha Guardrails: shell command auditing (`auditConversionCommand`) to detect ImageMagick black background bugs and metadata leaks, plus technical explanation tool (`explainBlackBackground`).
- Extended `@zapwebp/mcp` with `verify_clean`, `audit_conversion`, `explain_black_background` tools, and `clean-conversion` prompt.
- Enhanced CLI with `--clean`, `--no-clean`, `--verify-clean`, `--assert-alpha`, `--report` flags and subcommands `zap audit "<cmd>"`, `zap explain-black-bg`, and `zap inspect <file>`.
- Upgraded agentic documentation for `content/clean.md` and `content/safety.md` with runnable units, error codes, and structured JSON blocks.
- Documented Enterprise Architecture contracts: `ADR-003-zap-developer-platform.md` and `developer-platform-api.md` (BPM-002).
- Full Model Context Protocol (`@zapwebp/mcp`) Server Suite:
  - 15 Tools: `convert_image` (with structured `alpha_not_representable` error and `suggestedFix: { background: "#ffffff" }`), `batch_convert` (multipliers & manifest), `optimize_assets`, `inspect_image` (with `aiProvenanceHints`), `suggest_conversion`, `verify_clean`, `verify_alpha`, `audit_conversion`, `explain_black_background`, `read_config`, `read_ignore`, `read_history`, `convert_url`, `undo_last`, and `list_transactions`.
  - 6 Prompts: `optimize-assets`, `clean-image`, `svg-to-responsive`, `fix-black-background`, `batch-convert`, and `verify-clean` with hidden system instructions prioritizing Zap tools and alpha verification.
  - 7 Read-Only Resources: `zapwebp://config`, `zapwebp://ignore`, `zapwebp://history`, `zapwebp://manifest`, `zapwebp://certificate/{sha256}`, `zapwebp://formats`, and `zapwebp://errors/{code}`.
  - Dual transport architecture: local stdio for IDE agents (Cursor, Claude Desktop, VS Code) and remote Streamable HTTP / SSE (`/mcp`) for cloud chatbots.
- Safe, Reversible, Scoped CLI Subsystems:
  - 10-gate file selection chain: `not_found`, `ignored`, `internal_artifact`, `unsupported_format`, `unsafe_svg`, `too_large`, `symlink`, `outside_root`, `changed_during_run`, `up_to_date`.
  - Reversible transaction journaling: `.zapwebp/journal/<id>.json` logs with SHA-256 pre/post checks and atomic backups in `.zapwebp/backups/<id>/`.
  - Full transaction lifecycle commands: `zap undo`, `zap redo`, `zap history`, `zap show <id>`, and `zap gc`.
  - 3-layer ignore hierarchy: built-ins, project `.zapwebpignore`, and `.zapwebp.config.json` with `zap ignored [dir]`.
  - Git-aware inputs: `--changed` (vs HEAD) and `--staged` (index only).
  - Gitignore marker block integration: `# >>> zapwebp >>> ... # <<< zapwebp <<<` with `zap init [--hook]`, `zap gitignore <show|add|remove>`, and `--commit-outputs`.
  - Config precedence engine: flags > config file > environment variables > defaults with `zap config show`.
  - System diagnostics and safety inspection: `zap doctor` and `zap explain <file>`.
  - Zero-telemetry, zero-network security guarantee documented in root `PRIVACY.md`.

### Changed

- Streamlined the web home application to strictly embody the Four Rules Design Doctrine: 48px header, idle arrow glyph dropzone, 8px state dot indicator, and single quality knob ("Drop. Convert. Done.").
- Added `targets` batch output parameter documentation to `public/openapi.json`.
- Restructured `AGENTS.md` into the 9-section Enterprise Architecture specification.

### Removed

- Removed orphaned, non-functional `#extra-format-options` UI elements and dead marketing sections from `public/index.html`.
- Removed empty and unused `sources/` directory.

### Security

- Purged hardcoded plaintext npm credentials from `.env` and established sanitized `.env.example`.
- Hardened `.vercelignore` to explicitly block `.env` and `.env.*` from serverless deployments.

## [1.1.0] - 2026-11-01

Today's version adds developer workflows and expanded image-format support around the existing Zapwebp web app. The 1.0.0 web release below remains unchanged.

### Added

- Shared `@zapwebp/core` package for the alpha-preserving SVG to WebP conversion engine.
- SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF input support; WebP, PNG, JPEG, and AVIF output.
- JPEG alpha safety that requires an explicit background color before flattening transparent images.
- Image inspection and suggestions, multi-target output options, resize/fit settings, metadata stripping, and first-frame/page handling for GIF and TIFF.
- `zapwebp` CLI with single-file, batch, glob, stdin/stdout, watch, JSON, manifest, dry-run, and CI check workflows.
- `@zapwebp/mcp` server with single conversion, batch conversion, asset optimization, preview, and project configuration tools.
- VS Code extension source with Explorer conversion actions, folder conversion, checkerboard preview, and optional convert-on-save.
- Versioned single-file and batch REST API routes, health endpoint, and OpenAPI specification.
- Developer, API, and MCP pages describing the new integration surfaces and their release status.
- pnpm workspace, Docker configuration, automated checks, and Changesets-based npm release workflow.
- Conversion and API regression coverage for transparency, SVG safety, size bounds, batch behavior, and CLI workflows.

### Changed

- Hardened SVG handling, path boundaries, upload limits, response limits, and conversion option validation across the integration surfaces.
- Updated the VS Code extension build to bundle the shared core for packaging.
- Clarified API hosting limits and that public availability and rate limits are not guaranteed.

## [1.0.0] - 2026-10-31

Initial web app release.

### Added

- SVG to WebP conversion through transparent PNG, preserving alpha transparency.
- Batch conversion for up to 20 SVG files, with output width, lossy quality, and lossless options.
- Source and result previews, checkerboard transparency backgrounds, and individual downloads.
- Browser-local IndexedDB persistence for queued SVGs and converted WebPs across refreshes, with controls to clear saved data.
- Responsive interface, animated interactions, Zapwebp mascot logo, and About, Privacy, and Terms pages.
- In-memory file processing without an upload archive, database, or job queue.
- Vercel deployment support with request and response size limits, security headers, and function duration settings.
- Live app links, canonical URLs, Open Graph URLs, and a sitemap for the deployed site.
- Privacy and About disclosures describing local browser storage and retention controls.
