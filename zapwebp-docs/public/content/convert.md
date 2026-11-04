# Convert

Covers: web-based image conversion, browser drag-and-drop workflow, client-side options, and output formats.

Does not cover: command-line operations or MCP integrations. See [CLI](/cli) and [MCP](/mcp).

Applies to: Zapwebp web app v1.1.0 and later.

## Quick start

```bash
open https://zapwebp.vercel.app/
```

Drop an SVG or raster image onto the dropzone to convert immediately.

## What it does

The web application converts images inside the browser window using in-memory server processing. Files are processed on demand without intermediate disk caching, databases, or analytics tracking, and transparency is maintained automatically.

## Options

| Control | Type | Default | What it does |
|---|---|---|---|
| Dropzone | `file` | Empty | Accepts single or multiple images |
| Quality | `integer` | `85` | Compression quality factor from 1 to 100 |
| Width | `integer` | `2048` | Output raster width bound (512, 1024, 2048, 4096) |
| Lossless | `boolean` | `false` | Enables exact pixel fidelity for WebP and AVIF |

## Examples

### Convert single SVG

```bash
$ curl -F "svg=@icon.svg" https://zapwebp.vercel.app/api/v1/convert -o icon.webp
✓ Saved icon.webp with transparency preserved
```

### Batch convert raster images

```bash
$ curl -F "files=@photo1.png" -F "files=@photo2.png" https://zapwebp.vercel.app/api/v1/batch
{"results":[{"name":"photo1.webp","format":"webp"},{"name":"photo2.webp","format":"webp"}]}
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `empty_upload` | No file selected for conversion | Choose or drop at least one image |
| `batch_limit_exceeded` | Upload exceeds file count or byte limit | Split conversion into smaller batches |
| `jpeg_alpha_conflict` | Transparent image converted to JPEG | Flatten transparency onto white or pick WebP |

## For agents

```json
{
  "tool": "zapwebp-web-convert",
  "endpoint": "/api/v1/convert",
  "method": "POST",
  "enctype": "multipart/form-data",
  "fields": {
    "svg": { "type": "file", "required": true },
    "to": { "type": "string", "default": "webp" },
    "quality": { "type": "integer", "default": 85 },
    "width": { "type": "integer", "default": 2048 }
  }
}
```

## Related

- [Formats](/formats): Supported input and output formats.
- [Safety](/safety): Security sanitization and upload boundaries.

