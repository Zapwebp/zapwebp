# Firebase Storage with Zapwebp

Covers: converting images before upload to Firebase Storage, using `@zapwebp/storage`.

Does not cover: Firebase Auth, Firestore, or Cloud Functions. See [Firebase docs](https://firebase.google.com/docs).

Applies to: `@zapwebp/storage` v1.0.0+, Firebase v9+ (modular SDK).

## Prerequisites

1. A Firebase project ([create one](https://console.firebase.google.com/))
2. Firebase Storage enabled (Console → Storage → Get started)
3. A storage bucket (default: `your-project.appspot.com`)
4. Firebase config from Console → Project settings → Your apps:
   ```javascript
   const firebaseConfig = {
     apiKey: '...',
     authDomain: '...',
     projectId: '...',
     storageBucket: '...',
     messagingSenderId: '...',
     appId: '...',
   };
   ```
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

// Convert and upload
const result = await zap.upload(
  'products',              // folder in bucket
  'logo.svg',
  await readFile('logo.svg'),
);

console.log(result.url);
// https://firebasestorage.googleapis.com/v0/b/.../o/products%2Flogo.webp
```

## Configure

## What it does

Zapwebp intercepts image files in memory before they hit Google Cloud / Firebase Storage, validates safety, executes rasterization or re-encoding with full transparency preservation, and uploads optimized WebP, AVIF, PNG, or JPEG assets with automatic delete cascades.

### Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `targetFormat` | `'webp' \| 'avif' \| 'png' \| 'jpeg'` | `'webp'` | Output format |
| `quality` | `number` | `85` | Lossy quality (1–100) |
| `clean` | `boolean` | `true` | Strip EXIF/XMP/C2PA |
| `maxOutputBytes` | `number` | `undefined` | Compress to fit |
| `keepOriginal` | `boolean` | `false` | Upload the source too |
| `maxInputBytes` | `number` | `5MB` | Reject larger inputs |
| `upsert` | `boolean` | `false` | Overwrite existing files |

## Upload one image

```typescript
const result = await zap.upload(
  'products',
  'hero.jpg',
  await readFile('hero.jpg'),
);

console.log(result.url);
```

The upload uses Firebase's resumable upload under the hood. Large files are streamed.

## Upload many images

```typescript
import { createPool } from '@zapwebp/storage';

const pool = createPool(zap, { concurrency: 4 });
const results = await pool.uploadMany('products', files);
```

Firebase has a rate limit of 1,000 operations/second per project. The pool respects this by default (4 concurrent uploads).

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_AUTH` | Invalid Firebase config | Check `firebaseConfig` |
| `E_BUCKET_NOT_FOUND` | Storage bucket not initialized | Enable Storage in Firebase Console |
| `E_PERMISSION_DENIED` | Storage rules block the write | Update `storage.rules` (see below) |
| `E_TOO_LARGE` | Input > `maxInputBytes` | Compress the file |
| `E_OUTPUT_TOO_LARGE` | Cannot fit under `maxOutputBytes` | Lower quality |
| `E_UNSAFE_SVG` | SVG contains scripts | Remove them |
| `E_RATE_LIMIT` | Firebase rate limit hit | Retry with exponential backoff |

## Production checklist

- [ ] Set storage rules:
  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /products/{file} {
        allow read: if true;
        allow write: if request.auth != null
                     && request.resource.size < 5 * 1024 * 1024;
      }
    }
  }
  ```
- [ ] Enable VPC Service Controls for sensitive projects
- [ ] Set `maxOutputBytes` to keep storage costs predictable
- [ ] Monitor uploads via Firebase Console → Storage → Usage
- [ ] Test storage rules with the Firebase Emulator Suite

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

- [Supabase Storage guide](/storage/supabase)
- [Storage adapters overview](/plugins/storage)
