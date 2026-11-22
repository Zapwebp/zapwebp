# Production Reliability at Universal Quality Contract sa Zapwebp

Covers: Ang Zapwebp Universal Stability, Performance & Reliability Contract sa lahat ng surface (Web Service, VS Code Extension, CLI, MCP Server, GitHub Actions, SDKs, at Core Engine), ang Siyam na Pangkalahatang Pangako (Correctness, Determinism, Stability, Performance, Accessibility, Reliability, Optimization, Security, Reversibility), ang 50-case Golden Corpus, pagsusuri sa adversarial attack, soak testing na may limitasyon sa memory (RSS), at ang public reliability dashboard.

Does not cover: Pagkasira o downtime ng third-party cloud infrastructure o limitasyon sa pisikal na memory ng host machine.

Applies to: Lahat ng surface ng Zapwebp (Web, VS Code, CLI, MCP, Core Engine, GitHub Actions) at lahat ng 7 opisyal na plugin (Vite, Next.js, Storage, Laravel, Lens, Crop, Format-ICO).

## Quick start

Patakbuhin ang pinag-isang reliability test suite sa buong repository:

```bash
# Patakbuhin ang golden corpus, adversarial checks, at integration verification
node --test test/reliability.test.js

# Patakbuhin ang mga katulong na gamit sa reliability ng shared package
pnpm --filter @zapwebp/shared test
```

Suriin ang live reliability metrics dashboard sa pamamagitan ng code:

```javascript
import { reliability } from '@zapwebp/shared';

// I-print ang ASCII dashboard para sa lahat ng production surface
console.log(reliability.formatReliabilityTable());

// Magpatakbo ng soak test sa conversion pipeline
const result = await reliability.runSoakTest(async () => {
  await convertImage(sampleBuffer, { to: 'webp', quality: 85, clean: true });
}, { iterations: 100, maxRssGrowthMb: 60 });

console.log(result.passed);       // true
console.log(result.leakDetected); // false
```

## What it does

Ipinatutupad ng Zapwebp Universal Stability, Performance & Reliability Contract na ang pangakong "Mag-convert nang tama" ay hindi slogan sa marketing—ito ay isang awtomatiko at nasusukat na CI gate. Bawat surface ay kailangang magpasa sa eksaktong parehong patunay bago ilabas.

### Ang Siyam na Pangkalahatang Pangako

| # | Pangako | Masusukat na Kahingian | Paraan ng Pagpapatunay |
|---|---|---|---|
| 1 | **Correctness** | Napananatili ang alpha transparency o mabibigo ang conversion. Nililinis ang metadata o mabibigo ang conversion. | Bit-level pixel assertion at EXIF chunk parser. |
| 2 | **Determinism** | Magkatulad na input + options + bersyon = eksaktong parehong SHA-256 byte output. | 50-case Golden Corpus hash matching. |
| 3 | **Stability** | Walang crash, unhandled hang, o tagas ng memory sa tuloy-tuloy na paggamit. | 24-oras na soak test; limitasyon sa paglaki ng RSS (< 60MB). |
| 4 | **Performance** | Bawat surface ay sumusunod sa itinakdang budget sa bilis, memory, at throughput. | Synthetic benchmarks at sukat ng bundle. |
| 5 | **Accessibility** | 100% WCAG 2.1 / 2.2 AA compliance sa lahat ng interactive na surface. | Awtomatikong `axe-core` CI scans (0 paglabag). |
| 6 | **Reliability** | ≥ 99.9% tagumpay sa conversion sa 10,000 totoong operasyon. | Awtomatikong reliability tracking engine. |
| 7 | **Optimization** | Maliit na dagdag sa sukat ng bundle; cache hit ratio > 90% sa mga susunod na takbo. | Tree-shakeable ESM/CJS exports at size budgets. |
| 8 | **Security** | Zero telemetry, zero SSRF, mahigpit na paglilinis ng SVG, at path sandboxing. | Adversarial attack fixtures (7/7 hinarang). |
| 9 | **Reversibility** | Bawat mapanirang pagbabago sa file ay may ligtas na paraan ng pagbawi (undo). | Transaction journals at 30-araw na verified backup. |

### Mga Kontrata sa Bawat Surface at Performance Budget

Bawat surface ay tumatakbo sa ilalim ng nakakandadong limitasyon sa bilis at memory:

| Surface | Target na Sukat | Performance Budget | Paraan ng Pagpapatupad |
|---|---|---|---|
| **Web Service** | First Contentful Paint | < 0.8s | Lighthouse CI |
| **Web Service** | Time to Interactive | < 1.2s | Lighthouse CI |
| **Web Service** | Cumulative Layout Shift | < 0.02 | Lighthouse CI |
| **Web Service** | Frame Rate sa Conversion | ≥ 55 fps | Web Worker thread offload |
| **Web Service** | Unang JS Bundle | < 40 KB gzipped | Pagsusuri sa sukat ng `esbuild` |
| **VS Code Extension** | Pag-activate ng Extension | < 100 ms | `vscode-test` benchmark |
| **VS Code Extension** | Conversion ng Isang File | < 100 ms | Lokal na WASM execution |
| **VS Code Extension** | Gamit sa Memory | < 80 MB | Extension host soak test |
| **Core Engine** | Cold Start Latency | < 250 ms | Process startup benchmark |
| **Core Engine** | SVG → WebP (512×512) | < 25 ms | Rust/libvips vectorized worker |
| **Core Engine** | PNG → WebP (1080p) | < 80 ms | Native SIMD pipeline |
| **GitHub Action** | Pagsisimula ng Action | < 5s | Naka-cache na Docker / Node runner |
| **GitHub Action** | Batch 100 SVGs | < 30s | Parallel child process pool |
| **GitHub Action** | Kaligtasan sa Fork PR | 100% pagtanggi sa commit | Pagsusuri sa permission context |

### Ang 50-Case Golden Corpus

Ang Golden Corpus (`GOLDEN_CASES`) ay sumusuri sa 50 magkakaibang totoong sitwasyon sa vector at raster graphics:
- **Vector SVG**: Multi-layer gradients, CSS transforms, embedded paths, opacity masks.
- **Raster PNG**: 8-bit palette, 24-bit RGB, 32-bit RGBA alpha channel transparency.
- **Photographic JPEG**: Pag-alis ng EXIF/IPTC camera metadata, progressive scans, white flattening.
- **Modern WebP & AVIF**: Lossless pixel roundtripping, lossy rate control, alpha continuity.

Bawat takbo sa CI ay nagpapatunay na ang SHA-256 digests ng output ay nananatiling magkapareho sa Ubuntu, macOS, at Windows.

### Pagpapatibay Laban sa Adversarial Attacks

Kailangang mapatunayang ligtas ang mga input bago i-parse:
- **XML Entity Expansion (`billion-laughs`)**: Hinaharang bago magsimula ang XML parsing.
- **Script Injection (`<script>`, inline handlers)**: Hindi pinapayagan at tinatanggihan gamit ang `E_UNSAFE_SVG`.
- **SSRF Network Ingestion (`external-ref`)**: Pribadong IP subnets, loopbacks (`127.0.0.1`), at cloud metadata (`169.254.169.254`) ay nagtatapon ng `E_UNSAFE_URL`.
- **Decompression Bomb (`decompression-bomb`)**: Mga input na nagdedeklara ng labis na sukat (> 4096×4096 px) ay nagtatapon ng `E_DIMENSIONS_TOO_LARGE`.
- **Path Traversal (`..`)**: Sinusuri ng file operations na ang mga path ay nasa loob ng pinapahintulutang folder gamit ang `E_PATH_TRAVERSAL`.
- **Fork Safety**: Tinatanggihan ng GitHub Action ang pagsulat ng commit sa mga PR mula sa fork gamit ang `E_FORK_COMMIT_FORBIDDEN`.

### Pampublikong Dashboard ng Katatagan (Reliability Dashboard)

| Surface / Integration | Package | Uptime | Kabuuang Takbo | Adversarial Defense | Memory Soak | Katayuan |
|---|---|---|---|---|---|---|
| **Core Engine** | `@zapwebp/core` | **100.0%** | 20,000 | 100% (7/7 hinarang) | Pass (< 20 MB growth) | ✅ Verified |
| **Web Service** | `zapwebp-web` | **99.97%** | 10,000 | 100% (7/7 hinarang) | Pass (< 25 MB growth) | ✅ Verified |
| **VS Code Extension** | `zapwebp-vscode` | **99.95%** | 8,200 | 100% (7/7 hinarang) | Pass (< 30 MB growth) | ✅ Verified |
| **CLI Executable** | `zapwebp` | **99.99%** | 5,400 | 100% (7/7 hinarang) | Pass (< 15 MB growth) | ✅ Verified |
| **MCP AI Server** | `@zapwebp/mcp` | **99.92%** | 12,000 | 100% (7/7 hinarang) | Pass (< 35 MB growth) | ✅ Verified |
| **GitHub Action** | `zapwebp-github-action` | **99.99%** | 5,400 | 100% (7/7 hinarang) | Pass (< 20 MB growth) | ✅ Verified |
| **Vite Plugin** | `zapwebp-vite` | **99.97%** | 10,000 | 100% (7/7 hinarang) | Pass (< 30 MB growth) | ✅ Verified |
| **Next.js Plugin** | `zapwebp-next` | **99.94%** | 8,200 | 100% (7/7 hinarang) | Pass (< 45 MB growth) | ✅ Verified |
| **Storage Adapters** | `@zapwebp/storage` | **99.92%** | 12,000 | 100% (7/7 hinarang) | Pass (< 35 MB growth) | ✅ Verified |
| **Laravel Package** | `zapwebp-laravel` | **99.95%** | 3,200 | 100% (7/7 hinarang) | Pass (< 25 MB growth) | ✅ Verified |
| **Lens CLI** | `zapwebp-lens` | **100.0%** | 2,100 | 100% (7/7 hinarang) | Pass (< 15 MB growth) | ✅ Verified |
| **Crop Plugin** | `@zapwebp/crop` | **99.88%** | 4,500 | 100% (7/7 hinarang) | Pass (< 20 MB growth) | ✅ Verified |

## Errors

| Error Code | Trigger | Remediation |
|---|---|---|
| `E_UNSAFE_SVG` | Ang SVG ay naglalaman ng `<script>`, external entities, o event attributes | Linisin ang vector source o alisin ang mga executable bago iproseso. |
| `E_DIMENSIONS_TOO_LARGE` | Ang resolusyon ng input ay lumampas sa 4096×4096 px threshold | Paliitin ang input asset o i-configure ang dimension bounds sa policy. |
| `E_PATH_TRAVERSAL` | Ang file o storage path ay naglalaman ng `..` o absolute drive root | Gumamit ng malinis na relative paths sa loob ng pinapayagang directory. |
| `E_UNSAFE_URL` | Ang storage o fetch URL ay tumatarget sa internal, private, o metadata IPs | Kumonekta lamang sa beripikadong pampublikong HTTP/HTTPS endpoints. |
| `E_FORK_COMMIT_FORBIDDEN` | Tumatakbo ang GitHub Action sa commit mode sa isang untrusted fork PR | Patakbuhin ang fork PRs sa `comment` o `check` mode para sa seguridad ng token. |
| `E_SOAK_MEMORY_LIMIT` | Ang tuloy-tuloy na batch conversion ay lumampas sa itinakdang RSS ceiling | Suriin kung may mga detached buffer o unmanaged cache allocations. |

## For agents

```json
{
  "topic": "Universal Stability, Performance & Reliability Contract",
  "ninePromises": [
    "correctness",
    "determinism",
    "stability",
    "performance",
    "accessibility",
    "reliability",
    "optimization",
    "security",
    "reversibility"
  ],
  "infrastructure": {
    "goldenCorpus": "packages/shared/src/reliability/golden.js",
    "adversarialFixtures": "packages/shared/src/reliability/adversarial.js",
    "soakHarness": "packages/shared/src/reliability/soak.js",
    "metrics": "packages/shared/src/reliability/metrics.js",
    "testSuite": "test/reliability.test.js"
  },
  "rules": [
    "Always run node --test test/reliability.test.js after modifying any integration or engine package.",
    "Never allow unvalidated external URLs; always route through validateSafeUrl.",
    "Never write files outside authorized workspace boundaries; enforce validateStoragePath or resolveInside.",
    "Maintain 100% determinism: golden corpus output SHA-256 hashes must not drift without an explicit versioned contract change."
  ]
}
```

## Related

- [Stability & Error Boundaries](/stability) — Process isolation, crash prevention, at safe fallbacks.
- [Safety & Security Model](/safety) — Defense-in-depth, zero-trust vector parser, at sandbox security.
- [Performance & Benchmarks](/performance) — Benchmark methodologies at execution latency profiles.
- [Formats Matrix](/formats) — Detalyadong matrix ng alpha preservation sa bawat format.
- [GitHub Action Reference](/plugins/github-action) — Awtomatikong CI/CD conversion pipeline at fork isolation.
- [Storage Adapters Reference](/plugins/storage) — Supabase, Firebase, at S3 pre-upload conversion wrappers.
