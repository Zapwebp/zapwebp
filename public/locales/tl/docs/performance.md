# Performance at Resource Budgets

Covers: mga performance budget (LCP, CLS, INP, frame rates, bundle size limits), 7 core pipeline optimizations (WASM reuse, target-width direct rasterization, parallel pool, LRU cache, single-pass quality, conditional skips, zero-copy buffers), at CI benchmark verification.

Does not cover: latency ng network connection sa labas ng kontrol ng host application.

Applies to: lahat ng Zapwebp surfaces v1.1.0 at mas bago.

## Quick start

```bash
# Patakbuhin ang kumpletong CI benchmark at performance test suite
pnpm bench
```

Sinusuri ang bilis ng cold start, warm-start throughput, single-image rasterization, 100-file parallel batch processing, at mga limitasyon sa memory.

## What it does

Itinuturing ng Zapwebp ang bilis at pagiging maaasahan bilang isang pormal na arkitektural na kontrata. Binuo ang mga pipeline ng conversion mula pagtanggap ng byte hanggang paglabas ng buffer upang magbigay ng pinakamabilis na operasyon at mababang paggamit ng RAM nang hindi nakokompromiso ang transparency preservation at paglilinis ng metadata.

### Ang 7 Pangunahing Pagpapabilis sa Pipeline

1. **Persistent Engine Instance Reuse**: Pinananatiling aktibo ang mga instance ng native `sharp` at Rust `@resvg/resvg-js`, na nag-aalis ng paulit-ulit na module initialization at nagpapabilis sa kasunod na conversions nang hanggang 70%.
2. **Direktang Target-Width Rasterization**: Ang mga SVG vector ay direktang inirorasterize sa eksaktong kinakailangang lapad (`fitTo: { mode: 'width', value: width }`) sa iisang pasada, nang walang sobrang laking pansamantalang bitmap.
3. **CPU-Bounded Concurrency Pool**: Naglalaman ang `@zapwebp/core` ng `parallelMap` at `ConversionPool` na awtomatikong sumasabay sa dami ng CPU cores nang hindi nauubusan ng memory o nagdudulot ng crash.
4. **Deterministic In-Memory LRU Cache**: May built-in na `ConversionCache` na nakabatay sa cryptographic SHA-256 hash ng input bytes at mga opsyon ng conversion, kaya ang mga magkakaparehong file ay naibabalik sa loob ng microsecond.
5. **Conditional Skips at Passthrough**: Kung ang isang imahe ay tumutugma na sa hinihinging target format, kalidad, at malinis na metadata, ligtas nitong nilalampasan ang muling pag-encode.
6. **Zero-Copy Transferable Buffers**: Ang mga Web Worker sa browser ay gumagamit ng `transferable: [buffer]`, inililipat ang byte array nang walang memory cloning.
7. **Bounded Streaming Pipelines**: Nililimitahan ang alokasyon ng memory (< 80 MB peak RSS bawat file; < 200 MB para sa 100 files), na nagbibigay-daan sa maayos na pagtakbo sa CI environments.

---

## Performance budgets

| Sukat | Target na Budget | Paraan ng Pagpapatupad sa CI |
|---|---|---|
| **Cold Start (unang conversion)** | < 250ms | `bench/cold-start.js` |
| **Warm Start (kasunod na runs)** | < 50ms | `bench/warm-start.js` |
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

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TOO_LARGE` | Lumagpas ang sukat ng file sa memory bounds | Babaan ang sukat ng file o taasan ang `maxBytes` |
| `E_TIMEOUT` | Masyadong matagal ang proseso ng conversion | Babaan ang resolution bago mag-convert |
| `E_DISK_FULL` | Puno ang disk habang nagba-batch export | Magbakante ng espasyo sa lokal na storage |
| `E_PERF_REGRESSION` | Lumampas ang tagal ng pipeline sa CI performance budget | I-optimize ang transform pipeline o suriin ang CPU load |

## Related

- [Stability](/stability): Error boundary architecture at mga patakaran sa degradation.
- [CLI](/cli): Batch conversion at mga diagnostic tool sa terminal.
- [Formats](/formats): Suportadong format matrix at transparency rules.
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
