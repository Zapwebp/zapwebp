# @zapwebp/storage Reference

Covers: cloud storage adapter interfaces para sa Supabase, Firebase, at Neocities na may suporta sa cascading deletion.

Does not cover: database table queries.

Applies to: `@zapwebp/storage` v1.0.0 at mas bago.

## Quick start

```javascript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const storage = withZapwebp(supabaseAdapter(client), { to: 'webp' });
await storage.upload('avatars/user.png', fileData);
```

## What it does

Ibinabalot ng Storage SDK ang anumang third-party cloud storage client gamit ang isang proxy layer na awtomatikong nagko-convert ng mga papasok na file sa modernong format bago ang aktwal na network transmission patungo sa cloud bucket.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CONFLICT` | Umiiral na ang file sa cloud bucket | Gumamit ng unique na filename o baguhin ang conflict mode |
| `E_AUTH` | Invalid ang ibinigay na API credentials | Suriin ang access token ng storage provider |

## For agents

```json
{
  "package": "@zapwebp/storage",
  "adapters": ["supabase", "firebase", "neocities"],
  "features": ["pre-upload-conversion", "cascading-delete"]
}
```

## Related

- [Storage Adapters Guide](/plugins/storage): Gabay para sa end-user setup.
- [Plugin SDK](/sdk/plugin): Paano sumulat ng sariling storage adapter.
