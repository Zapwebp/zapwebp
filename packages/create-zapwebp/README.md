# `create-zapwebp`

Scaffold production-ready Zapwebp plugins, storage adapters, custom transformations, and metadata handlers in seconds.

## Quick Start

```bash
npm create zapwebp@latest
# or
pnpm create zapwebp
```

Or specify template and name non-interactively:

```bash
pnpm create zapwebp my-plugin --type format
```

## Available Archetype Templates

| Archetype | Flag | Description |
|---|---|---|
| `format` | `--type format` | Community format expansion handler (`zapwebp-format-*`) with sniffer, decoder, and alpha validation. |
| `storage` | `--type storage` | Cloud storage upload adapter (`@zapwebp/storage-*`) with pre-upload conversion and cascade deletion. |
| `transform` | `--type transform` | Image manipulation plugin (`@zapwebp/transform-*`) operating on raw in-memory RGBA pixel buffers. |
| `meta` | `--type meta` | Custom metadata sanitizer (`zapwebp-meta-*`) with chunk extraction and preservation predicates. |

## What's Included in Generated Projects

- Dual CommonJS and ESM packaging (`tsup` / Node.js native).
- Integration test harnesses using `@zapwebp/plugin-sdk`.
- Complete TypeScript declaration definitions (`.d.ts`).
- Ready-to-publish `.npmignore`, `README.md`, and GitHub Actions CI workflow.

## License

MIT © Zapwebp

