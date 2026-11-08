# Zapwebp

Covers: pangkalahatang-ideya ng pag-convert ng imahe gamit ang Zapwebp, mga sinusuportahang platform (web, CLI, MCP, API), pangunahing mga prinsipyo, at mabilisang oryentasyon.

Does not cover: detalyadong mga flag ng command-line, mga schema ng MCP protocol, o mga detalye ng routing sa REST API. Tingnan ang [CLI](/cli) at [MCP](/mcp).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp logo.svg --to webp
```

Kino-convert ang `logo.svg` patungo sa transparent na `logo.webp` sa kasalukuyang folder.

## What it does

Kino-convert ng Zapwebp ang SVG at mga karaniwang raster na imahe patungong WebP, PNG, JPEG, at AVIF habang pinapanatili ang transparent na alpha channel. Gumagana ito nang lokal sa pamamagitan ng terminal, mga extension sa editor, at Model Context Protocol para sa AI, o direkta sa memorya sa web application nang walang remote storage.

## Surfaces

| Platform | Interface | Pangunahing command o URL | Ano ang ibinibigay nito |
|---|---|---|---|
| Web App | Browser | `https://zapwebp.vercel.app/` | Drag-and-drop na agarang conversion at maramihang pag-download gamit ang ZIP |
| CLI | Terminal | `npx zapwebp <file>` | Lokal na file, glob, watch daemon, at mga CI check |
| MCP Server | Stdio | `npx zapwebp-mcp` | Mga tool sa pag-convert at pag-optimize ng imahe para sa mga AI coding agent |
| HTTP API | REST | `POST /api/v1/convert` | Stateless na mga endpoint para sa pag-convert ng imahe |

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

| Code | Dahilan | Solusyon |
|---|---|---|
| `unsupported_format` | Hindi suportado ang format ng ibinigay na file | Magbigay ng SVG, PNG, JPEG, WebP, AVIF, GIF, o TIFF na file |
| `alpha_not_representable` | Pag-convert ng transparent na imahe patungong JPEG nang walang kulay ng likuran | Magpasa ng `--background "#ffffff"` o pumili ng WebP, PNG, o AVIF |
| `file_too_large` | Lumampas ang file sa pinakamataas na pinapayagang laki | Bawasan ang sukat ng imahe o mag-upload ng mas maliit na asset |

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

- [Convert](/convert): Mag-drop ng mga file sa browser at agad makuha ang WebP.
- [CLI](/cli): Magpatakbo ng mga conversion at maramihang operasyon mula sa command line.
