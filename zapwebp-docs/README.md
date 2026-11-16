# zapwebp-docs

<p align="center">
  <img src="/zapwebp.svg" alt="Zapwebp logo" width="64" height="64" />
</p>

Official, agentic-ready documentation application for Zapwebp built with [@kitelet/core](https://github.com) and [marked](https://marked.js.org/).

Covers: Documentation web application architecture, markdown parsing with marked, multilingual Tagalog routing, syntax highlighting, client-side search, and raw agent endpoints (`/:page.md`).

Does not cover: Main image conversion engine (see `@zapwebp/core`) or CLI binaries.

Applies to: `zapwebp-docs` v1.0.0 and later, modern browsers, Node.js >=22.0.0.

## Quick start

```bash
# Navigate to docs package
cd zapwebp-docs

# Install dependencies and launch dev server
pnpm install
pnpm dev
```

## What it does

`zapwebp-docs` serves as the official documentation portal for the Zapwebp platform (`https://zapwebp-docs.vercel.app`):
- **Zero Heavy Frameworks**: Pure HTML + CSS + 3-line Kite render architecture. No Next.js or React hydration overhead.
- **Client-Side Markdown**: Fetches raw markdown from `/content/*.md` or `/locales/tl/docs/*.md` and renders on mount.
- **Unified Nav & Skip Links**: Accessible keyboard navigation with fixed responsive sidebar.
- **Instant Code Snippet Copy**: Automated 1-click clipboard integration for all code blocks.
- **Dual Human & Agent Endpoints**: Serves both structured HTML rendering and raw `/:page.md` endpoints for AI assistant contexts.

## Development

```bash
# In zapwebp-docs
pnpm install
pnpm dev
```

## Production Deployment

Deployed to Vercel with SPA rewrite rules in `vercel.json` and permanent caching headers for static assets:

```bash
npm run build --prefix zapwebp-docs
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_DOC_NOT_FOUND` | Requested document key does not exist in `/content/*.md` | Verify route path in `routes.ts` |
| `E_MARKDOWN_PARSE` | Malformed Markdown tokens or unclosed code blocks | Run `node --test test/docs.test.js` to validate markdown files |

## For agents

```json
{
  "tool": "zapwebp-docs",
  "portal": "https://zapwebp-docs.vercel.app",
  "routesCatalog": "public/llms.txt",
  "rawMarkdownRoute": "/:page.md",
  "languages": ["en", "tl"]
}
```

## Related

- [Documentation Portal](https://zapwebp-docs.vercel.app): Live production documentation.
- [llms.txt Catalog](https://zapwebp-docs.vercel.app/llms.txt): Agentic discovery index.
- [Content Catalog](/content): Source markdown files for all documentation pages.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
