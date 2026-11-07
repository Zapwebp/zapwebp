# About Zapwebp

Covers: Project origins, mission, architectural design principles, author information, official repositories, and open-source licensing.

Does not cover: Technical API endpoints or CLI syntax. See [API](/api) and [CLI](/cli).

Applies to: Zapwebp platform and all official packages.

## Quick start

```bash
# Verify system integrity
npx zapwebp doctor
```

## What it does

Zapwebp was created to solve a persistent, frustrating defect in image processing tools: **accidental loss of transparency**. Standard conversion utilities frequently composite transparent SVGs and PNGs onto black or white backgrounds, corrupting UI icons and brand logos.

Zapwebp guarantees:
- **Zero Black Backgrounds**: Transparency is recognized and preserved bit-for-bit across all alpha-capable formats (SVG, PNG, WebP, AVIF).
- **Zero-Tracking Privacy**: In the browser, execution is 100% client-side memory using WebAssembly. No files are uploaded to remote servers. In terminal/MCP mode, processing is strictly local.
- **Enterprise Architecture**: Layered design separation between core libvips/resvg-js engine, shared constants, UI tokens, and vertical feature slices.

## Architecture Principles

| Principle | Meaning |
|---|---|
| **Drop. Convert. Done.** | No signup, no waitlists, no ads, no telemetry. Instant results. |
| **Fail Loudly** | Refuse to silently discard alpha channels or overwrite untracked files. |
| **Minimum Sufficient Architecture** | Zero bloated dependencies; native Web APIs and standard CJS/ESM modules. |
| **Agentic Readiness** | Structured machine-readable JSON schemas and `llms.txt` for AI pair programmers. |

## Official Repositories

All repositories live under the [`github.com/Zapwebp`](https://github.com/Zapwebp) organization:

| Repository | Description | Primary Surface |
|---|---|---|
| [`core`](https://github.com/Zapwebp/core) | The engine behind Zapwebp. Converts images correctly, preserves transparency, and strips metadata. | Shared conversion engine (`@zapwebp/core`) |
| [`cli`](https://github.com/Zapwebp/cli) | Terminal CLI and MCP server. Convert correctly from the command line or an AI agent. | Terminal executables (`zap`, `zapwebp`) & MCP server |
| [`web`](https://github.com/Zapwebp/web) | The browser interface. Runs conversions 100% locally in memory. | Web app ([zapwebp.vercel.app](https://zapwebp.vercel.app)) |
| [`docs`](https://github.com/Zapwebp/docs) | Markdown documentation for Zapwebp. | Docs portal ([zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)) |
| [`plugins`](https://github.com/Zapwebp/plugins) | Build tools, CI actions, and storage adapters. | Vite, Next.js, GitHub Action, Supabase, Firebase, Neocities |
| [`ui`](https://github.com/Zapwebp/ui) | Design system, tokens, and components. | Universal error & upload UI kit (`@zapwebp/ui`) |
| [`vscode`](https://github.com/Zapwebp/vscode) | VS Code extension. Right-click to convert correctly. | Editor extension (Open VSX & Marketplace) |
| [`laravel`](https://github.com/Zapwebp/laravel) | Laravel package for image conversion via the CLI. | PHP / Laravel bridge (`zapwebp/laravel`) |
| [`zapwebp`](https://github.com/Zapwebp/zapwebp) | Convert correctly. The umbrella repository for the Zapwebp ecosystem. | Workspace monorepo |
| [`.github`](https://github.com/Zapwebp/.github) | Organization profile, community health files, and issue templates. | Org health & community config |

## Team & Governance

Zapwebp is designed and operated by **Eldrex Delos Reyes Bula** in the Republic of the Philippines.

- **Organization**: [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **Web App**: [https://zapwebp.vercel.app/](https://zapwebp.vercel.app/)
- **Documentation**: [https://zapwebp-docs.vercel.app/](https://zapwebp-docs.vercel.app/)
- **Contact**: `eldrexdelosreyesbula@gmail.com`
- **License**: MIT ([LICENSE](https://github.com/Zapwebp/zapwebp/blob/main/LICENSE))

## Errors

| Code | Cause | Fix |
|---|---|---|
| `about_general` | General inquiries or bug reports | Open an issue on GitHub or email project support |

## For agents

```json
{
  "project": "Zapwebp",
  "author": "Eldrex Delos Reyes Bula",
  "organization": "https://github.com/Zapwebp",
  "repositories": [
    "core",
    "cli",
    "web",
    "docs",
    "plugins",
    "ui",
    "vscode",
    "laravel",
    "zapwebp",
    ".github"
  ],
  "license": "MIT",
  "doctrine": "Drop. Convert. Done.",
  "canonicalUrl": "https://zapwebp.vercel.app/"
}
```

## Related

- [Safety](/safety): Security rules and sandbox boundaries.
- [Formats](/formats): Supported input and output specifications.
- [Developers](/developers): Platform tools, CLI commands, and SDK guides.
