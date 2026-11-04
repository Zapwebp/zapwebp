# `zapwebp-docs`

<p align="center">
  <img src="/zapwebp.svg" alt="Zapwebp logo" width="64" height="64" />
</p>

Official, agentic-ready documentation application for Zapwebp built with [@kitelet/core](https://github.com) and [marked](https://marked.js.org/).

## Features

- **Zero Heavy Frameworks**: Pure HTML + CSS + 3-line Kite render architecture. No Next.js or React hydration overhead.
- **Client-Side Markdown**: Fetches raw markdown from `/content/*.md` and renders on mount.
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

Deployed to Vercel with SPA rewrite rules in `vercel.json` and permanent caching headers for static assets.

## License

MIT © Zapwebp Team

