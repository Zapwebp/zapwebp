# Zapwebp

Covers: overview of Zapwebp image conversion, supported surfaces (web, CLI, MCP, API), core principles, and quick orientation.

Does not cover: in-depth command-line flags, MCP protocol schemas, or raw API routing details. See [CLI](/cli) and [MCP](/mcp).

Applies to: Zapwebp v1.1.0 and later.

## Quick start

```bash
npx zapwebp logo.svg --to webp
```

Converts `logo.svg` to a transparent `logo.webp` in the current folder.

## What it does

Zapwebp converts SVG and common raster images to WebP, PNG, JPEG, and AVIF while preserving transparent alpha channels. It operates locally through the terminal, editor extensions, and AI model context protocols, or in-memory through the web app without remote storage.

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

