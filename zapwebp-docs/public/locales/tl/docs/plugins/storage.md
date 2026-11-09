# Storage Adapters

Covers: first-party cloud adapters para sa Supabase, Firebase, at Neocities na may pre-upload conversion, path sandboxing, SSRF defense, at cascading deletion.

Does not cover: local filesystem storage. Tingnan ang [CLI](/cli).

Applies to: `@zapwebp/storage` v1.0.0 at mas bago.

## Quick start

```javascript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const client = withZapwebp(supabaseAdapter(rawClient), {
  to: 'webp',
  quality: 85,
  concurrency: 4,
});
await client.upload('icons', 'avatar.png', fileBytes);
```

## What it does

Awtomatikong pinipigil ng storage wrapper ang upload, kino-convert ang imahe sa ligtas at transparent na WebP o AVIF sa memorya, tinatanggal ang sensitibong EXIF metadata, ipinatutupad ang 1024-byte path sandboxing at SSRF defense, at inia-upload ang na-optimize na bersyon sa cloud bucket nang may cascading deletion.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_AUTH` | Nabigo ang authentication sa cloud storage provider | Suriin ang iyong API key o authentication credentials |
| `E_CONFLICT` | Umiiral na ang file sa remote storage bucket | Gumamit ng unique na filename o baguhin ang conflict policy |
| `E_PATH_TRAVERSAL` | Lumampas sa 1024 bytes o naglalaman ng `..` ang path | Gumamit ng ligtas na relative bucket path |
| `E_UNSAFE_URL` | Tinangkang mag-fetch mula sa private IP o metadata | Magbigay lamang ng pampublikong HTTPS URL |

## For agents

```json
{
  "package": "@zapwebp/storage",
  "providers": ["supabase", "firebase", "neocities"],
  "features": ["pre-upload-convert", "metadata-strip", "cascading-delete", "path-sandboxing", "ssrf-guard"]
}
```

## Related

- [Crop Plugin](/plugins/crop): Pag-crop ng imahe bago i-upload sa storage.
- [Target Lock](/lock-target): Pagtitiyak na iisang format lamang ang tatanggapin ng bucket.
- [Security](/security): Pagsunod sa mga pamantayang ISO 27001 at 27017.
