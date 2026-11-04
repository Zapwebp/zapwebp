# `@zapwebp/edge`

High-performance Edge runtime request handlers for Vercel Edge, Cloudflare Workers, Supabase Functions, and Deno.

Provides a unified ingestion gateway that converts any input image stream into your canonical target format (Target Lock) directly on the edge.

## Installation

```bash
pnpm add @zapwebp/edge
```

## Quick Start (Vercel Edge / Cloudflare Workers)

```typescript
import { createZapHandler } from '@zapwebp/edge';

export default createZapHandler({
  targetFormat: 'webp',
  strict: true,
  maxBytes: 5 * 1024 * 1024,
});
```

## Advanced Usage with Custom Resolvers

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

## Contract & Status Codes

- **HTTP 200**: Converted successfully into target format, with headers `Content-Type: image/<target>` and `Cache-Control: public, max-age=31536000, immutable`.
- **HTTP 415**: Input cannot be converted into target format when `strict: true` (e.g. `E_UNSUPPORTED_FORMAT`).
- **HTTP 413**: Input payload exceeds `maxBytes` (e.g. `E_TOO_LARGE`).

## License

MIT © Zapwebp

