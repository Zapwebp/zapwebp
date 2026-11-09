# Performance at Resource Budgets

Covers: mga performance budget (LCP, CLS, INP, frame rates, bundle size limits), Web Worker concurrency pool contracts, transferable ArrayBuffers, IndexedDB streaming persistence, at CLI throughput benchmarks.

Does not cover: latency ng network connection sa labas ng kontrol ng client.

Applies to: lahat ng Zapwebp surfaces v1.1.0 at mas bago.

## Quick start

```bash
# Patakbuhin ang benchmark at performance test suites
pnpm test
```

Sinusuri ang bilis ng conversion, limitasyon sa memory, at integridad ng output.

## What it does

Ginagarantiya ng Zapwebp ang mabilis at maasahang operasyon. Sa pamamagitan ng paggamit ng mga Web Worker at transferable buffers, nananatiling 60 frames per second ang visual interface ng browser nang walang lag. Ang CLI naman ay nagpapatakbo ng mga conversion sa loob ng mababang memory budget (< 200 MB RSS) kahit sa malalaking batch.

---

## Mga pamantayan sa performance

- **LCP (Largest Contentful Paint)**: < 1.2s sa landing page; < 1.5s sa web app.
- **CLS (Cumulative Layout Shift)**: < 0.02 para maiwasan ang biglaang paggalaw ng mga elemento sa screen.
- **INP (Interaction to Next Paint)**: < 100ms para sa agarang tugon sa click o tap.
- **Worker Concurrency Pool**: 4 workers sa desktop at 2 sa mobile device para sa parallel conversions.
- **Zero-Copy Transferable Buffers**: Inililipat ang mga pixel buffer sa pagitan ng mga thread nang walang memory cloning.

---

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TOO_LARGE` | Lumagpas ang sukat ng file sa memory bounds | Babaan ang sukat ng file o taasan ang `maxBytes` |
| `E_TIMEOUT` | Masyadong matagal ang proseso ng conversion | Babaan ang resolution bago mag-convert |
| `E_DISK_FULL` | Puno ang disk habang nagba-batch export | Magbakante ng espasyo sa lokal na storage |

## Related

- [Stability](/stability): Error boundary architecture at mga patakaran sa degradation.
- [CLI](/cli): Batch conversion at mga diagnostic tool sa terminal.
- [Formats](/formats): Suportadong format matrix at transparency rules.

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

