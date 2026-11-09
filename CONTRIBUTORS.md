# Contributors Directory — Zapwebp

We extend our deepest appreciation to everyone who contributes code, documentation, architectural reviews, translations, and security audits to the Zapwebp ecosystem.

> **Official Portal:** [https://zapwebp-docs.vercel.app/contributing](https://zapwebp-docs.vercel.app/contributing)  
> **Source Code:** [https://github.com/Zapwebp](https://github.com/Zapwebp)

---

## 1. Project Lead & Core Maintainer

| Contributor | Role | Focus Areas | GitHub |
|---|---|---|---|
| **Eldrex Delos Reyes Bula** | Project Lead & Author | Core Engine, MCP Protocol, CLI, VS Code Extension, Documentation, Localization | [@Zapwebp](https://github.com/Zapwebp) |

---

## 2. Recognized Core Ecosystem Contributors

| Domain / Package | Contributions & Responsibilities | Status |
|---|---|---|
| **`@zapwebp/core`** | libvips/sharp raster engine, resvg vector rasterization, alpha preservation guarantees | Active |
| **`@zapwebp/ui`** | Universal accessible error UI kit, CSS design tokens, state store, multi-framework adapters | Active |
| **`@zapwebp/crop`** | Smart-Subject saliency (attention & entropy), Body-Posture MoveNet integration, Object-Aware segmentation | Active |
| **`@zapwebp/storage`** | Cloud storage adapters (Supabase, Firebase, Neocities) with exponential backoff retry policies | Active |
| **`@zapwebp/mcp`** | Model Context Protocol AI tools (`convert_image`, `inspect_image`, `audit_conversion`) | Active |
| **`@zapwebp/cli`** | High-performance CLI executables (`zap`, `zapwebp`), reversible transaction journaling | Active |
| **`apps/vscode`** | Multi-tier VS Code / Antigravity IDE extension, convert-on-save watcher, Retina scale generation | Active |
| **`@zapwebp/laravel`** | Laravel service provider, Blade directives (`@picture`, `@srcset`), Artisan console commands | Active |
| **`@zapwebp/vite`** | Vite plugin for asset bundling, picture markup generation, and dev server middleware | Active |
| **`@zapwebp/next`** | Next.js custom image loader (`zapwebpLoader`) and Webpack asset transformation | Active |

---

## 3. Localization Maintainers

See [TRANSLATORS.md](TRANSLATORS.md) for the authoritative directory of translators and language maintainers across English (`en`) and Tagalog (`tl`).

---

## 4. How to Be Listed

To be recognized in this directory:
1. Open a pull request that fixes a bug, adds a feature, improves documentation, or contributes a community plugin.
2. Ensure all workspace checks pass (`pnpm test` and `node scripts/validate-locales.js`).
3. Add your name and contribution focus area to this file in your PR.
4. Once merged, you are permanently credited here and in [CHANGELOG.md](CHANGELOG.md).
