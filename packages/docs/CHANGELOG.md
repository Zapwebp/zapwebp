# Changelog — @zapwebp/docs

All notable changes to `@zapwebp/docs` are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-20

### Added

- **Universal Documentation Delivery Engine Core**:
  - Zero-framework, zero-runtime documentation engine producing static HTML, byte-for-byte `.md` mirrors, `llms.txt`, `llms-full.txt`, `sitemap.xml`, `robots.txt`, `agent.json`, and `search-index.json` from a single build command.
  - Zero dependencies beyond `marked` (`^18.1.2`).
- **Markdown & Frontmatter Processing**:
  - Optional YAML frontmatter parsing with automatic fallback inference (H1 for title, first paragraph or `Covers:` block for description).
  - Slugified heading IDs with accessible permalink anchors.
  - Responsive table wrappers (`.table-wrap`) preventing horizontal layout breaking on mobile devices.
  - Code blocks with language pills, copy-to-clipboard functionality, and syntax styling.
  - GitHub-style alert callouts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`).
- **Bots & AI Agent Discoverability**:
  - Per-page Schema.org `TechArticle` JSON-LD structured data.
  - Byte-for-byte raw Markdown mirrors at `/path.md` for AI context ingestion.
  - `llms.txt` and `llms-full.txt` catalogs compliant with the llms.txt standard.
  - `sitemap.xml` with automatic priority weighting.
  - `robots.txt` granting explicit crawler access to GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and Applebot-Extended.
  - Machine-readable `agent.json` route directory with headings and summaries.
- **Human-Craft UI & Accessible Design**:
  - Pure HTML/CSS accessible layout complying with WCAG 2.2 AA.
  - Respects `prefers-color-scheme` with manual dark/light toggle and `localStorage` persistence.
  - Instant client-side search dialog activated via `/` or `Ctrl+K`.
  - Next/Previous page pagination and breadcrumb navigation.
- **CLI & Tooling**:
  - `zapwebp-docs build`: compiles markdown sources according to `docs.config.json`.
  - `zapwebp-docs serve` / `preview`: zero-dependency local static HTTP preview server with clean URL support.
  - `zapwebp-docs init`: scaffolds starter configuration and template.
