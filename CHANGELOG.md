# Changelog

This changelog records the changes included in each Zapwebp version.

## [2.14.0] - 2026-11-08

### Added

- **GitHub Actions Hardening & Ecosystem Readiness (`packages/github-action` v1.2.0, `content/plugins/github-action.md`)**:
  - Implemented immutable SHA-pinned release recommendations and pre-built GitHub Container Registry (GHCR) image configuration (`ghcr.io/zapwebp/zapwebp-github-action:v1.2.0`).
  - Added strict Least-Privilege permission matrix documentation (`check`: `contents: read`, `comment`: `pull-requests: write`, `commit`: `contents: write`).
  - Implemented Fork Safety Gate (`assertForkSafety`, `isForkPullRequest`) automatically blocking `commit` mode on fork pull requests with structured error `E_FORK_COMMIT_FORBIDDEN`.
  - Added strict input validation in `inputs.js` preventing path traversal (`..`), leading slashes, newlines, and malicious injection across all parameters.
  - Implemented structured GitHub Actions workflow annotations (`core.error`, `core.notice`, `core.warning`, `core.setFailed`) with structured error codes, file paths, and remediation commands.
  - Implemented automated PR failure comments in `check` mode posting formatted Markdown tables of out-of-date assets with runnable local fix commands (`npx zapwebp <files>`).
  - Implemented hash-based idempotency caching (`.zapwebp/hashes.json`) skipping re-conversion of identical assets to conserve CI runner minutes.
  - Implemented 3-attempt exponential backoff retry (`retry`) on transient network errors (`ETIMEDOUT`, `ECONNRESET`, 429, 502, 503, 504) for GitHub REST API calls.
  - Implemented log sanitization (`sanitizeLog`) redacting runner workspace paths and masking authorization tokens.
  - Added GHCR publishing workflow (`.github/workflows/publish-action-image.yml`), action linting workflow (`.github/workflows/action-lint.yml`), and multi-OS test matrix workflow (`.github/workflows/test-action.yml`) verifying Ubuntu, macOS, and Windows runners across all three modes.
- **Core Engine Freeze & Enterprise Architecture (`@zapwebp/core`, `content/freeze.md`, `locales/tl/docs/freeze.md`)**:
  - Implemented the 5-layer Enterprise Architecture freezing Layer 2 (Core Engine) with exactly seven canonical public functions (`convert`, `inspect`, `registerFormat`, `registerMetadataHandler`, `registerTransform`, `getVersion`, `getFormats`) and five interfaces (`ConvertOptions`, `InspectResult`, `FormatHandler`, `MetadataHandler`, `TransformStep`).
  - Refactored modular internal engine subsystems: `engine/` (pure decode/transform/encode pipeline), `safety/` (SVG defense, SSRF blocking, path sandbox), `registry/` (Open/Closed format, metadata, and transform registries), `journal/` (append-only transaction journal), and `errors/` (structured `ZapwebpError` catalog).
  - Enforced 10 Hardening Disciplines: zero external runtime dependencies beyond WASM/TS modules, zero I/O in core (pure byte buffers in, byte buffers out), zero environment variables or configuration files in core, byte-level output determinism verified by SHA-256 hashes, zero silent catches, 95%+ test coverage, physical zero telemetry, cross-platform parity, and SemVer locking.
  - Aligned architecture with ISO/IEC 25010 (Software Quality), ISO/IEC 27001 (Information Security), ISO/IEC 27017 (Cloud Security), and ISO/IEC 27018 (Cloud Privacy).
  - Authored `/freeze` documentation guide with bilingual Tagalog parity (`locales/tl/docs/freeze.md`), route registration, and `llms.txt` cataloging.
- **VS Code Extension Multi-Tier Cloud Fallback & Zero-Install Conversion (`apps/vscode` v1.2.2)**:
  - Eliminated `'zap.cmd' is not recognized as an internal or external command` failures by implementing 4-tier conversion execution: Tier 1 (In-process native bindings), Tier 2 (Bundled Node CLI runner), Tier 3 (Seamless cloud conversion fallback via `https://zapwebp.vercel.app/api/convert`), and Tier 4 (Actionable error dialog with "Open Docs" and "Copy Install Command" buttons).
  - Packaged `apps/vscode/zapwebp-vscode-1.2.2.vsix`.
- **Docs Vercel SPA Routing, Comprehensive Footer Sitemap & In-App Custom 404 (`zapwebp-docs`, `zapwebp-docs/vercel.json`, `zapwebp-docs/src/render.ts`, `zapwebp-docs/src/router.ts`)**:
  - Permanently resolved edge 404 overrides on subpaths (`/mcp`, `/cli`, `/about`, `/faq`, etc.) by removing the static `404.html` from `public/` and configuring standard SPA rewrites (`/(.*)` -> `/index.html`) in `vercel.json`.
  - Implemented a comprehensive, responsive 4-column Documentation Footer Sitemap rendered on all 33 documentation pages with direct links categorized across Core Engine, Plugins & Frameworks, Developer SDKs & APIs, and Platform & Governance.
  - Added article metadata action bar (view raw markdown, open GitHub issue, contribute translation, back to top) and bottom governance trust bar with license and ecosystem links.
  - Implemented an elegant in-app custom 404 view in `zapwebp-docs/src/router.ts` for unrecognized URLs with quick links back to Overview and FAQs.
- **Web App Spacing, Responsiveness & Deletion Persistence (`public/`)**:
  - Removed visual clutter hero text (`hero.badge`, `hero.title`, `hero.description`) from the top of the converter workspace in `public/index.html` and `public/app.js`, placing focus immediately on the dropzone.
  - Balanced desktop and mobile spacing: tuned `.dropzone-area` padding and height to eliminate awkward vertical voids, capped desktop workspace width at 820px, and resized touch targets for mobile viewports.
  - Hardened IndexedDB deletion: updated `dbDeleteFile` and `dbClearFiles` to await transaction completion (`tx.oncomplete`) and `req.onsuccess`, preventing deleted images from reappearing on page refresh.
- **Storage Hardening, Privacy & ISO Standards Compliance (`@zapwebp/storage`, `content/plugins/storage.md`, `content/security.md`, `content/privacy.md`)**:
  - Implemented Storage Security Baseline in `packages/storage/src/sanitize.js`: path sandboxing enforcing 1024-byte path bounds, null-byte rejection, `..` directory traversal elimination (`E_PATH_TRAVERSAL`), absolute filesystem path blocking, and `file://` scheme rejection.
  - Implemented zero-credential leakage guarantee (`stripCredentials`) redacting Bearer tokens, Basic authorization headers, and API keys from error outputs and logs.
  - Autonomous SSRF prevention via `validateSafeUrl` and `isPrivateIp` blocking internal subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`), link-local metadata endpoints (`169.254.169.254`), and IPv6 loopbacks.
  - Hardened Neocities adapter with automated rate-limit pacing and public web host privacy disclosure warnings (noting 24-month server access log retention).
  - Exported official Supabase Row Level Security (RLS) and Firebase Storage Security Rules templates enforcing least privilege.
  - Implemented bounded worker concurrency pool for batch uploads (`uploadMany`, default: 4 concurrent workers).
  - Implemented and exported universal `validateAdapterContract` and `validateStorageConfig` validators.
  - Documented statutory jurisdiction under the **Republic of the Philippines** and full compliance with **Republic Act No. 10173** (Data Privacy Act of 2012 / DPA) with Transparency, Legitimate Purpose, and Proportionality principles.
  - Formally documented alignment with **ISO/IEC 27001:2022** (A.8.1, A.9, A.10, A.12, A.13, A.18) and **ISO/IEC 27017:2015** cloud security controls with full Tagalog bilingual parity.
- **Final Hardening, Stability & Performance Governance (`content/stability.md`, `content/performance.md`, `CONTRIBUTORS.md`)**:
  - Implemented the complete 22-code canonical error taxonomy across `@zapwebp/shared` and `@zapwebp/ui` with actionable `fix` suggestions and agent specifications.
  - Hardened `@zapwebp/storage` with automated 3-attempt exponential backoff retry (`writeWithRetry`) on transient network and rate-limit failures, failing fast on permanent auth exceptions.
  - Authored authoritative guides for Stability & Error Boundaries (`/stability`) and Performance & Resource Budgets (`/performance`) with bilingual Tagalog localization (`locales/tl/docs/`).
  - Published root contributor recognition directory (`CONTRIBUTORS.md`) acknowledging maintainers, ecosystem contributors, and translators.
- **AI-Aware Subject Detection & Crop Plugin Expansion (`@zapwebp/crop`)**:
  - Implemented Mode 1 — Body-Posture (`mode: 'body'`) with `BODY_PRESETS` (`head`, `head-shoulders`, `upper-body`, `full-body`) detecting keypoints via MoveNet SinglePose and anatomic heuristics.
  - Implemented Mode 2 — Object-Aware (`mode: 'object'`) detecting dominant foreground subjects via COCO-SSD and contour segmentation.
  - Implemented Mode 3 — Smart-Subject (`mode: 'subject'`) offering model-free 0 KB algorithmic saliency using edge/color contrast (`attention`) and 16-bin local Shannon information density (`entropy`) via 2D Summed-Area Table integral image querying ($O(1)$ multi-scale window evaluations).
  - Added universal percentage padding expansion (`padding: 0-0.5`) and target aspect ratio box anchoring (`computeCropRect`).
  - Added fail-safe fallback chain degrading gracefully to Smart-Subject attention analysis without throwing errors.
  - Interactive Cropper Modal UI updated with mode selector chips (`Auto`, `Body-Posture`, `Object-Aware`, `Smart-Subject`, `Manual`), body presets, and live offscreen canvas detection.
- **VS Code Extension Multi-Tier Execution & VSIX Packaging (`apps/vscode` v1.2.1)**:
  - Eliminated `zap.cmd` missing command errors on Windows by bundling self-contained CLI runner in `dist/zap.js` for zero-install offline fallback.
  - Packaged `apps/vscode/zapwebp-vscode-1.2.1.vsix` with hardened multi-tier fallbacks.
- **JSON Schema Specification for Agent Manifests (`schemas/agent-manifest.json`, `zapwebp-docs/public/schemas/agent-manifest.json`, `public/schemas/agent-manifest.json`)**:
  - Implemented authoritative JSON Schema (Draft 2020-12) validating all 13 package agent manifests (`agent.json`).
  - Validates package identity, architecture capabilities, formats, commands, flags, MCP tools/resources, and runtime compatibility.
  - Added workspace-level `.vscode/settings.json` mapping `**/agent.json` to `./schemas/agent-manifest.json` for offline IDE autocomplete, validation, and hover tooltips.
- **Full Multi-Format Laravel Package (`@zapwebp/laravel`, `zapwebp/laravel`)**:
  - Implemented `ConversionResult` value object holding verified metrics (`outputPath`, `originalSize`, `convertedSize`, `format`, `hasAlpha`, `durationMs`) with `savedBytes()`, `savedPercentage()`, and `Stringable` contract.
  - Implemented `ZapConvertCommand` (`php artisan zap:convert`) supporting single files, recursive directories, format target locking, quality, clean mode, and dry-run console reporting.
  - Implemented `ZapCheckCommand` (`php artisan zap:check`) supporting image integrity checks, alpha transparency enforcement (`--assert-alpha`), and metadata auditing.
  - Implemented native Blade directives (`@zapwebp`, `@picture`, `@srcset`) and global helper functions (`zap_url`, `zap_picture`, `zap_srcset`) for modern `<picture>` markup with AVIF/WebP sources.
  - Added test suite with PHP syntax verification (`php -l`), helper execution, and `ConversionResult` calculation.
- **Full Multi-Format Vite Support (`@zapwebp/vite`, `zapwebp-vite`)**:
  - Expanded asset conversion from SVG-only to all supported image formats: SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF.
  - Added multi-format generation in parallel (e.g. `formats: ['webp', 'avif']`).
  - Added query string import transformation: `?picture` (returns sources object for modern picture tags), `?srcset` (returns responsive srcset string), and `?zapwebp` (returns optimized URL).
  - Added `generatePictureHtml` helper and dev server middleware for on-the-fly converted image delivery.
- **Full Multi-Format Next.js Support (`@zapwebp/next`, `zapwebp-next`)**:
  - Expanded image scanning and pre-compilation build hooks from SVG-only to all raster and vector image formats.
  - Implemented official Next.js image custom loader `zapwebpLoader` for `<Image loader={zapwebpLoader} ... />` and `images.loaderFile`.
  - Added parallel multi-format asset generation (`formats: ['webp', 'avif']`).
  - Updated Webpack asset rules for all raster and vector extensions.
- **Comprehensive Common FAQs Documentation (`content/faq.md`, `zapwebp-docs/content/faq.md`, `locales/tl/docs/faq.md`, `zapwebp-docs/src/routes.ts`)**:
  - Authored definitive, multi-lingual troubleshooting and FAQ guide covering official package naming scopes, npm and npx 404 resolution, Socket.dev dependency alerts interpretation (sharp CVE patches, young publisher heuristics, native binary install scripts), VS Code extension multi-tier execution (`zap.cmd` elimination), deterministic alpha transparency preservation (`E_ALPHA_NOT_REPRESENTABLE`), SVG defensive gates (`E_UNSAFE_SVG`), fail-open Laravel middleware, and AI agent MCP configurations.
  - Registered `/faq` route and `/faqs` canonical alias with bilingual i18n support in `zapwebp-docs` and `llms.txt`.

### Fixed

- **UI State Store Anti-Simulation (`@zapwebp/ui`)**:
  - Removed simulated progress and fallback object generation in `packages/ui/src/state/index.js` when no `uploader` callback was provided.
  - Implemented explicit fail-fast rejection throwing `E_UPLOADER_REQUIRED` with dedicated error mapping in `ERROR_MAP`.
- **Laravel Upload Middleware Logging (`@zapwebp/laravel`)**:
  - Added `\Illuminate\Support\Facades\Log::warning` to `ConvertUploads.php` to log conversion exceptions before falling open.
- **Dependency Security Patches & Sharp Upgrade**:
  - Upgraded `sharp` to `^0.35.5` in `@zapwebp/core` and `apps/vscode`, resolving inherited `libvips` (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590) and `libheif` vulnerabilities.
  - Upgraded `vite` in `zapwebp-docs` to `^8.3.5`, achieving clean zero-vulnerability audit (`pnpm audit`).
- **Workspace Version Synchronization**:
  - Synchronized root `package.json` version from `1.1.0` to `2.14.0` matching `CHANGELOG.md` and release governance.
- **Schema Resolution & SPA Rewrite Conflict (`zapwebp-docs/vercel.json`, `vercel.json`)**:
  - Fixed `Parse error at offset 0` in VS Code and IDE schema validators caused by documentation catch-all rewrite rules serving HTML (`index.html`) on schema requests.
  - Deployed `agent-manifest.json` and `plugins.schema.json` to static assets directories across `zapwebp-docs` and root web app.
  - Added strict Vercel rewrite exclusion pattern `((?!schemas/|content/|assets/|locales/|.*\\..*).*$)` preventing static assets with extensions or under `/schemas/` from being rewritten to `index.html`.
  - Added HTTP headers `Content-Type: application/json; charset=utf-8` and `Access-Control-Allow-Origin: *` for all `/schemas/(.*)` routes.
- **MCP Package Name & npx Resolution (`@zapwebp/mcp`)**:
  - Fixed documentation, quickstart guides, CLI error outputs, and examples across `content/mcp.md`, `content/index.md`, `content/developers.md`, `scripts/translate-docs.js`, and `zapwebp-docs/` from `npx zapwebp-mcp` (which caused npm registry 404 errors) to `npx -y @zapwebp/mcp`.
  - Explicitly clarified Claude Desktop, Cursor, and Windsurf MCP configuration templates with scoped package name `@zapwebp/mcp`.
- **Web App Deletion Persistence & IndexedDB Sync (`public/app.js`)**:
  - Fixed issue where deleting an individual image (`removeItem`) or clearing all converted files (`clearAllItems`) only cleared in-memory state while leaving IndexedDB (`zapwebp-db`) records intact, causing deleted images to reappear upon browser refresh.
  - Wired `dbDeleteFile(id)` into `removeItem(id)` and `dbClearFiles()` into `clearAllItems()`, guaranteeing permanent deletion across sessions.
- **Web App Workspace Decluttering (`public/index.html`, `public/styles.css`)**:
  - Removed visual hero clutter (`100% In-Browser · Zero Server Uploads`, `Convert correctly.`, and `Transparency preserved • Metadata stripped • Zero server uploads`), placing the converter workspace directly in primary focus.
  - Added semantic, screen-reader accessible `<h1>` (`.sr-only`) preserving WCAG 2.2 AA document hierarchy and search indexing without visual distraction.
- **Mobile Responsive Controls & Collapsible Settings Toolbar (`public/index.html`, `public/styles.css`, `public/app.js`)**:
  - Implemented collapsible settings cluster in the cockpit controls bar (`.cockpit-advanced-cluster`) with an interactive toggle button (`#cockpit-toggle-btn`) on screens < 640px.
  - Keeps primary format pills immediately reachable while hiding advanced controls (Scales, Quality slider, Lossless and Clean Mode switches) behind an on-demand expandable panel, eliminating mobile screen crowding.
  - Optimized single result card action buttons (`Download`, `Inspect`, `Crop`, `Share`, `Delete`) with responsive touch targets (minimum 44px) and full-width primary download button on mobile devices.
- **Brand Identity & Footer Design Redesign (`public/zapwebp.svg`, `public/index.html`, `public/styles.css`)**:
  - Restored authentic brand vector logo across all public and documentation asset directories.
  - Fixed footer link color overrides in dark mode and corrected `data-i18n` span targeting preventing text destruction.
- **Documentation SPA Rewrites & 404 Resolution (`zapwebp-docs/vercel.json`)**:
  - Fixed Vercel routing 404 error on `/cli`, `/mcp`, and documentation sub-pages by eliminating unsupported negative lookahead PCRE regex patterns in `source`.
  - Configured explicit static bypass rules for `/schemas/*`, `/content/*`, `/locales/*`, and `/assets/*`, while routing documentation routes to `/index.html`.
- **Custom Branded 404 Pages (`public/404.html`, `zapwebp-docs/public/404.html`)**:
  - Implemented standalone, zero-dependency, theme-reactive custom 404 error pages for both the web app and docs portal.
  - Features the authentic brand vector logo, high-contrast status badge, and recovery navigation to the Web Converter and Documentation Overview.
- **Visual Spacing & Screen-Reader Typography (`public/styles.css`)**:
  - Defined standard accessible `.sr-only` utility class ensuring semantic heading tags remain 100% visually hidden with zero layout impact.
  - Eliminated vertical over-stretching on mobile dropzone (`calc(100dvh - ...)`) in favor of balanced `230px` natural height.
  - Optimized desktop `.page-content` alignment and padding, eliminating excessive top/bottom voids.

## [2.13.1] - 2026-11-08

### Added

- **Vector SVG Brand Asset Optimization (`public/zapwebp.svg`, `public/assets/zapwebp.svg`, `zapwebp-docs/public/zapwebp.svg`)**:
  - Replaced 646 KB raster-embedded SVG logos with a precision-crafted, high-fidelity vector SVG (2.06 KB, 99.7% payload reduction).
  - Dramatically improves Largest Contentful Paint (LCP) and Speed Index metrics on web app and documentation sites.
- **Enhanced Footer Sitemap & Product Architecture Tagline (`public/index.html`, `public/styles.css`)**:
  - Added descriptive architecture tagline under the brand link communicating zero-telemetry, memory-only execution.
  - Added descriptive subtitles and badges across all documentation links in the 4-column sitemap directory.
  - Added direct extension download links for Open VSX and VS Marketplace.
- **Static Configuration Manifest (`public/zapwebp.json`)**:
  - Added clean default static configuration file eliminating console 404 errors during client-side target lock initialization.
- **Enhanced Single & Multiple Image Results View (`public/app.js`, `public/styles.css`)**:
  - Added dedicated Crop button and "+ Convert Another Image" trigger to the single image card layout.
  - Added Crop button alongside preview and download across grid cards and list view rows.
  - Enhanced elevation, border contrast, and touch targets across single card and batch grid components.

### Fixed

- **Web App Upload Blocker & Dropzone Black Screen (`public/app.js`)**:
  - Fixed `Uncaught ReferenceError: currentViewMode is not defined` on line 1838 when uploading single or multiple files.
  - Restored seamless transition between idle dropzone, converting skeleton, single-file card, and batch grid layout.
- **VS Code Extension Windows `spawn EINVAL` & CLI Discovery (`apps/vscode/src/core.js`)**:
  - Completely eliminated Windows `spawn EINVAL` errors by switching CLI execution to direct `node.exe` invocation with injected `NODE_PATH` and safe `cmd.exe /d /s /c` fallback patterns.
  - Updated extension icon to `apps/vscode/zapwebp_logo.png` and synced `apps/vscode/icon.png`.
  - Removed 8 redundant activation event warnings from `apps/vscode/package.json` for modern VS Code compatibility.
  - Repackaged `zapwebp-vscode-1.2.0.vsix` with zero warnings and verified multi-format conversion.
- **Accessibility & Heading Hierarchy (`public/index.html`, `public/tokens.css`)**:
  - Added `<h2 class="sr-only">Platform Directory &amp; Documentation</h2>` before footer columns and adjusted footer titles from `<h4>` to `<h3>` to ensure strictly descending heading levels.
  - Changed `<aside class="settings-slideover-panel" role="dialog">` to `<div class="settings-slideover-panel" role="dialog">` to comply with W3C HTML-ARIA rules.
  - Updated `--gray-600` text color in `public/tokens.css` from `#73776b` to `#575c50` (light mode) and `#9ca296` (dark mode), lifting contrast ratio from 4.3:1 to > 6.5:1 to exceed WCAG 2.1 AA requirements.
- **Mobile Cockpit Bar Responsiveness (`public/styles.css`)**:
  - Fixed flex-wrap layout glitch on mobile devices (320px–393px viewports) where the `3x` scale button awkwardly wrapped to a second line.
  - Added fluid equal-width distribution for `.format-pills` and `.scale-toggles` with `flex-wrap: nowrap !important;`.
- **Render-Blocking Resources & Security Headers (`public/index.html`, `public/vercel.json`)**:
  - Added `defer` attribute to `<script src="/vendor/fflate.min.js">` in `public/index.html`.
  - Removed stray `<br />` preceding `<h1>` to eliminate layout shift (CLS).
  - Added `Cross-Origin-Opener-Policy: same-origin-allow-popups` security header in `public/vercel.json`.

### Added

- **Centralized Zero-Trust SSRF Defense Module (`@zapwebp/shared/security`)**:
  - Implemented `isPrivateIp` and `validateSafeUrl` enforcing Rule 6.3 across all subsystems.
  - Automatically blocks IPv4 loopback (`127.0.0.0/8`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata services (`169.254.0.0/16`, `169.254.169.254`), CGNAT (`100.64.0.0/10`), IPv6 loopback (`::1`), link-local (`fe80::/10`), unique local (`fc00::/7`), and IPv4-mapped IPv6 ranges (`::ffff:...`).
  - Integrated into `@zapwebp/mcp` (`fetchUrlImage`), `@zapwebp/sdk` (`resolveInput`), and `@zapwebp/edge` (`createZapHandler`).
- **Self-Contained Standalone Runner in VS Code Extension (`apps/vscode`)**:
  - Bundled `dist/zap.js` directly into the VS Code extension package via `esbuild`, providing a complete local runner inside `dist/`.
  - Added `resolveNodeExecutable()` resolving the platform Node.js binary (`C:\Program Files\nodejs\node.exe`, standard paths) to safely execute the runner without command shell wrapping or Node CVE-2024-27980 restrictions.
  - Repackaged `zapwebp-vscode-1.2.0.vsix` with zero external runner requirements, supporting SVG, PNG, WebP, AVIF, JPEG, GIF, and TIFF across any workspace folder.

### Fixed

- **Cyclic Workspace Dependencies (`@zapwebp/crop` & `@zapwebp/plugin-sdk`)**:
  - Removed devDependency loop between `@zapwebp/crop` and `@zapwebp/plugin-sdk`, resolving all cyclic dependency warnings during pnpm package installation.
- **REST API Multipart Field & Extension Flexibility (`@zapwebp/api`)**:
  - Updated `/api/v1/convert` to accept image payloads across `file`, `image`, and `svg` form fields via `upload.fields`.
  - Relaxed extension validation for generic binary blobs (`.bin`) when magic bytes correspond to a supported raster/vector format.
- **SDK Remote API Mode Multipart Payload Alignment (`@zapwebp/sdk`)**:
  - Fixed remote conversion payload generation to infer extension from magic bytes (`detectFormat`) and populate both `file` and `svg` fields, ensuring seamless compatibility with any Zapwebp API endpoint.
- **Web App Modal i18n Translation Attributes (`public/index.html`)**:
  - Re-attached localized `data-i18n` attributes across preview modal view tabs, metrics, and action buttons (`modal.tab_converted`, `modal.tab_original`, `modal.tab_side_by_side`, `modal.dimensions`, `modal.file_size`, `modal.reduction`, `modal.btn_crop`, `modal.btn_download`).

## [2.12.0] - 2026-11-07

### Added

- **Full Web Platform Real-Time i18n Translation Engine (`public/app.js`, `public/locales`)**:
  - Implemented client-side translation engine supporting English (`en`) and Tagalog (`tl`) across hero, navigation, dropzone, cockpit controls, results cards, batch header, preview modal, crop dialog, and footer sitemap.
  - Added real-time language toggling via `#header-lang-btn` and `#footer-lang-btn` with localStorage persistence and immediate DOM updates without page reloads.
  - Added static JSON locale mirrors in `public/locales/` ensuring static host compatibility on Vercel (`Zapwebp/web`).
- **Open VSX & VS Marketplace Badges and Canonical Links**:
  - Added direct extension download links for Open VSX (`https://open-vsx.org/extension/ebula/zapwebp-vscode`) and VS Marketplace (`https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode`) in the web sitemap footer, `content/plugins/vscode.md`, `zapwebp-docs/public/content/plugins/vscode.md`, and `apps/vscode/README.md`.
- **Docs Canonical Sitemap URL Aliases (`zapwebp-docs/src/routes.ts`)**:
  - Added canonical alias mappings in `ROUTE_MAP` for `/vscode`, `/getting-started`, `/transparency`, `/clean-mode`, `/multipliers`, `/sdk`, `/vite`, `/next`, `/storage`, and `/github-action`, ensuring direct navigation without broken routes.
- **Resilient Multi-Tier VS Code Extension Architecture (`apps/vscode` v1.2.0)**:
  - Added complete multi-format conversion commands: `Zap to PNG` (`zapwebp.convertToPng`), `Zap to AVIF` (`zapwebp.convertToAvif`), `Zap to JPEG` (`zapwebp.convertToJpeg`), and `Zap to Any Format...` (`zapwebp.convertPrompt`).
  - Added dedicated `Zap Image To...` submenu in Explorer context menu, Editor context menu, and Editor tab title menu.
  - Added interactive multi-scale format prompt (`zapwebp.convertScalesPrompt`) for generating retina scale variants in WebP, PNG, or AVIF.
  - Added background flattening prompt on JPEG conversion (defaulting to `#ffffff`) to strictly prevent accidental black background artifacts on transparent inputs.
  - Added dynamic `Module._resolveFilename` native resolution hook enabling in-process `@zapwebp/core` and `sharp` execution directly from workspace and extension node_modules, bypassing subprocess overhead.
  - Packaged clean, self-contained `zapwebp-vscode-1.2.0.vsix` with verified multi-format conversion across SVG, PNG, WebP, AVIF, JPEG, GIF, and TIFF.

### Fixed

- **VS Code Extension Windows `spawn EINVAL` & Workspace CLI Discovery (`apps/vscode`)**:
  - Eliminated `Error: spawn EINVAL` on Windows by wrapping all `execFile` invocations in synchronous try-catch blocks, enforcing `{ shell: process.platform === 'win32' }`, and prioritizing direct in-process conversion via the `Module._resolveFilename` native module resolution hook.
  - Added workspace and relative path discovery for `@zapwebp/core` and `packages/cli/bin/zap.js` in `getCore()` and `findLocalCli()`, enabling instant in-process or local node CLI conversion without relying on globally installed binaries or network calls.
  - Added buffer magic byte format sniffing (`sniffInputExtension`) for temporary files during CLI fallback to ensure format-specific CLI handlers correctly identify the input format.
- **Vercel Serverless Function Rewrite Normalization (`vercel.json` & `server.js`)**:
  - Fixed `Cannot GET /server.js` 404 error when navigating to `zapwebp.vercel.app/api/v1` or `/health` by passing explicit `__zap_url` parameter in `vercel.json` rewrites and properly parsing it in `server.js` middleware before routing.
  - Added automatic 301 redirect from `/api` to `/api/v1` for consistent API discovery.
- **Core Native Engine Lazy Loading (`@zapwebp/core`)**:
  - Replaced top-level static `require('sharp')` and `require('@resvg/resvg-js')` with lazy loader functions `getSharp()` and `getResvg()` across core index, all 7 format handlers, and metadata registry.
  - Enabled `@zapwebp/core` to be imported cleanly in any Node or Electron environment without throwing `MODULE_NOT_FOUND` or ABI mismatch errors when native modules are absent.
  - Updated `detectFormat()` in core to consult format registry handlers first, ensuring dynamic format plugins are sniffed accurately.

## [2.11.1] - 2026-11-05

### Added

- **Open-Source Icon Standard Across Web Platform**:
  - Replaced legacy unicode emoji characters with clean, crisp, open-source Lucide/Feather outline SVG icons (`viewBox="0 0 24 24"`, 2px stroke width, rounded caps and joins) for Download, Preview/Inspect, Share, Delete/Trash, Grid View, List View, and Add More.
  - Added dedicated Inspect & Preview action buttons (`.btn-single-preview`, `.result-preview-btn`, `.btn-row-preview`) directly on single-file cards, grid cards, and list rows, opening the split-view comparison modal on click.
- **Dedicated Vercel Web Deployment Configuration**:
  - Created `public/vercel.json` with clean static headers and security policies specifically for `Zapwebp/web` standalone deployments.
  - Added Vercel Serverless Functions (`public/api/index.js`, `public/api/v1.js`, `public/api/health.js`) providing structured, informative JSON responses describing the client-side local-memory conversion architecture and linking to documentation, eliminating `Cannot GET /server.js` 404 errors.
- **Dedicated Batch Add More Quick Action**:
  - Added `#btn-batch-add` button directly inside the batch header bar allowing users to quickly queue additional images into active batches without resetting the workspace.

### Fixed

- **Dropzone Event Bubble & False Upload Trigger**:
  - Fixed issue where clicking the Grid View or List View toggle buttons, batch action buttons, or card controls bubbled to `#dropzone` and accidentally triggered the system file picker.
  - Enforced strict event propagation stopping (`e.stopPropagation()` and `e.preventDefault()`) across all view toggles and batch controls.
  - Added state-aware guard in the dropzone click listener ensuring the file picker only opens when the dropzone is in an idle state.
- **Dark Mode Transparency Checkerboard**:
  - Replaced stark high-contrast white-and-black chessboard pattern with a subtle, muted dark-gray geometric grid in dark mode (`#121510` / `#1d211b`), preventing eye strain on transparent SVG and PNG previews.

## [2.11.0] - 2026-11-05

### Added

- **Full Responsive & Device Optimization Architecture**:
  - Implemented 6-class responsive layout system: Mobile (`< 640px`), Closed Foldables (`280px – 340px`), Open Foldables (`670px – 730px`), Tablets (`640px – 1024px`), Laptops (`1024px – 1440px`), and Desktops (`> 1440px`).
  - Added fluid typography tokens (`--text-xs` to `--text-2xl` using `clamp()`) in `tokens.css`.
  - Enforced strict touch target standard: $\ge 44 \times 44\text{px}$ across all interactive buttons, toggles, chips, and controls on touch devices (`@media (pointer: coarse)`).
  - Enforced $16\text{px}$ font floor on inputs to prevent iOS Safari auto-zoom on mobile.
  - Implemented fluid dropzone height (`min-height: calc(100dvh - var(--header-height) - var(--footer-height) - safe-area)`) when idle, collapsing into a compact action bar upon file ingestion.
  - Added adaptive header navigation: hides secondary links on mobile/closed foldables, exposes Docs link on tablets, and surfaces full developer navigation (Docs, CLI, MCP) on laptops and desktops.
  - Upgraded settings slide-over into a full-width bottom sheet (`sheetSlideUp` animation, $90\text{dvh}$ height, rounded top) on mobile viewports (`< 640px`), transitioning to variable-width drawers on tablet ($400\text{px}$), foldable ($360\text{px}$), and desktop ($480\text{px}$).
  - Integrated dual-screen and foldable hinge avoidance using `@media (horizontal-viewport-segments: 2)` and `env(viewport-segment-...)`.
  - Added native Web Share API (`navigator.share`) integration on single converted cards for one-tap mobile sharing.
  - Added battery-aware optimization mode (`navigator.getBattery()`) disabling heavy animations and filters when battery level is $< 20\%$ and discharging.
  - Integrated Progressive Web Application (PWA) offline application shell caching via `sw.js` and updated `site.webmanifest` (`orientation: "any"`).
  - Added global desktop keyboard shortcuts `Cmd/Ctrl + ,` and `Cmd/Ctrl + K` to open the settings drawer, with `Escape` dismiss.

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
