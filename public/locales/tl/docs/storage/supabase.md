# Supabase Storage gamit ang Zapwebp

Covers: pag-convert ng mga imahe bago i-upload sa Supabase Storage gamit ang `@zapwebp/storage`.

Does not cover: Supabase authentication, database, o edge functions. Tingnan ang [mga dokumento ng Supabase](https://supabase.com/docs).

Applies to: `@zapwebp/storage` v1.0.0+, Supabase JS v2+.

## Mga Kinakailangan

1. Isang proyekto sa Supabase ([gumawa rito](https://supabase.com/dashboard))
2. Isang storage bucket (hal., `zapwebp-assets`)
3. Ang iyong URL ng proyekto at anon key:
   - Dashboard → Settings → API
   - `SUPABASE_URL=https://xxxx.supabase.co`
   - `SUPABASE_ANON_KEY=eyJhbGci...`
4. Node.js 18+ (`node --version`)

## Install

```bash
npm i @zapwebp/storage @supabase/supabase-js
```

## Quick start

```typescript
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

const zap = withZapwebp(supabaseAdapter(supabase), {
  targetFormat: 'webp',
  quality: 85,
  clean: true,
});

// I-convert at i-upload sa isang tawag
const result = await zap.upload(
  'zapwebp-assets',      // bucket
  'logo.svg',             // landas sa bucket
  await readFile('logo.svg'),
);

console.log(result);
// { path: 'logo.webp', url: 'https://...', bytes: 2100, converted: true }
```

## Configure

## What it does

Sinasala at kino-convert ng Zapwebp ang mga imahe sa memorya bago mai-upload sa Supabase Storage. Pinapanatili ang transparency ng alpha channel at awtomatikong inaayos ang mga delete cascade.

### Mga Pagpipilian

| Option | Uri | Default | Deskripsyon |
|---|---|---|---|
| `targetFormat` | `'webp' \| 'avif' \| 'png' \| 'jpeg'` | `'webp'` | Target na format |
| `quality` | `number` | `85` | Kalidad ng compression (1–100) |
| `clean` | `boolean` | `true` | Alisin ang EXIF/XMP/C2PA |
| `maxOutputBytes` | `number` | `undefined` | Limitasyon sa laki ng output |
| `keepOriginal` | `boolean` | `false` | I-upload din ang orihinal |
| `maxInputBytes` | `number` | `5MB` | Tanggihan ang mas malaking file |
| `upsert` | `boolean` | `false` | I-overwrite ang umiiral na file |
| `cacheControl` | `string` | `'31536000'` | 1 taong immutable cache |

## Upload one image

```typescript
const result = await zap.upload(
  'zapwebp-assets',
  'products/hero.jpg',
  await readFile('hero.jpg'),
);

console.log(result.url);
```

Hindi ia-upload ang orihinal na `hero.jpg` maliban kung `keepOriginal: true`.

## Upload many images

```typescript
import { readdir, readFile } from 'node:fs/promises';
import { createPool } from '@zapwebp/storage';

const files = await readdir('./products');
const pool = createPool(zap, { concurrency: 4 });
const results = await pool.uploadMany('zapwebp-assets', files.map((f) => `./products/${f}`));
```

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_AUTH` | Maling API key | Suriin ang `SUPABASE_ANON_KEY` |
| `E_BUCKET_NOT_FOUND` | Walang bucket | Gumawa ng bucket sa dashboard |
| `E_RLS_POLICY` | Hinaharangan ng RLS | Magdagdag ng RLS policy |
| `E_TOO_LARGE` | Lumagpas sa `maxInputBytes` | I-compress ang file o itaas ang limitasyon |
| `E_OUTPUT_TOO_LARGE` | Hindi kasya sa `maxOutputBytes` | Babaan ang quality o itaas ang limitasyon |
| `E_UNSAFE_SVG` | May script ang SVG | Alisin ang script |
| `E_RATE_LIMIT` | Lumagpas sa rate limit | Maghintay at subukan muli |

## Production checklist

- [ ] Magtakda ng mga patakaran sa RLS sa `storage.objects`
- [ ] Gamitin lamang ang `service_role` key sa server-side
- [ ] Paganahin ang mga caching header (`cacheControl: '31536000'`)
- [ ] Subaybayan ang mga kabiguan sa pag-upload sa logs ng Supabase

## For agents

```json
{
  "tool": "@zapwebp/storage",
  "provider": "supabase",
  "adapter": "supabaseAdapter(supabaseClient)",
  "usage": "const zap = withZapwebp(supabaseAdapter(supabase), options); await zap.upload(bucket, path, bytes);",
  "options": {
    "targetFormat": "webp",
    "quality": 85,
    "clean": true,
    "concurrency": 4
  }
}
```

## Related

- [Gabay sa Firebase Storage](/storage/firebase)
- [Pangkalahatang-ideya ng Storage Adapters](/plugins/storage)
