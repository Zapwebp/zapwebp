# REST API

Covers: Zapwebp HTTP REST API v1 endpoints (`/api/v1/convert`, `/api/v1/batch`, `/api/v1/health`, `/health`), multipart file uploads, response headers, and streaming options.

Does not cover: CLI command flags or MCP agent protocol. See [CLI](/cli) and [MCP](/mcp).

Applies to: `zapwebp` v1.1.0 and later.

## Quick start

```bash
# Convert a local SVG to WebP over HTTP
curl -X POST https://zapwebp.vercel.app/api/v1/convert \
  -F "svg=@logo.svg" \
  -F "to=webp" \
  -F "width=512" \
  -F "quality=85" \
  --output logo.webp
```

## What it does

The Zapwebp REST API exposes the core image conversion engine over HTTP for remote servers, CI pipelines, and microservices:

- **Single Conversion (`POST /api/v1/convert`)**: Accepts multipart form data with image file, target format, width, and quality. Returns the raw binary image stream.
- **Batch Processing (`POST /api/v1/batch`)**: Accepts up to 20 files per request and returns per-image base64 JSON payload with alpha preservation flags.
- **Health Check (`GET /health` & `GET /api/v1/health`)**: Returns service status, version, and supported runtime capabilities.
- **Header Metadata**: Every conversion response includes `X-Zapwebp-Width`, `X-Zapwebp-Height`, and `X-Zapwebp-Alpha-Preserved`.

## Endpoints

| Method | Path | Content-Type | Description |
|---|---|---|---|
| `GET` | `/health` | `application/json` | Basic service health probe |
| `GET` | `/api/v1/health` | `application/json` | API v1 status and runtime metadata |
| `POST` | `/api/v1/convert` | `multipart/form-data` | Converts a single image and streams binary output |
| `POST` | `/api/v1/batch` | `multipart/form-data` | Converts up to 20 images and returns JSON array |

## Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `svg` / `file` | `File` | required | Input image file (SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF) |
| `to` | `string` | `webp` | Target format: `webp`, `avif`, `png`, or `jpeg` |
| `width` | `number` | `512` | Maximum bounding width (512–4096 px) |
| `quality` | `number` | `85` | Compression quality factor (1–100) |
| `background` | `string` | optional | Hex color (e.g. `#ffffff`) required if converting alpha to JPEG |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `400 Bad Request` | Missing file in multipart form | Provide an image in the `svg` or `file` form field |
| `400 Alpha Loss` | Transparent source converted to JPEG without background | Supply `background: "#ffffff"` in form data |
| `413 Payload Too Large` | Single file exceeds 5MB or batch exceeds 100MB | Resize source asset or split into smaller batches |
| `415 Unsupported Media` | Input format not supported | Use SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF |

## For agents

```json
{
  "api": "zapwebp-rest-v1",
  "baseUrl": "https://zapwebp.vercel.app/api/v1",
  "endpoints": {
    "health": "GET /health",
    "convert": "POST /api/v1/convert",
    "batch": "POST /api/v1/batch"
  },
  "supportedInputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "supportedOutputs": ["webp", "avif", "png", "jpeg"],
  "limits": {
    "maxFileBytes": 5242880,
    "maxBatchFiles": 20,
    "maxWidth": 4096
  }
}
```

## Related

- [CLI](/cli): Command line tool with in-memory execution and zero network dependency.
- [Formats](/formats): Comprehensive format and alpha channel matrix.

