# Neocities Storage gamit ang Zapwebp

Covers: pag-convert ng mga imahe bago i-upload sa Neocities static hosting gamit ang `@zapwebp/storage`.

Does not cover: paggawa ng Neocities web page, HTML/CSS layout, o custom domains.

Applies to: `@zapwebp/storage` v1.0.0+.

## Bago magsimula

Ang Neocities ay isang **publikong static site host**, hindi isang pribadong storage cloud.

- Lahat ng mga file ay **publiko sa default**.
- May **1 GB na limitasyon** sa storage at **10 upload bawat minuto** sa libreng antas.
- Walang CDN cache control at walang `list()` o `exists()`.

**Gamitin ang Neocities para sa:** personal na website, hobby project, maliliit na portfolio.  
**Huwag gamitin ang Neocities para sa:** pribadong datos ng mga kliyente o sensitibong imahe.

## Mga Kinakailangan

1. Isang account sa Neocities ([mag-sign up](https://neocities.org/))
2. Pangalan ng site (hal., `yourname.neocities.org`)
3. Password (para sa HTTP Basic Auth)
4. Node.js 18+ (`node --version`)

## Install

```bash
npm i @zapwebp/storage
```

## Quick start

```typescript
import { readFile } from 'node:fs/promises';
import { withZapwebp, neocitiesAdapter } from '@zapwebp/storage';

const zap = withZapwebp(
  neocitiesAdapter({
    user: 'yourname',
    password: process.env.NEOCITIES_PASSWORD!,
    site: 'yourname.neocities.org',
  }),
  {
    targetFormat: 'webp',
    quality: 85,
    clean: true,
  },
);

// I-convert at i-upload
const result = await zap.upload(
  '/',
  'images/logo.svg',
  await readFile('logo.svg'),
);

console.log(result.url);
```

## Configure

## What it does

Pinaaandar ng Zapwebp ang pre-upload conversion at awtomatikong inilalapat ang rate limiting para sa Neocities static sites.

### Mga Pagpipilian

| Option | Uri | Default | Deskripsyon |
|---|---|---|---|
| `targetFormat` | `'webp' \| 'avif' \| 'png' \| 'jpeg'` | `'webp'` | Target na format |
| `quality` | `number` | `85` | Kalidad (1–100) |
| `clean` | `boolean` | `true` | Alisin ang EXIF/XMP/C2PA |
| `maxOutputBytes` | `number` | `undefined` | Limitasyon sa laki |
| `maxInputBytes` | `number` | `5MB` | Tanggihan ang sobrang laki |
| `rateLimit` | `number` | `10` | Maximum uploads bawat minuto |

## Upload one image

```typescript
import { readFile } from 'node:fs/promises';

const result = await zap.upload(
  '/',
  'images/logo.svg',
  await readFile('logo.svg'),
);
```

## Upload many images

Dahil limitado sa **10 uploads bawat minuto** ang Neocities, kinakailangan ang rate-limited queue:

```typescript
import { createPool } from '@zapwebp/storage';

const pool = createPool(zap, {
  concurrency: 1,
  rateLimit: { maxPerInterval: 10, intervalMs: 60_000 },
});

const results = await pool.uploadMany('/', files);
```

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_AUTH` | Maling username o password | Suriin ang `NEOCITIES_PASSWORD` |
| `E_RATE_LIMIT` | Lumagpas sa 10 uploads/minuto | Gamitin ang `createPool` na may rate limiting |
| `E_TOO_LARGE` | Lumagpas sa `maxInputBytes` | I-compress ang source file |
| `E_OUTPUT_TOO_LARGE` | Hindi kasya sa limitasyon | Babaan ang quality |
| `E_UNSAFE_SVG` | May script ang SVG | Alisin ang script |
| `E_TERMINATED` | Na-terminate ang account | Mag-login sa Neocities |
| `E_NETWORK` | Error sa network | Mag-retry muli |

## Production checklist

- [ ] Tiyaking nauunawaan na **lahat ng files ay publiko**
- [ ] Magtakda ng `maxOutputBytes` para hindi lumagpas sa 1 GB
- [ ] Gamitin ang `createPool` na may rate limiting laban sa 429 errors
- [ ] Magtago ng sariling backup ng iyong site

## For agents

```json
{
  "tool": "@zapwebp/storage",
  "provider": "neocities",
  "adapter": "neocitiesAdapter({ user, password, site })",
  "usage": "const zap = withZapwebp(neocitiesAdapter(config), options); await zap.upload('/', path, bytes);",
  "options": {
    "targetFormat": "webp",
    "quality": 85,
    "clean": true,
    "rateLimit": 10
  }
}
```

## Related

- [Gabay sa Supabase Storage](/storage/supabase) — mainam para sa pribadong datos
- [Gabay sa Firebase Storage](/storage/firebase) — mainam para sa produksyon
