<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-sdk.svg" width="120" height="120" alt="@zapwebp/sdk logo" />
</p>

# @zapwebp/sdk

Official JavaScript and TypeScript SDK for the Zap image conversion and asset optimization platform. Works offline in-memory by default, or connects to the remote hosted Zap edge service.

Covers: Official JS/TS client, offline in-memory conversion, remote Edge API communication, multi-target batch optimization, and HMAC webhook verification.

Does not cover: Terminal CLI parsing, native desktop plugins, or custom web component rendering.

Applies to: `@zapwebp/sdk` v1.0.0 and later, Node.js >=22.0.0, browser environments.

Documentation: [https://zapwebp.vercel.app/docs](https://zapwebp.vercel.app/docs)

---

## Quick start

```bash
pnpm add @zapwebp/sdk
# or
npm install @zapwebp/sdk
```

```typescript
import { Zap } from '@zapwebp/sdk';

// Initializes in offline mode by default
const zap = new Zap();

// Convert a single image
const webp = await zap.convert('public/logo.svg', {
  to: 'webp',
  width: 512,
  quality: 85,
});

console.log(`Converted bytes: ${webp.length}, Alpha preserved: ${webp.alphaPreserved}`);
```

## What it does

`@zapwebp/sdk` delivers universal, type-safe image conversion across Node.js, modern browsers, and serverless runtimes:
- **Zero-Config In-Memory Execution:** Runs completely offline by default using the `@zapwebp/core` engine. No API keys, no network requests, and zero latency in local development and CI pipelines.
- **Remote Edge API Support:** Configure `baseUrl: 'https://zapwebp.vercel.app'` to delegate large batch workloads to the hosted serverless API.
- **Multi-Target Bundling:** Convert an image to multiple formats simultaneously (`to: ['webp', 'avif', 'png']`) in a single call.
- **Project Asset Optimization:** Automated directory scanning and modern format generation with byte-savings reporting.
- **Webhook Security:** Built-in cryptographic verification for webhook payloads via HMAC SHA-256.

---

## Usage Examples

### 1. Offline Mode (Default)

```typescript
import { Zap } from '@zapwebp/sdk';

// Initializes in offline mode (runs via @zapwebp/core in memory)
const zap = new Zap();

// Convert a single image
const webp = await zap.convert('public/logo.svg', {
  to: 'webp',
  width: 512,
  quality: 85,
});

console.log(`Converted bytes: ${webp.length}, Alpha preserved: ${webp.alphaPreserved}`);
```

### 2. Multi-Target Output

```typescript
// Generates WebP, AVIF, and fallback PNG variants in one pass
const variants = await zap.convert('assets/banner.png', {
  to: ['webp', 'avif', 'png'],
  width: 1200,
  quality: 80,
});

for (const variant of variants) {
  console.log(`${variant.format}: ${variant.data.length} bytes`);
}
```

### 3. Inspect Image Properties

```typescript
const info = await zap.inspect('assets/hero.png');
console.log({
  format: info.format,
  dimensions: `${info.width}x${info.height}`,
  hasAlpha: info.hasAlpha,
  recommendedTargets: info.recommendedTargets,
});
```

### 4. Optimize Directory Assets

```typescript
const report = await zap.optimize({
  files: ['public/logo.svg', 'public/banner.png'],
  targets: [
    { to: 'webp', quality: 85 },
    { to: 'avif', quality: 60 },
  ],
});

console.log(`Saved ${report.savedPercent}% of total bytes across ${report.totalFiles} files`);
```

### 5. Remote API Mode

```typescript
// Connects to hosted Zap Edge API
const remoteZap = new Zap({
  baseUrl: 'https://zapwebp.vercel.app',
  apiKey: process.env.ZAP_API_KEY,
});

const remoteResult = await remoteZap.convert('photo.jpg', { to: 'webp' });
```

### 6. Webhook Signature Verification

```typescript
import { Zap } from '@zapwebp/sdk';

const isValid = Zap.verifyWebhookSignature(
  rawBodyBuffer,
  req.headers['x-zap-signature'],
  process.env.ZAP_WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).send('Invalid webhook signature');
}
```

---

## TypeScript Types Reference

```typescript
export interface ZapOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface ConvertOptions {
  to?: 'webp' | 'png' | 'jpeg' | 'avif' | Array<'webp' | 'png' | 'jpeg' | 'avif'>;
  width?: number;
  height?: number;
  quality?: number;
  lossless?: boolean;
  background?: string;
  clean?: boolean;
  scales?: number[];
}

export interface ConvertResult {
  format: string;
  width: number;
  height: number;
  data: Buffer;
  length: number;
  alphaPreserved: boolean;
  cleanCertificate?: CleanCertificate;
}
```

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_ALPHA_NOT_REPRESENTABLE` | JPEG conversion attempted from transparent source without background | Supply `background: '#ffffff'` in options |
| `E_UNSUPPORTED_FORMAT` | Unsupported source or target format | Provide supported format (SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF) |
| `E_NETWORK_ERROR` | Remote API endpoint unreachable | Verify `baseUrl` or check network connectivity |
| `E_AUTH_FAILED` | Invalid API key provided for hosted mode | Check `apiKey` configuration |

---

## For agents

```json
{
  "tool": "@zapwebp/sdk",
  "class": "Zap",
  "methods": ["convert", "inspect", "optimize", "verifyWebhookSignature"],
  "modes": ["offline", "remote"]
}
```

---

## Related

- [Core SDK Documentation](https://zapwebp-docs.vercel.app/sdk/core): Engine powering in-memory conversions.
- [Plugin SDK](https://zapwebp-docs.vercel.app/sdk/plugin): Extending SDK workflows with custom hooks.
- [REST API](https://zapwebp-docs.vercel.app/api): HTTP endpoints consumed by remote SDK mode.

---

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
