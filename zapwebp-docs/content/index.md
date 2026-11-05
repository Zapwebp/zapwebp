# Zapwebp

Covers: overview of Zapwebp image conversion, supported surfaces (web, CLI, MCP, API), core principles, comparison matrix, and quick orientation.

Does not cover: in-depth command-line flags, MCP protocol schemas, or raw API routing details. See [CLI](/cli) and [MCP](/mcp).

Applies to: Zapwebp v1.1.0 and later.

## Quick start

```bash
npx zapwebp logo.svg --to webp
```

Converts `logo.svg` to a transparent `logo.webp` in the current folder.

[![Open App](https://img.shields.io/badge/Open%20App-Zapwebp%20Web-22c55e?style=for-the-badge)](https://zapwebp.vercel.app)

[Open App ↗](https://zapwebp.vercel.app)

## What it does

> **Convert correctly.**  
> Transparency preserved. Metadata stripped. Output verified. Same engine across the browser, terminal, build tools, and AI agents.

Zapwebp converts SVG and common raster images to WebP, PNG, JPEG, and AVIF while preserving transparent alpha channels. It operates locally through the terminal, editor extensions, and AI model context protocols, or in-memory through the web app without remote storage.

### Feature Grid

| Capability | Module / Package | Description |
|---|---|---|
| **Core Engine** | `@zapwebp/core` | Deterministic alpha preservation, SVG sanitization, and format registry |
| **Terminal CLI** | `zapwebp` / `zap` | Single file, batch glob, watch mode, manifest export, and CI checks |
| **AI Agents** | `@zapwebp/mcp` | Model Context Protocol tools for Cursor, Windsurf, Claude, and Codex |
| **Framework Plugins** | `@zapwebp/plugin-sdk` | Vite, Next.js, and GitHub Actions for automated build pipeline asset conversion |
| **Storage Adapters** | `@zapwebp/storage` | Zero-loss pre-upload conversion for Supabase, Firebase, and Neocities |
| **Lens Inspector** | `zapwebp-lens` | In-depth container chunk analysis, EXIF validation, and checkerboard preview |

### Comparison Matrix

| Feature | Zapwebp | ImageMagick | Sharp (libvips) | Online Converters |
|---|---|---|---|---|
| **Transparency** | Preserved & verified | Requires manual flags | Manual pipeline | Unpredictable loss |
| **Execution** | Pure local memory / WASM | Local machine | Local Node.js | Remote cloud upload |
| **Privacy & Telemetry** | Zero uploads, zero telemetry | Local | Local | Remote tracking & storage |
| **Metadata Stripping** | Automatic Clean Mode (EXIF/C2PA) | Manual `-strip` flag | Manual `.withMetadata(false)` | Often retained |
| **Resolution Limits** | Local RAM bound | Local disk bound | RAM bound | Strict 4.5 MB server caps |
| **AI Agent MCP** | Native MCP server | None | None | None |

## Surfaces

| Surface | Interface | Primary command or URL | What it provides |
|---|---|---|---|
| Web App | Browser | `https://zapwebp.vercel.app/` | Drag-and-drop instant conversion and batch downloads |
| CLI | Terminal | `npx zapwebp <file>` | Local file, glob, watch, and CI checks |
| MCP Server | Stdio | `npx zapwebp-mcp` | Image conversion and optimization tools for AI agents |
| HTTP API | REST | `POST /api/v1/convert` | Stateless image conversion endpoints |

## Examples

### Check image and convert to WebP

```bash
$ npx zapwebp logo.svg --to webp
✓ logo.svg → logo.webp (2418 bytes)
```

### Inspect image metadata

```bash
$ npx zapwebp-mcp
{"result":{"serverInfo":{"name":"zapwebp","version":"1.1.0"}},"jsonrpc":"2.0","id":1}
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `unsupported_format` | Input file format is not supported | Supply an SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF file |
| `alpha_not_representable` | Converting transparent image to JPEG without background | Supply `--background "#ffffff"` or target WebP, PNG, or AVIF |
| `file_too_large` | File exceeds maximum size limits | Reduce input dimensions or upload a smaller asset |

## For agents

```json
{
  "tool": "zapwebp",
  "surfaces": ["cli", "mcp", "api", "web"],
  "inputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputs": ["webp", "png", "jpeg", "avif"],
  "guarantees": {
    "alphaPreservation": true,
    "statelessExecution": true,
    "metadataStripped": true
  }
}
```

## Related

- [Convert](/convert): Drop files in the browser and get WebP back.
- [CLI](/cli): Run conversions and batch operations from the command line.
- [MCP](/mcp): Connect AI coding agents to image conversion tools.
- [Formats](/formats): Comprehensive format capability and alpha channel matrix.
- [Safety](/safety): Zero-trust security, SVG sanitization, and SSRF prevention.
- [Errors](/errors): Complete machine and human-readable error catalog.
