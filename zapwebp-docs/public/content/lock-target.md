# Target Lock (Many-to-One Conversion)

Covers: Target lock configuration, many-to-one ingestion pipelines, strict mode vs best-effort contracts, CLI flags, Storage adapters, Edge runtimes, MCP tools, and Laravel integrations.

Does not cover: arbitrary multiple format permutations or lossy format downgrades without alpha safety.

Applies to: Zapwebp v1.1.0 and later.

## Quick start

Lock every output to WebP and fail fast on unconvertible files:

```bash
npx zapwebp ./uploads/* --lock-target webp --strict
```

Or configure once for your entire project in `zapwebp.json`:

```json
{
  "output": {
    "lock": "webp",
    "strict": true
  }
}
```

## What it does

Target Lock turns Zapwebp from a discretionary converter into an **ingestion gateway**. The underlying pipeline is:

```
input (any format) → decode() → raw pixels → encode(target) → output
```

The developer configures the target format once. Every asset that enters—whether SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF—is normalized to the exact canonical format. Consumers of your storage bucket, database, or CDN never encounter mixed formats.

### Strict Mode Contract

| Mode | Behavior on Unsupported or Corrupt Input | Best for |
|---|---|---|
| `strict: true` (default) | Operation fails immediately with `E_UNSUPPORTED_FORMAT`. | Production stores, e-commerce, strict CDN pipelines. |
| `strict: false` | Best-effort conversion; unsupported files pass through unchanged. | CMS uploads, permissive ingestion. |

### Integration Surfaces

#### 1. Storage Adapters (`@zapwebp/storage`)
```typescript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const zap = withZapwebp(supabaseAdapter(client), {
  targetFormat: 'webp',
  strict: true,
});

await zap.upload('photos', 'avatar.svg', buffer);
```

#### 2. Edge Runtime (`@zapwebp/edge`)
```typescript
import { createZapHandler } from '@zapwebp/edge';

export default createZapHandler({
  targetFormat: 'webp',
  strict: true,
});
```

#### 3. Web Application
In `zapwebp.json` or `window.ZAPWEBP_CONFIG`:
```json
{
  "webApp": {
    "lockTarget": "webp"
  }
}
```
When configured, the format selector pills in the UI disappear automatically.

#### 4. Laravel & PHP
```php
Zap::convert($path)
    ->lockTarget('webp')
    ->strict()
    ->save($outPath);
```

#### 5. Opt-in Override
Developers can bypass the lock explicitly per call when authorized:
```typescript
await zap.upload('bucket', 'spec.png', bytes, {
  overrideLock: true,
  targetFormat: 'avif',
});
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSUPPORTED_FORMAT` | Input file cannot be decoded into the locked format in strict mode | Upload a supported format or install the format expansion plugin |
| `E_CORRUPT_HEADER` | File is truncated or smaller than valid container header | Verify source asset download integrity |
| `E_TOO_LARGE` | File exceeds maximum byte limit (`maxBytes`) | Resize or optimize asset before conversion |
| `E_ALPHA_NOT_REPRESENTABLE` | Locked target is JPEG and transparent input lacks a flatten background | Provide `--background "#ffffff"` or unlock target |

## For agents

```json
{
  "capability": "target-lock",
  "pipeline": "decode(any) -> pixels -> encode(target)",
  "supportedTargets": ["webp", "png", "avif", "jpeg"],
  "configuration": {
    "output.lock": "string (format)",
    "output.strict": "boolean (default: true)",
    "env": ["ZAPWEBP_TARGET", "ZAPWEBP_STRICT"]
  },
  "cliFlags": [
    "--lock-target <format>",
    "--strict",
    "--no-strict",
    "--override-lock"
  ],
  "errorCode": "E_UNSUPPORTED_FORMAT"
}
```

## Related

- [Formats](/formats): Supported input and output formats.
- [CLI](/cli): Terminal command reference and batch options.
- [Storage Adapters](/plugins/storage): Pre-upload conversion and cloud storage.
- [MCP](/mcp): Model Context Protocol agent configuration.

