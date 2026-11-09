# Performance & Resource Budgets

Covers: performance budgets (LCP, CLS, INP, frame rates, bundle size limits), Web Worker concurrency pool contracts, transferable ArrayBuffers, IndexedDB streaming persistence, and CLI throughput benchmarks.

Does not cover: network bandwidth latency outside client control.

Applies to: all Zapwebp surfaces v1.1.0 and later.

## Quick start

```bash
# Run local performance and unit benchmarks across packages
pnpm test
```

Executes conversion throughput benchmarks, memory assertions, and format verification tests.

## What it does

Zapwebp guarantees predictable, low-latency execution across terminals, browsers, and AI agents. By executing conversions inside dedicated Web Workers with transferable buffers, client UIs maintain 60 frames per second without main-thread blocking. CLI operations stream assets in bounded memory chunks (< 200 MB RSS), enabling batch conversions of hundreds of files without memory exhaustion.

---

## Performance budgets

| Metric | Budget Target | Enforcement Mechanism |
|---|---|---|
| **LCP (Landing Page)** | < 1.2s | Lighthouse CI & Core Web Vitals |
| **LCP (Web Application)** | < 1.5s | Lighthouse CI & Core Web Vitals |
| **Cumulative Layout Shift (CLS)** | < 0.02 | Synthetic view audits |
| **Interaction to Next Paint (INP)** | < 100ms | Performance timeline tracing |
| **Animation Frame Rate** | ≥ 55 fps | Off-main-thread worker execution |
| **JavaScript Client Bundle** | < 45 KB gzipped | Bundler tree-shaking & size-limit |
| **Core WebAssembly Engine** | < 2.5 MB gzipped | Modular WASM compilation |
| **Single SVG Conversion** | < 50ms | In-memory libvips/resvg benchmarks |
| **Batch Conversion (30 SVGs)** | < 1.5s | Parallel worker pool execution |
| **Peak Memory Consumption** | < 200 MB RSS | Bounded streaming pipeline |

---

## Web worker concurrency contract

Client-side image processing offloads all rasterization, metadata stripping, and compression to dedicated Web Workers:

- **Worker Concurrency Pool**:
  - Automatically provisions worker instances based on hardware concurrency: 2 workers on mobile, 4 workers on desktop, and 1 worker on low-memory environments.
- **Zero-Copy Transferable Buffers**:
  - Image byte arrays are transferred across the thread boundary using `transferable: [buffer]`, eliminating memory duplication and heap thrashing.
- **Backpressure & Memory Guards**:
  - Tasks are throttled if active conversions consume more than 25% of available heap memory.
- **Worker Auto-Recovery**:
  - In the event of an unexpected worker crash or memory eviction, the pool automatically respawns the worker and re-dispatches pending tasks.

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TOO_LARGE` | Input file size exceeds allowable memory bounds | Compress original image or increase `maxBytes` |
| `E_TIMEOUT` | Conversion duration exceeded execution limit | Downscale asset resolution before converting |
| `E_DISK_FULL` | Disk space exhausted during local batch export | Free storage capacity on the host system |

## Related

- [Stability](/stability): Error boundary architecture and degradation rules.
- [CLI](/cli): Terminal execution, globbing, and batch processing.
- [Formats](/formats): Transparency preservation matrix across formats.

## For agents

```json
{
  "performance": {
    "targetFps": 60,
    "maxCliRssMb": 200,
    "workerPoolDesktop": 4,
    "workerPoolMobile": 2,
    "transferableBuffers": true
  }
}
```
