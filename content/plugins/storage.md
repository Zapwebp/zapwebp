# Storage Adapters

Covers: converting images before upload to Supabase, Firebase, and Neocities cloud storage.

Does not cover: local filesystem batch conversion or terminal automation. See [CLI Reference](/cli).

Applies to: `@zapwebp/storage` v1.0.0 and later.

## Quick start

```bash
npm i @zapwebp/storage
```

```javascript
import { createClient } from '@supabase/supabase-js';
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const zap = withZapwebp(supabaseAdapter(supabase), {
  scale: [1, 2, 3],
  baseWidth: 512,
  quality: 85,
  clean: true,
});

// Upload one file (intercepts, converts to WebP multipliers, then uploads)
await zap.upload('icons', 'logo.svg', svgBytes);

// Upload multiple files and generate responsive manifest
const report = await zap.uploadMany('icons', files);

// Delete asset and cascade to every derived scale (@1x/@2x/@3x)
await zap.remove('icons', 'logo.svg');
```

## What it does

Zapwebp storage adapters convert and sanitize images in memory immediately before uploading to cloud storage:
- **Intercept → Convert → Upload**: Converts SVG, PNG, and raster images to WebP in memory before touching cloud buckets. The raw file never hits storage unless `keepOriginal: true` is explicitly configured.
- **Transparency-Safe**: Guarantees alpha channel preservation where supported. Transparent pixels are never accidentally flattened to black.
- **Retina Multipliers**: Emits `@1x`, `@2x`, and `@3x` variants alongside ready-to-paste `<img srcset>` tags.
- **Delete Cascades**: Automatically deletes all scaled variants and manifests when an asset is removed.
- **Client & Admin SDKs**: Supports Supabase Storage, Firebase modular client SDK, Firebase Admin SDK, and Neocities static hosting.

## Adapters

| Adapter | Import | Notes |
|---|---|---|
| Supabase | `supabaseAdapter(client)` | Full support (`upload`, `download`, `remove`, `list`, `exists`, `getPublicUrl`) |
| Firebase | `firebaseAdapter(storage)` / `firebaseAdminAdapter(storage)` | Full support across modular Client SDK (v9+) and `firebase-admin/storage` |
| Neocities | `neocitiesAdapter({ user, password })` | HTTP API with native `fetch`; rate-limited (10 req/min) |

## Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `scale` | `number[]` | `[1]` | Output width multipliers (e.g. `[1, 2, 3]`) |
| `baseWidth` | `number` | `512` | 1x width in pixels |
| `quality` | `number` | `85` | WebP lossy compression quality (1-100) |
| `lossless` | `boolean` | `false` | Lossless pixel-perfect compression |
| `clean` | `boolean` | `true` | Strip EXIF, XMP, and C2PA metadata |
| `maxBytes` | `number` | `5242880` | Reject original assets exceeding limit (5MB default) |
| `keepOriginal` | `boolean` | `false` | Upload source file alongside converted WebP |
| `outPrefix` | `string` | `""` | Destination path prefix in target bucket |
| `onConflict` | `string` | `"skip"` | Handling on existing asset: `"overwrite"` \| `"skip"` \| `"error"` |
| `emitManifest` | `boolean` | `true` | Emit `${name}.manifest.json` with srcset metadata |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TOO_LARGE` | Original asset exceeds `maxBytes` | Raise `maxBytes` limit or optimize source before upload |
| `E_UNSAFE_SVG` | SVG contains active scripts or external URL links | Remove `<script>`, inline handlers, or external references |
| `E_ALPHA_NOT_REPRESENTABLE` | JPEG output requested from transparent source without background | Pass explicit background color (e.g. `background: '#ffffff'`) |
| `E_CONFLICT` | Destination file exists and `onConflict: "error"` is active | Use `onConflict: "overwrite"` or rename destination path |
| `E_RATE_LIMIT` | Neocities 10 requests/minute limit exceeded | Batch uploads or insert delay backoff |
| `E_AUTH` | Invalid storage credentials or token | Check credentials and environment variables |
| `E_STORAGE` | Upstream cloud provider returned an error | Check bucket permissions and network connectivity |

## For agents

```json
{
  "tool": "@zapwebp/storage",
  "adapters": ["supabase", "firebase", "neocities"],
  "usage": "withZapwebp(adapter, options).upload(bucket, path, bytes)",
  "options": {
    "scale": { "default": [1] },
    "baseWidth": { "default": 512 },
    "quality": { "default": 85 },
    "clean": { "default": true },
    "maxBytes": { "default": 5242880 }
  }
}
```

## Related

- [CLI](/cli): Same conversion engine in your terminal.
- [Vite Plugin](/plugins/vite): Zero-config build-time image conversion.
- [Next.js Plugin](/plugins/next): Next.js build-time image pipeline.
- [GitHub Action](/plugins/github-action): Automated CI conversion and PR commenting.
- [Formats](/formats): Supported image formats and mime types.
