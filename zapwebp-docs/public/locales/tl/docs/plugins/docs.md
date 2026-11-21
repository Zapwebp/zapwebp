# Docs Delivery Engine

Covers: ang `@zapwebp/docs` pangkalahatang makina sa paghahatid ng dokumentasyon, zero-framework static HTML generation, eksaktong `.md` mirrors bawat byte, `llms.txt`, `sitemap.xml`, `robots.txt`, `agent.json`, client search indexing, CLI subcommands (`build`, `serve`, `init`), at programmatic Node.js APIs.

Does not cover: client-side SPA frameworks (React/Vue/Astro) o server-side hydration.

Applies to: `@zapwebp/docs` v1.0.0 at mas bago.

## Quick start

```bash
npm install -D @zapwebp/docs
```

```bash
# Simulan ang proyekto ng dokumentasyon
npx zapwebp-docs init

# Bumuo ng static documentation site
npx zapwebp-docs build

# I-preview ang site sa lokal
npx zapwebp-docs serve --port 3000
```

Programmatic build:

```javascript
import { buildDocs } from '@zapwebp/docs';

const report = await buildDocs('./docs.config.json', {
  output: { dir: 'dist' },
});

console.log(`Naipon ang ${report.pageCount} pahina sa loob ng ${report.durationMs}ms`);
```

## What it does

- **Zero Framework at Zero Runtime**: Gumagawa ng 100% static HTML na mga pahina nang walang server-side rendering, zero hydration, at hindi nangangailangan ng JavaScript para basahin ang anumang pahina.
- **Tatlong-Audience na Output**: Nagbibigay ng nababasang dokumentasyon para sa mga tao, static HTML na may JSON-LD at sitemap para sa mga search engine crawler, at `.md` mirrors, `llms.txt`, at `agent.json` para sa mga AI agent.
- **Zero Dependencies**: Umaasa lamang sa `marked` para sa pag-parse ng Markdown. Lahat ng pagproseso ng file, pag-template, preview server, at pagkopya ng asset ay gumagamit ng mga standard na built-in sa Node.js.
- **Accessible at Responsive**: Umaabot sa WCAG 2.2 AA accessibility standards na may semantic markup, skip links, table wrappers, dark/light theme switching, at mabilisang paghahanap sa client.
- **Ganap na Nako-configure at Bukas**: Sumusuporta sa wika ng pahina (`lang`), pasadyang `<head>` tags (`head`), mga icon at favicon (`theme.icon`, `theme.favicon`), localized na placeholder sa paghahanap (`theme.searchPlaceholder`), pagkopya ng folder ng asset (`assets.dir`), at mga panuntunan sa sitemap nang walang hardcoding.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CONFIG_NOT_FOUND` | Nawawala ang `docs.config.json` file | Patakbuhin ang `npx zapwebp-docs init` o magpasa ng `--config <path>`. |
| `E_PARSE_FAILED` | Maling JSON syntax sa configuration file | Ayusin ang JSON syntax sa `docs.config.json`. |
| `E_NO_CONTENT` | Walang `.md` files sa content directory | Siguraduhing may mga Markdown file sa tinukoy na `content.dir`. |

## Related

- [Scaffolding](/scaffolding) — CLI plugin generator para sa mga tool sa ekosistema ng Zapwebp.
- [AI Integration](/ai-integration) — Pagtuklas ng LLM at mga configuration ng tool sa MCP.
- [CLI Reference](/cli) — Mga workflow at tool sa command-line.

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
