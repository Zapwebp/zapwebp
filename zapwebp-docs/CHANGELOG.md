# Changelog

All notable changes to the Zapwebp Documentation application (`zapwebp-docs`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-11-04

### Added
- Dedicated SDK documentation routes: Core (`/sdk/core`), Plugin (`/sdk/plugin`), UI (`/sdk/ui`), CLI (`/sdk/cli`), Storage (`/sdk/storage`), and Edge (`/sdk/edge`).
- Dedicated plugin documentation routes: VS Code (`/plugins/vscode`), Laravel (`/plugins/laravel`), and Lens (`/plugins/lens`).
- Dynamic head metadata injection: dynamic canonical links, meta description, and schema.org `TechArticle`/`FAQPage` JSON-LD structured data.
- Dual-deployment alignment with canonical domain `https://zapwebp-docs.vercel.app` and web app `https://zapwebp.vercel.app`.
- Full crawler access configuration in `robots.txt` for AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`).

## [2.0.0] - 2026-11-03

### Added
- Complete rewrite of the documentation shell as a zero-dependency Kite client-side SPA.
- Live client-side search across all documents with keyboard shortcuts (`Ctrl+K`, `/`).
- Multilingual i18n support with instant language switching (English, Tagalog).
- Syntax-highlighted code blocks with one-click copy feedback.
- Machine-readable `llms.txt` and raw markdown mirror endpoints.
