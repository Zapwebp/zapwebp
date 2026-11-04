<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-sdk.svg" width="120" height="120" alt="@zapwebp/sdk logo" />
</p>

# @zapwebp/sdk

Official JavaScript and TypeScript SDK for the Zap image conversion and asset optimization platform. Works offline in-memory by default, or connects to the remote hosted Zap edge service.

Documentation: [https://zapwebp.vercel.app/docs](https://zapwebp.vercel.app/docs)

---

## Features

- **Zero-Config In-Memory Execution:** Runs completely offline by default using the `@zapwebp/core` engine. No API keys, no network requests, and zero latency in local development and CI pipelines.
- **Remote Edge API Support:** Configure `baseUrl: 'https://zapwebp.vercel.app'` to delegate large batch workloads to the hosted serverless API.
- **Multi-Target Bundling:** Convert an image to multiple formats simultaneously (`to: ['webp', 'avif', 'png']`) in a single call.
- **Project Asset Optimization:** Automated directory scanning and modern format generation with byte-savings reporting.
- **Webhook Security:** Built-in cryptographic verification for webhook payloads via HMAC SHA-256.

---

## Installation

```bash
pnpm add @zapwebp/sdk
# or
npm install @zapwebp/sdk
```

---

## Quick Starts

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

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
