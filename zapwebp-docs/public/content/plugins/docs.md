# Docs Delivery Engine

Covers: the `@zapwebp/docs` universal documentation delivery engine, zero-framework static HTML generation, byte-exact `.md` mirrors, `llms.txt`, `sitemap.xml`, `robots.txt`, `agent.json`, client search indexing, CLI subcommands (`build`, `serve`, `init`), and programmatic Node.js APIs.

Does not cover: client-side SPA frameworks (React/Vue/Astro) or server-side hydration.

Applies to: `@zapwebp/docs` v1.0.0 and later.

## Quick start

```bash
npm install -D @zapwebp/docs
```

```bash
# Initialize documentation project
npx zapwebp-docs init

# Build static documentation site
npx zapwebp-docs build

# Preview site locally
npx zapwebp-docs serve --port 3000
```

Programmatic build:

```javascript
import { buildDocs } from '@zapwebp/docs';

const report = await buildDocs('./docs.config.json', {
  output: { dir: 'dist' },
});

console.log(`Compiled ${report.pageCount} pages in ${report.durationMs}ms`);
```

## What it does

- **Zero Framework & Zero Runtime**: Generates 100% static HTML pages with zero server-side rendering, zero hydration, and zero JavaScript required to read any page.
- **Triple-Audience Output**: Generates human-readable responsive documentation, search-engine crawler static HTML with JSON-LD and sitemaps, and AI-agent discoverable `.md` mirrors, `llms.txt`, and `agent.json`.
- **Zero Dependencies**: Relies solely on `marked` for Markdown parsing. All file processing, templating, server previewing, and asset copying use standard Node.js built-ins.
- **Accessible & Responsive**: Meets WCAG 2.2 AA accessibility standards with semantic markup, skip links, table wrappers, dark/light theme switching, and instant client-side search.
- **Fully Configurable & Open**: Supports configurable page language (`lang`), custom `<head>` injections (`head`), custom icons/favicons (`theme.icon`, `theme.favicon`), custom search placeholders (`theme.searchPlaceholder`), assets directory mirroring (`assets.dir`), and sitemap priority rules without hardcoding.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_CONFIG_NOT_FOUND` | Missing `docs.config.json` file | Run `npx zapwebp-docs init` or supply `--config <path>`. |
| `E_PARSE_FAILED` | Malformed JSON in configuration file | Correct JSON syntax in `docs.config.json`. |
| `E_NO_CONTENT` | Content directory contains no `.md` files | Ensure Markdown files exist in the configured `content.dir`. |

## Related

- [Scaffolding](/scaffolding) — CLI plugin generator for Zapwebp ecosystem tools.
- [AI Integration](/ai-integration) — LLM discovery and MCP tool configurations.
- [CLI Reference](/cli) — Command-line workflows and tools.

## For agents

```json
{
  "pkg": "@zapwebp/docs",
  "version": "1.0.0",
  "contract": "buildDocs(configOrPath?: string | object, overrides?: object, cwd?: string): Promise<BuildResult>",
  "binaries": ["zapwebp-docs", "docs"],
  "canonicalUrl": "https://zapwebp-docs.vercel.app",
  "outputs": [
    "dist/<path>/index.html",
    "dist/<path>.md",
    "dist/llms.txt",
    "dist/llms-full.txt",
    "dist/sitemap.xml",
    "dist/robots.txt",
    "dist/agent.json",
    "dist/search-index.json"
  ]
}
```
