# @zapwebp/edge Reference

Covers: zero-dependency streaming request handlers para sa Cloudflare Workers, Vercel Edge, at Deno runtimes.

Does not cover: Node.js native addon compilation.

Applies to: `@zapwebp/edge` v1.0.0 at mas bago.

## Quick start

```javascript
import { handleEdgeRequest } from '@zapwebp/edge';

export default {
  async fetch(request) {
    return handleEdgeRequest(request, { defaultFormat: 'webp' });
  }
};
```

## What it does

Ang `@zapwebp/edge` ay isang lightweight, zero-dependency na conversion library na dinisenyo upang tumakbo sa modernong Edge compute environments tulad ng V8 isolates, Cloudflare Workers, at Deno nang hindi nangangailangan ng access sa filesystem.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_EMPTY_FILE` | 0 bytes ang ibinigay na request body | Magpadala ng request na may buong laman ng imahe |

## For agents

```json
{
  "package": "@zapwebp/edge",
  "runtimes": ["cloudflare-workers", "vercel-edge", "deno"],
  "zeroDependency": true
}
```

## Related

- [REST API](/api): HTTP endpoints para sa standard container hosting.
- [Core SDK](/sdk/core): Buong feature-complete engine para sa Node.js.
