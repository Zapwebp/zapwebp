# @zapwebp/edge

High-performance Edge runtime request handlers for Vercel Edge, Cloudflare Workers, Supabase Functions, and Deno.

Covers: Edge runtime request handlers (`createZapHandler`), Target Lock streaming ingestion, HTTP status code contracts, and custom image resolvers.

Does not cover: Filesystem caching, persistent blob storage, or server-side shell command spawning.

Applies to: `@zapwebp/edge` v1.0.0 and later, Vercel Edge, Cloudflare Workers, Supabase Functions, Deno.

## Quick start

```bash
pnpm add @zapwebp/edge
```

```typescript
import { createZapHandler } from '@zapwebp/edge';

export default createZapHandler({
  targetFormat: 'webp',
  strict: true,
  maxBytes: 5 * 1024 * 1024,
});
```

## What it does

`@zapwebp/edge` provides a unified ingestion gateway that converts any input image stream into your canonical target format (Target Lock) directly on edge workers:
- **Zero Cold Start**: In-memory streaming handlers optimized for lightweight V8 edge isolates.
- **Target Lock Enforcement**: Enforces consistent format standards across inbound user uploads before they hit origin servers.
- **Fail-Safe Passthrough**: In non-strict mode (`strict: false`), unsupported assets stream through transparently without breaking requests.
- **Universal Runtime Support**: Compatible with Vercel Edge, Cloudflare Workers, Supabase Edge Functions, and Deno.

### Advanced Usage with Custom Resolvers

```typescript
import { createZapHandler } from '@zapwebp/edge';

export const handleImageRequest = createZapHandler({
  targetFormat: 'avif',
  strict: false, // In non-strict mode, unconvertible bytes pass through with HTTP 200
  source: async (request: Request) => {
    const url = new URL(request.url);
    const sourceUrl = url.searchParams.get('url');
    if (!sourceUrl) throw new Error('Missing image url');
    const res = await fetch(sourceUrl);
    return res.arrayBuffer();
  },
});
```

### Contract & Status Codes

- **HTTP 200**: Converted successfully into target format, with headers `Content-Type: image/<target>` and `Cache-Control: public, max-age=31536000, immutable`.
- **HTTP 415**: Input cannot be converted into target format when `strict: true` (e.g. `E_UNSUPPORTED_FORMAT`).
- **HTTP 413**: Input payload exceeds `maxBytes` (e.g. `E_TOO_LARGE`).

## Errors

| Code | HTTP Status | Cause | Fix |
|---|---|---|---|
| `E_UNSUPPORTED_FORMAT` | `415` | Input image format not supported and `strict: true` | Provide supported format or set `strict: false` |
| `E_TOO_LARGE` | `413` | Input payload exceeds `maxBytes` | Raise `maxBytes` or compress client-side |
| `E_SOURCE_FAILED` | `502` | Custom `source` resolver failed to retrieve asset | Verify target URL and upstream connectivity |

## For agents

```json
{
  "tool": "@zapwebp/edge",
  "handlers": ["createZapHandler"],
  "options": {
    "targetFormat": { "type": "string", "default": "webp" },
    "strict": { "type": "boolean", "default": true },
    "maxBytes": { "type": "number", "default": 5242880 }
  }
}
```

## Related

- [Edge SDK Documentation](https://zapwebp-docs.vercel.app/sdk/edge): Edge integration patterns and platform recipes.
- [Target Lock Policy](https://zapwebp-docs.vercel.app/lock-target): Universal output format enforcement.
- [REST API Reference](https://zapwebp-docs.vercel.app/api): Standard Node/Express REST endpoints.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
