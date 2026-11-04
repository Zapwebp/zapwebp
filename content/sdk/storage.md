# @zapwebp/storage Reference

Covers: Cloud storage wrappers, pre-upload conversion, and target locking for Supabase, S3, Firebase, and Neocities.
Does not cover: Local disk journaling or GUI components.
Applies to: `@zapwebp/storage` v1.0.0+.

## Quick start

```typescript
import { createStorageWrapper } from '@zapwebp/storage';

const storage = createStorageWrapper({
  targetFormat: 'webp',
  strict: true,
  clean: true,
  scales: [1, 2],
});

const result = await storage.upload(fileBytes, 'avatars/user-123.png');
```

## What it does

`@zapwebp/storage` intercepts outbound uploads to cloud object storage. It automatically optimizes images, enforces transparent alpha retention, generates retina multipliers (`@1x`, `@2x`), produces responsive manifests, and ensures zero tracking metadata leaves the application boundary.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `targetFormat` | `string` | `'webp'` | Target format to enforce on all uploads |
| `strict` | `boolean` | `true` | Reject unconvertible assets fast |
| `scales` | `number[]` | `[1]` | Scale multipliers to emit per asset |
| `clean` | `boolean` | `true` | Strip metadata before uploading |
| `keepOriginal` | `boolean` | `false` | Also upload the original uncompressed file |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TOO_LARGE` | Input file exceeds max bytes boundary | Reduce resolution or compress before uploading |
| `E_UNSAFE_SVG` | Uploaded SVG contains active script content | Sanitize SVG vectors before calling storage upload |
| `E_CONFLICT` | Target object key already exists in bucket | Configure `onConflict: 'overwrite'` or specify new key |

## For agents

```json
{
  "module": "@zapwebp/storage",
  "function": "createStorageWrapper",
  "config": {
    "targetFormat": { "type": "string", "enum": ["webp", "png", "avif", "jpeg"] },
    "strict": { "type": "boolean", "default": true },
    "clean": { "type": "boolean", "default": true },
    "scales": { "type": "array", "items": { "type": "number" }, "default": [1] }
  }
}
```

## Related

- [Storage Plugin](/plugins/storage): Cloud provider integration guide.
- [Target Lock](/lock-target): Universal format locking across gateways.
