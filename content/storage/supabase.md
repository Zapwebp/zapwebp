# Supabase Storage with Zapwebp

Covers: converting images before upload to Supabase Storage, using `@zapwebp/storage`.

Does not cover: Supabase auth, database, or edge functions. See [Supabase docs](https://supabase.com/docs).

Applies to: `@zapwebp/storage` v1.0.0+, Supabase JS v2+.

## Prerequisites

1. A Supabase project ([create one](https://supabase.com/dashboard))
2. A storage bucket (e.g., `zapwebp-assets`)
3. Your project URL and anon key:
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

// Convert and upload in one call
const result = await zap.upload(
  'zapwebp-assets',      // bucket
  'logo.svg',             // path in bucket
  await readFile('logo.svg'),
);

console.log(result);
// { path: 'logo.webp', url: 'https://...', bytes: 2100, converted: true }
```

## Configure

## What it does

Zapwebp intercepts image files in memory before they hit Supabase Storage, validates safety, executes rasterization or re-encoding with full transparency preservation, and uploads optimized WebP, AVIF, PNG, or JPEG assets with automatic delete cascades.

### Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `targetFormat` | `'webp' \| 'avif' \| 'png' \| 'jpeg'` | `'webp'` | Output format |
| `quality` | `number` | `85` | Lossy quality (1–100) |
| `clean` | `boolean` | `true` | Strip EXIF/XMP/C2PA |
| `maxOutputBytes` | `number` | `undefined` | Compress to fit under this size |
| `keepOriginal` | `boolean` | `false` | Upload the source too |
| `maxInputBytes` | `number` | `5MB` | Reject larger inputs |
| `upsert` | `boolean` | `false` | Overwrite existing files |
| `cacheControl` | `string` | `'31536000'` | 1 year, immutable |

## Upload one image

```typescript
const result = await zap.upload(
  'zapwebp-assets',
  'products/hero.jpg',
  await readFile('hero.jpg'),
);

console.log(result.url);
// https://xxxx.supabase.co/storage/v1/object/public/zapwebp-assets/products/hero.webp
```

The original `hero.jpg` is not uploaded unless `keepOriginal: true`.

## Upload many images

```typescript
import { readdir, readFile } from 'node:fs/promises';
import { createPool } from '@zapwebp/storage';

const files = await readdir('./products');
const results = await Promise.all(
  files.map(async (file) => {
    const bytes = await readFile(`./products/${file}`);
    return zap.upload('zapwebp-assets', `products/${file}`, bytes);
  }),
);

const totalSaved = results.reduce(
  (sum, r) => sum + (r.originalBytes - r.bytes),
  0,
);
console.log(`Saved ${totalSaved} bytes`);
```

For large batches, use the pool:

```typescript
import { createPool } from '@zapwebp/storage';

const pool = createPool(zap, { concurrency: 4 });
const results = await pool.uploadMany('zapwebp-assets', files.map((f) => `./products/${f}`));
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_AUTH` | Invalid API key | Check `SUPABASE_ANON_KEY` |
| `E_BUCKET_NOT_FOUND` | Bucket doesn't exist | Create it in the Supabase dashboard |
| `E_RLS_POLICY` | Row-Level Security blocks the write | Add an RLS policy (see below) |
| `E_TOO_LARGE` | Input > `maxInputBytes` | Compress the file, or raise the limit |
| `E_OUTPUT_TOO_LARGE` | Cannot fit under `maxOutputBytes` | Lower quality, or raise the limit |
| `E_UNSAFE_SVG` | SVG contains scripts | Remove them, or use `--allow-unsafe` |
| `E_RATE_LIMIT` | Supabase rate limit hit | Retry with exponential backoff |

## Production checklist

- [ ] Set RLS policies on `storage.objects`:
  ```sql
  CREATE POLICY "Public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'zapwebp-assets');

  CREATE POLICY "Auth write" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'zapwebp-assets'
      AND auth.role() = 'authenticated'
    );
  ```
- [ ] Set `maxOutputBytes` to keep storage costs predictable
- [ ] Use `service_role` key only server-side, never in the browser
- [ ] Enable caching headers (`cacheControl: '31536000'`)
- [ ] Monitor upload failures via Supabase logs
- [ ] Test the RLS policy with a real anon key

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

- [Firebase Storage guide](/storage/firebase)
- [Storage adapters overview](/plugins/storage)
