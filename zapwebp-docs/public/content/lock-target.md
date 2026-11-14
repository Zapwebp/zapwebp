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

Target Lock turns Zapwebp from a discretionary converter into a **4-stage smart ingestion gateway**:

```
Input Asset → [Stage 1: Detect] → [Stage 2: Lock Decision] → [Stage 3: Size Bounds] → [Stage 4: Compression] → Canonical Output
```

The developer configures the target format once. Every asset that enters—whether SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF—is normalized to the exact canonical format. Consumers of your storage bucket, database, or CDN never encounter mixed formats.

### The 4-Stage Ingestion Pipeline

1. **Stage 1 (Detect)**: Magic byte sniffing deterministically detects container headers without trusting user file extensions.
2. **Stage 2 (Lock Decision)**:
   - `sameFormat: "passthrough"` (default): When the input already matches the target format and meets size bounds, it bypasses decode/encode overhead entirely for zero generational loss and sub-millisecond execution.
   - `sameFormat: "reencode"`: Decodes and re-compresses using current quality settings.
   - `sameFormat: "reject"`: Strictly rejects input if it is already in target format (`E_SAME_FORMAT_REJECTED`).
3. **Stage 3 (Size Bounds)**: Validates `minInputBytes` and `maxInputBytes` before memory allocation, failing with `E_INPUT_TOO_SMALL` or `E_INPUT_TOO_LARGE`.
4. **Stage 4 (Binary Search Compression)**:
   - `sizeMode: "compress"` (default): When `maxOutputBytes` is specified, converges via binary search across quality $[10, initialQuality]$ in $\le 5$ iterations instead of slow linear decrements.
   - `sizeMode: "strict"`: Rejects immediately if initial quality output exceeds `maxOutputBytes` (`E_OUTPUT_TOO_LARGE`) or falls below `minOutputBytes` (`E_OUTPUT_TOO_SMALL`).
   - `sizeMode: "flexible"`: Emits non-blocking warnings while preserving full quality without failing.

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
| `E_INPUT_TOO_SMALL` | Input file is smaller than `minInputBytes` requirement | Provide a valid asset meeting minimum ingress bounds |
| `E_INPUT_TOO_LARGE` | Input file exceeds `maxInputBytes` before memory allocation | Downscale or compress source asset before upload |
| `E_OUTPUT_TOO_LARGE` | Output cannot fit in `maxOutputBytes` under `sizeMode: "strict"` | Increase `maxOutputBytes`, downscale dimensions, or switch to `compress` |
| `E_OUTPUT_TOO_SMALL` | Output is smaller than `minOutputBytes` requirement | Verify image contains content (not empty placeholder) |
| `E_SAME_FORMAT_REJECTED` | Input matches locked target under `sameFormat: "reject"` | Allow format pass-through or upload different format |
| `E_ALPHA_NOT_REPRESENTABLE` | Locked target is JPEG and transparent input lacks a flatten background | Provide `--background "#ffffff"` or unlock target |

## For agents

```json
{
  "capability": "target-lock",
  "pipeline": "detect -> lock-decision -> size-bounds -> binary-search-compression",
  "supportedTargets": ["webp", "png", "avif", "jpeg", "svg", "gif", "tiff"],
  "configuration": {
    "output.lock": "string (format)",
    "output.strict": "boolean (default: true)",
    "output.sameFormat": "passthrough | reencode | reject (default: passthrough)",
    "output.sizeMode": "compress | strict | flexible (default: compress)",
    "output.minInputBytes": "number",
    "output.maxInputBytes": "number",
    "output.minOutputBytes": "number",
    "output.maxOutputBytes": "number",
    "env": ["ZAPWEBP_TARGET", "ZAPWEBP_STRICT"]
  },
  "cliFlags": [
    "--lock-target <format>",
    "--strict",
    "--no-strict",
    "--same-format <passthrough|reencode|reject>",
    "--size-mode <compress|strict|flexible>",
    "--flexible",
    "--min-input <bytes>",
    "--max-input <bytes>",
    "--min-output <bytes>",
    "--max-output <bytes>",
    "--override-lock"
  ],
  "errorCodes": [
    "E_UNSUPPORTED_FORMAT",
    "E_INPUT_TOO_SMALL",
    "E_INPUT_TOO_LARGE",
    "E_OUTPUT_TOO_LARGE",
    "E_OUTPUT_TOO_SMALL",
    "E_SAME_FORMAT_REJECTED"
  ]
}
```

## Related

- [Formats](/formats): Supported input and output formats.
- [CLI](/cli): Terminal command reference and batch options.
- [Storage Adapters](/plugins/storage): Pre-upload conversion and cloud storage.
- [MCP](/mcp): Model Context Protocol agent configuration.

