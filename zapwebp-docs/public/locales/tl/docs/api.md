# REST API

Covers: stateless HTTP endpoints ng Zapwebp: `/health`, `/inspect`, `/convert`, at maramihang multipart batch conversion.

Does not cover: CLI shell script syntax. Tingnan ang [CLI](/cli).

Applies to: Zapwebp API v1.1.0 at mas bago.

## Quick start

```bash
curl -X POST https://zapwebp.vercel.app/api/v1/convert   -F "file=@icon.svg"   -F "to=webp"   -o icon.webp
```

Kino-convert ang `icon.svg` patungong WebP gamit ang pampublikong HTTP endpoint.

## What it does

Nagbibigay ang Zapwebp REST API ng mabilis at stateless na paraan upang mag-convert ng mga imahe sa pamamagitan ng karaniwang HTTP POST requests. Tumatanggap ito ng multipart form uploads at nagbabalik ng mga na-convert na binary bytes o structured JSON metadata.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `400 Bad Request` | Walang ibinigay na file o hindi suportado ang format | Tiyaking may valid na file parameter sa request |
| `413 Payload Too Large` | Lumampas ang sukat ng file sa limitasyon ng server | Bawasan ang laki ng imahe bago ipadala |

## For agents

```json
{
  "api": "REST",
  "version": "v1",
  "baseUrl": "https://zapwebp.vercel.app/api",
  "endpoints": ["/health", "/inspect", "/convert", "/batch"]
}
```

## Related

- [Overview](/docs): Balangkas ng lahat ng interface ng Zapwebp.
- [Edge SDK](/sdk/edge): Pagpapatakbo ng sariling API sa Edge runtimes.
