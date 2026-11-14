# Performance & Resource Budgets

Covers: performance contracts and budgets, 7 core pipeline optimizations (WASM engine reuse, target-width direct rasterization, parallel pool, LRU cache, single-pass quality evaluation, conditional skips, zero-copy buffers), and CI benchmark verification.

Does not cover: external network latency outside host application boundary.

Applies to: all Zapwebp surfaces v1.1.0 and later.

## Quick start

```bash
# Run the complete CI performance benchmark suite
pnpm bench
```

Executes cold-start latency, warm-start throughput, single-image rasterization, 100-file parallel batch processing, and peak memory assertions.

## What it does

Zapwebp treats performance as a deterministic architectural contract. Conversion pipelines are engineered from byte ingestion to buffer emission to guarantee minimal CPU time, bounded RAM allocation, and maximum parallel throughput without compromising zero-trust transparency or metadata stripping.

### The 7 Core Pipeline Optimizations

1. **Persistent Engine Instance Reuse**: Native `sharp` and Rust-compiled `@resvg/resvg-js` instances are kept warm across conversions, eliminating repetitive module initialization overhead and reducing subsequent conversion latency by up to 70%.
2. **Direct Target-Width Rasterization**: SVG vectors rasterize directly to the requested output dimensions (`fitTo: { mode: 'width', value: width }`) in a single pass, completely bypassing intermediate oversized bitmaps and redundant bicubic scaling steps.
3. **CPU-Bounded Concurrency Pool**: The `@zapwebp/core` engine includes `parallelMap` and `ConversionPool`, automatically saturating available hardware CPU threads while preventing thread starvation, IPC queue bloat, or out-of-memory crashes.
4. **Deterministic In-Memory LRU Cache**: Incorporates `ConversionCache`, keyed on cryptographic SHA-256 hashes of input bytes and exact conversion options. Identical assets yield instant microsecond retrieval with zero CPU re-encoding.
5. **Conditional Skips & Passthrough**: When an input already conforms to the requested target format, quality constraints, and clean metadata policies, re-encoding is safely bypassed.
6. **Zero-Copy Transferable Buffers**: Browser worker conversions use `transferable: [buffer]`, transferring raw byte ownership across thread boundaries without memory duplication.
7. **Bounded Streaming Pipelines**: Memory allocation is hard-capped (< 80 MB peak RSS per single conversion; < 200 MB for 100-file batches), allowing high-volume CI environments to run smoothly without memory leaks.

---

## Performance budgets

| Metric | Budget Target | CI Enforcement Script |
|---|---|---|
| **Cold Start (first conversion)** | < 250ms | `bench/cold-start.js` |
| **Warm Start (subsequent runs)** | < 50ms | `bench/warm-start.js` |
| **Single SVG → WebP (512×512)** | < 25ms | `bench/svg-webp.js` |
| **Single PNG → WebP (1080p)** | < 80ms | `bench/png-webp.js` |
| **Batch Conversion (100 SVGs)** | < 2.5s | `bench/batch.js` |
| **Peak Memory Consumption** | < 80 MB | `bench/memory.js` |
| **LCP (Landing Page)** | < 1.2s | Lighthouse CI & Core Web Vitals |
| **LCP (Web Application)** | < 1.5s | Lighthouse CI & Core Web Vitals |
| **Cumulative Layout Shift (CLS)** | < 0.02 | Synthetic view audits |
| **Interaction to Next Paint (INP)** | < 100ms | Performance timeline tracing |
| **Animation Frame Rate** | ≥ 55 fps | Off-main-thread worker execution |
| **JavaScript Client Bundle** | < 45 KB gzipped | Bundler tree-shaking & size-limit |

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TOO_LARGE` | Input file size exceeds allowable memory bounds | Compress original image or increase `maxBytes` |
| `E_TIMEOUT` | Conversion duration exceeded execution limit | Downscale asset resolution before converting |
| `E_DISK_FULL` | Disk space exhausted during local batch export | Free storage capacity on the host system |
| `E_PERF_REGRESSION` | Pipeline latency exceeded CI performance budget | Optimize transform pipeline or inspect CPU saturation |

## Related

- [Stability](/stability): Error boundary architecture and degradation rules.
- [CLI](/cli): Terminal execution, globbing, and batch processing.
- [Formats](/formats): Transparency preservation matrix across formats.
- [Core SDK](/sdk/core): Programmatic conversion engine API.

## For agents

```json
{
  "performance": {
    "targetFps": 60,
    "maxCliRssMb": 80,
    "maxBatchRssMb": 200,
    "coldStartLimitMs": 250,
    "warmStartLimitMs": 50,
    "singleSvgLimitMs": 25,
    "singlePngLimitMs": 80,
    "batch100LimitMs": 2500,
    "workerPoolDesktop": 4,
    "workerPoolMobile": 2,
    "transferableBuffers": true,
    "lruCacheSupported": true
  }
}
```
