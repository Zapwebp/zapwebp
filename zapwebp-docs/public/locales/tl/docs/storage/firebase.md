# Firebase Storage gamit ang Zapwebp

Covers: pag-convert ng mga imahe bago i-upload sa Firebase Storage gamit ang `@zapwebp/storage`.

Does not cover: Firebase Auth, Firestore, o Cloud Functions. Tingnan ang [mga dokumento ng Firebase](https://firebase.google.com/docs).

Applies to: `@zapwebp/storage` v1.0.0+, Firebase v9+ (modular SDK).

## Mga Kinakailangan

1. Isang proyekto sa Firebase ([gumawa rito](https://console.firebase.google.com/))
2. Pinaganang Firebase Storage sa Console
3. Isang storage bucket (hal., `your-project.appspot.com`)
4. Firebase config mula sa Project settings
5. Node.js 18+ (`node --version`)

## Install

```bash
npm i @zapwebp/storage firebase
```

## Quick start

```typescript
import { readFile } from 'node:fs/promises';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { withZapwebp, firebaseAdapter } from '@zapwebp/storage';

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY!,
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '...',
  appId: '...',
});

const storage = getStorage(app);
const zap = withZapwebp(firebaseAdapter(storage), {
  targetFormat: 'webp',
  quality: 85,
  clean: true,
});

// I-convert at i-upload
const result = await zap.upload(
  'products',
  'logo.svg',
  await readFile('logo.svg'),
);

console.log(result.url);
```

## Configure

## What it does

Pinangangasiwaan ng Zapwebp ang mga imahe sa memorya bago ipadala sa Google Cloud / Firebase Storage. Sinisiguro ang ligtas na pagproseso, pagpapanatili ng alpha transparency, at tamang pagsasaayos ng file size.

### Mga Pagpipilian

| Option | Uri | Default | Deskripsyon |
|---|---|---|---|
| `targetFormat` | `'webp' \| 'avif' \| 'png' \| 'jpeg'` | `'webp'` | Target na format |
| `quality` | `number` | `85` | Kalidad ng imahe (1–100) |
| `clean` | `boolean` | `true` | Alisin ang EXIF/XMP/C2PA |
| `maxOutputBytes` | `number` | `undefined` | Limitasyon sa laki ng output |
| `keepOriginal` | `boolean` | `false` | I-upload din ang orihinal |
| `maxInputBytes` | `number` | `5MB` | Tanggihan ang sobrang laki |
| `upsert` | `boolean` | `false` | I-overwrite ang umiiral |

## Upload one image

```typescript
const result = await zap.upload(
  'products',
  'hero.jpg',
  await readFile('hero.jpg'),
);

console.log(result.url);
```

Gumagamit ng resumable streaming upload ang Firebase adapter sa ilalim.

## Upload many images

```typescript
import { createPool } from '@zapwebp/storage';

const pool = createPool(zap, { concurrency: 4 });
const results = await pool.uploadMany('products', files);
```

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_AUTH` | Maling Firebase config | Suriin ang config object |
| `E_BUCKET_NOT_FOUND` | Hindi pa naka-set up ang bucket | Paganahin ang Storage sa Console |
| `E_PERMISSION_DENIED` | Hinarang ng Security Rules | I-update ang `storage.rules` |
| `E_TOO_LARGE` | Lumagpas sa `maxInputBytes` | I-compress ang source file |
| `E_OUTPUT_TOO_LARGE` | Hindi kasya sa output limit | Babaan ang quality |
| `E_UNSAFE_SVG` | May masamang script ang SVG | Alisin ang script |
| `E_RATE_LIMIT` | Lumagpas sa rate limit ng Firebase | Maghintay gamit ang retry |

## Production checklist

- [ ] Magtakda ng tamang security rules sa Firebase Storage
- [ ] Magtakda ng `maxOutputBytes` para kontrolado ang gastos
- [ ] Subukan ang rules gamit ang Firebase Emulator Suite

## For agents

```json
{
  "tool": "@zapwebp/storage",
  "provider": "firebase",
  "adapter": "firebaseAdapter(storageInstance)",
  "usage": "const zap = withZapwebp(firebaseAdapter(storage), options); await zap.upload(bucket, path, bytes);",
  "options": {
    "targetFormat": "webp",
    "quality": 85,
    "clean": true,
    "concurrency": 4
  }
}
```

## Related

- [Gabay sa Supabase Storage](/storage/supabase)
- [Pangkalahatang-ideya ng Storage Adapters](/plugins/storage)
