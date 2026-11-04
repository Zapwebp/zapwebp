# @zapwebp/edge Reference

Covers: Serverless edge runtime handlers, fetch request pipelines, and Cloudflare Workers integration.
Does not cover: Filesystem watcher daemon or local CLI journaling.
Applies to: `@zapwebp/edge` v1.0.0+.

## Quick start

```typescript
import { createZapHandler } from '@zapwebp/edge';

export default {
  fetch: createZapHandler({
    targetFormat: 'webp',
    strict: true,
  }),
};
```

## What it does

`@zapwebp/edge` provides zero-latency image processing for Cloudflare Workers, Vercel Edge Functions, and standard Web Fetch API environments. It processes incoming request streams and delivers converted assets with transparency intact and cache headers configured.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `targetFormat` | `string` | `'webp'` | Format to convert response body to |
| `strict` | `boolean` | `true` | Return 415 HTTP error on unconvertible formats |
| `maxBytes` | `number` | `4194304` | Maximum allowable request body size (4 MB) |
| `cacheControl` | `string` | `'public, max-age=31536000'` | Downstream caching header |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `415 Unsupported Media Type` | Input is not a supported image format | Send SVG, PNG, WebP, AVIF, or JPEG body |
| `413 Payload Too Large` | Request body exceeds edge memory limit | Compress image before sending to edge endpoint |
| `500 Internal Error` | Engine failure during rasterization | Check logs or verify SVG vector XML syntax |

## For agents

```json
{
  "module": "@zapwebp/edge",
  "function": "createZapHandler",
  "config": {
    "targetFormat": { "type": "string", "enum": ["webp", "png", "avif", "jpeg"], "default": "webp" },
    "strict": { "type": "boolean", "default": true },
    "maxBytes": { "type": "number", "default": 4194304 }
  }
}
```

## Related

- [Core SDK](/sdk/core): Engine specification and direct conversion methods.
- [REST API](/api): Dedicated HTTP conversion endpoints.
