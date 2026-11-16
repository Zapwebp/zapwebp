# Neocities Storage with Zapwebp

Covers: converting images before upload to a Neocities static site, using `@zapwebp/storage`.

Does not cover: Neocities site editing, HTML/CSS authoring, or custom domains.

Applies to: `@zapwebp/storage` v1.0.0+.

## Before you start

Neocities is a **public static site host**, not a secure storage bucket.

- Files are **publicly accessible by default**.
- Neocities collects device and usage data.
- The free tier has a **1 GB storage limit** and a **10 uploads/minute rate limit**.
- Account termination may result in data loss.
- There is **no CDN cache control** and **no `list()` or `exists()`**.

**Use Neocities for:** personal sites, hobby projects, small portfolios.  
**Do not use Neocities for:** private images, customer data, production assets with SLAs.

## Prerequisites

1. A Neocities account ([sign up](https://neocities.org/))
2. Your site name (e.g., `yourname.neocities.org`)
3. Your password (used for HTTP Basic Auth)
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
    site: 'yourname.neocities.org',  // optional; defaults to user
  }),
  {
    targetFormat: 'webp',
    quality: 85,
    clean: true,
  },
);

// Convert and upload
const result = await zap.upload(
  '/',                     // root of the site
  'images/logo.svg',
  await readFile('logo.svg'),
);

console.log(result.url);
// https://yourname.neocities.org/images/logo.webp
```

## Configure

## What it does

Zapwebp sanitizes and compresses images in memory before uploading to your Neocities web space, enforcing safe paths, stripping sensitive metadata, and managing strict upload rate limits.

### Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `targetFormat` | `'webp' \| 'avif' \| 'png' \| 'jpeg'` | `'webp'` | Output format |
| `quality` | `number` | `85` | Lossy quality (1–100) |
| `clean` | `boolean` | `true` | Strip EXIF/XMP/C2PA |
| `maxOutputBytes` | `number` | `undefined` | Compress to fit |
| `maxInputBytes` | `number` | `5MB` | Reject larger inputs |
| `rateLimit` | `number` | `10` | Max uploads/minute (Neocities limit) |

## Upload one image

```typescript
import { readFile } from 'node:fs/promises';

const result = await zap.upload(
  '/',
  'images/logo.svg',
  await readFile('logo.svg'),
);
```

Neocities has no concept of folders. Everything is stored under the site root with a path prefix. `images/logo.svg` becomes `/images/logo.webp` on the site.

## Upload many images

Because Neocities allows only **10 uploads per minute**, batch uploads must be queued with rate limiting.

```typescript
import { createPool } from '@zapwebp/storage';

const pool = createPool(zap, {
  concurrency: 1,
  rateLimit: { maxPerInterval: 10, intervalMs: 60_000 },
});

const results = await pool.uploadMany('/', files);
// 100 files take ~10 minutes
```

The pool automatically waits between uploads. No manual throttling needed.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_AUTH` | Wrong username or password | Check `NEOCITIES_PASSWORD` |
| `E_RATE_LIMIT` | Exceeded 10 uploads/minute | Use `createPool` with rate limiting |
| `E_TOO_LARGE` | Input > `maxInputBytes` | Compress the file |
| `E_OUTPUT_TOO_LARGE` | Cannot fit under `maxOutputBytes` | Lower quality |
| `E_UNSAFE_SVG` | SVG contains scripts | Remove them |
| `E_TERMINATED` | Account terminated | Log in to Neocities to check |
| `E_NETWORK` | Network error during upload | Retry (the adapter does this automatically) |

## Production checklist

- [ ] Understand that **all files are public**. Do not upload private images.
- [ ] Set `maxOutputBytes` to stay under the 1 GB storage limit
- [ ] Use rate limiting (`createPool`) to avoid 429 errors
- [ ] Monitor usage at [neocities.org/dashboard](https://neocities.org/dashboard)
- [ ] Back up your site: Neocities has no automatic backup
- [ ] Test with a free account before upgrading to a paid plan

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

- [Supabase Storage guide](/storage/supabase) — better for private data
- [Firebase Storage guide](/storage/firebase) — better for production
