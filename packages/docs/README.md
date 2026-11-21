# @zapwebp/docs — Universal Documentation Delivery Engine

A self-contained, zero-dependency, MIT-licensed documentation delivery engine that transforms Markdown files into static, bot-crawlable, AI-discoverable, and human-readable documentation sites.

Outputs complete static HTML, `.md` mirrors, `llms.txt`, `sitemap.xml`, `robots.txt`, `agent.json`, and client search from a single build step.

---

## 1. The Problem It Solves

Traditional documentation tools force an unnecessary trade-off:

| Tool Category | Human Experience | Search Engine Bot Experience | AI Agent Experience | Dependencies |
|---|---|---|---|---|
| **Client-Side SPA Docs** (Docusaurus SPA, VitePress) | Interactive | Empty root shells, hydration delays | Hard to crawl without JS execution | 200+ packages |
| **Static Site Generators** (Nextra, Astro) | Good | Good | Requires manual plugins or custom scripting | Complex framework configs |
| **Raw Markdown / GitHub** | Basic | Good | Good | Zero |
| **@zapwebp/docs** | Fast, styled, searchable | 100% static HTML, JSON-LD, sitemap | Byte-exact `.md` mirrors, `llms.txt`, `agent.json` | **Zero** (only `marked`) |

### What Each Audience Receives

- **Humans**: Responsive, accessible (WCAG 2.2 AA), styled, dark/light theme aware documentation with instant client-side search. First paint < 500ms; every page < 20KB HTML.
- **Search Engines**: Static HTML per page, proper Open Graph and Twitter Card tags, clean URLs, and `sitemap.xml`.
- **AI Crawlers**: Byte-for-byte `.md` mirrors for raw context reading, `llms.txt` catalog, and `robots.txt` granting explicit crawler access.
- **AI Agents**: Machine-readable `agent.json` providing structured route mapping and heading hierarchies.

---

## 2. Design Principles

1. **Zero Framework**: No React, Vue, Next.js, or Astro. Plain HTML, CSS, and minimal progressive JavaScript.
2. **Zero Runtime**: Output consists of pure static files. No server-side rendering or runtime hydration.
3. **Zero Dependencies**: The build pipeline relies solely on `marked` for Markdown parsing. Everything else is implemented with Node.js built-ins.
4. **Markdown Is the Source**: Pages are written in standard Markdown with optional frontmatter. No proprietary dialects or MDX syntax.
5. **Bots First, Humans Second**: Every page is fully readable without JavaScript. JavaScript enhances but is never required.
6. **Universal & MIT Licensed**: Built for Zapwebp first, but fully decoupled and usable for any open-source or commercial documentation project.

---

## 3. Quick Start

### Installation

```bash
npm install -D @zapwebp/docs
# or
pnpm add -D @zapwebp/docs
```

### Initialize Project

```bash
npx zapwebp-docs init
```

This creates:
- `docs.config.json`
- `content/index.md`

### Build Static Site

```bash
npx zapwebp-docs build
```

Compiles all Markdown files from `content/` into `dist/`.

### Preview Locally

```bash
npx zapwebp-docs serve --port 3000
```

---

## 4. Configuration (`docs.config.json`)

```json
{
  "title": "Zapwebp Docs",
  "description": "Documentation for Zapwebp — convert correctly.",
  "url": "https://zapwebp-docs.vercel.app",
  "author": {
    "name": "Zapwebp",
    "url": "https://zapwebp.vercel.app"
  },
  "content": {
    "dir": "content",
    "extensions": [".md"]
  },
  "output": {
    "dir": "dist",
    "html": true,
    "markdown": true,
    "llmsTxt": true,
    "sitemap": true,
    "robots": true,
    "agentJson": true,
    "searchIndex": true
  },
  "theme": {
    "tokens": "public/tokens.css",
    "logo": "/favicon.svg",
    "font": "Inter, system-ui, sans-serif",
    "github": "https://github.com/Zapwebp"
  },
  "navigation": [
    { "title": "Getting Started", "path": "/" },
    { "title": "CLI", "path": "/cli" },
    { "title": "MCP", "path": "/mcp" },
    { "title": "API", "path": "/api" },
    { "title": "Plugins", "path": "/plugins" },
    { "title": "Errors", "path": "/errors" }
  ]
}
```

---

## 5. Markdown Authoring

Frontmatter is completely optional. If omitted, the title is automatically extracted from the first `#` heading, and the description is derived from the first paragraph or `Covers:` block.

```markdown
---
title: CLI
description: Convert images from the terminal.
---

# CLI

Covers: converting images from the terminal.
Does not cover: web app, MCP server.
Applies to: zapwebp v1.2.0+.

## Quick start

\`\`\`bash
npx zapwebp ./icons
\`\`\`

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| \`--to\` | string | \`webp\` | Target format |
| \`--quality\` | number | \`85\` | Lossy quality |
```

---

## 6. Generated Outputs

Running `zapwebp-docs build` produces the following files in `dist/`:

- **Static HTML Pages**: `dist/index.html`, `dist/cli/index.html` (with canonical URLs, Schema.org `TechArticle` JSON-LD, semantic layout).
- **Markdown Mirrors**: `dist/index.md`, `dist/cli.md` (exact byte-for-byte copies of the source Markdown for AI context window consumption).
- **`dist/llms.txt`**: Standardized catalog of all pages and descriptions for LLMs.
- **`dist/llms-full.txt`**: Complete concatenated documentation markdown for single-prompt context loading.
- **`dist/sitemap.xml`**: Valid XML sitemap with calculated priority scores.
- **`dist/robots.txt`**: Direct crawler access rules for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, and `Applebot-Extended`.
- **`dist/agent.json`**: Machine-readable route index with heading structure.
- **`dist/search-index.json`**: Lightweight client-side search index.

---

## 7. CLI Reference

| Command | Description |
|---|---|
| `zapwebp-docs build` | Build static HTML and manifest assets |
| `zapwebp-docs serve` | Start local static HTTP server |
| `zapwebp-docs init` | Scaffold starter configuration and content directory |

### Options

- `-c, --config <file>`: Custom configuration path (default: `docs.config.json`).
- `--content <dir>`: Custom content directory (default: `content`).
- `-o, --output <dir>`: Custom output directory (default: `dist`).
- `-p, --port <number>`: Port for preview server (default: `3000`).
- `--json`: Output build metrics in JSON format.

---

## 8. Programmatic API

```javascript
const { buildDocs, serveDocs, initDocs } = require('@zapwebp/docs');

// Programmatic build
const result = await buildDocs('./docs.config.json', {
  output: { dir: './dist' }
});

console.log(`Built ${result.pageCount} pages in ${result.durationMs}ms`);

// Preview server
const server = await serveDocs({ dir: './dist', port: 8080 });
console.log(`Listening on ${server.url}`);
```

---

## 9. License

MIT © [Eldrex Delos Reyes Bula](https://github.com/Zapwebp)
