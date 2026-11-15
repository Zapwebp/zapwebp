# Production Reliability Masterplan sa Zapwebp

Covers: Ang Production Reliability Masterplan ng Zapwebp Integration Ecosystem, ang anim na pamantayan ng inhenyeriya (Stability, Reliability, Security, Performance, Optimization, Real-World Testing), ang 50-case Golden Corpus, pagsusuri sa adversarial attack, soak testing na may limitasyon sa paglaki ng memory (RSS), at ang public reliability dashboard.
Does not cover: Pagkasira o downtime ng third-party cloud infrastructure o limitasyon sa pisikal na memory ng host machine.
Applies to: Lahat ng 7 opisyal na integration ng Zapwebp (Vite Plugin, Next.js Plugin, GitHub Action, Storage Adapters, Laravel Package, Lens CLI, Crop Plugin) at `@zapwebp/core`.

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

// I-print ang ASCII dashboard para sa lahat ng 7 production integration
console.log(reliability.formatReliabilityTable());

// Magpatakbo ng soak test sa conversion pipeline
const result = await reliability.runSoakTest(async () => {
  await convertImage(sampleBuffer, { to: 'webp', quality: 85, clean: true });
}, { iterations: 100, maxRssGrowthMb: 60 });

console.log(result.passed);       // true
console.log(result.leakDetected); // false
```

## What it does

Ginagarantiya ng Zapwebp Integration Ecosystem ang antas-produksyong katatagan sa mga workstation ng developer, automated CI/CD pipelines, containerized runners, at edge cloud storage. Sa halip na umasa sa "gumagana naman sa makina ko," bawat integration ay sumasailalim sa anim na layuning dimensyon na napatutunayan sa pamamagitan ng deterministic tests.

### Ang Anim na Dimensyon ng Reliability

| Dimensyon | Kahulugan | Paraan ng Pagpapatunay |
|---|---|---|
| **Stability** | Walang crash, hang, o tagas ng memory sa tuloy-tuloy na paggamit. | Continuous soak harness (`runSoakTest`), kisame ng RSS (< 60MB), pagsubaybay sa descriptors. |
| **Reliability** | Parehong-pareho ang byte-for-byte output sa magkatulad na input sa bawat platform. | 50-case Golden Corpus na may SHA-256 cryptographic hashes. |
| **Security** | Imposibleng maglabas ng sikretong data, mag-traverse ng folder, o magpatakbo ng script. | Adversarial attack fixtures (`billion-laughs`, `script-injection`, `external-ref`, `corrupt-header`). |
| **Performance** | Napakababang wrapper overhead at mabilis na oras ng pagtakbo. | Pagsukat sa sub-millisecond latency at mahigpit na limitasyon sa memory. |
| **Optimization** | Maliit na dagdag sa sukat ng bundle at walang labis na dependencies. | Tree-shakeable na dual ESM/CJS exports nang walang mabibigat na frameworks. |
| **Real-World Testing** | Matatag laban sa sirang input, hindi kilalang fork PRs, at kakaibang file path. | Fork safety gates, multi-OS CI matrix (Ubuntu, macOS, Windows), at suporta sa Node 20 at 22. |

### Ang 50-Case Golden Corpus

Binubuo ang Golden Corpus (`GOLDEN_CASES`) ng 50 structured test cases na sumasaklaw sa lahat ng posibleng format:
1. **SVG Vector Graphics**: Pagpapanatili ng transparency, sukat ng viewBox, matatalas na gradients, at pagguhit ng path.
2. **PNG Raster Images**: Transparent alpha channels, opaque screenshots, at 8-bit paletted icons.
3. **JPEG Photographic Images**: Pangangasiwa sa Exif metadata, antas ng lossy compression quality, at pagpapatag sa background.
4. **WebP & AVIF Modern Formats**: Walang bawas na pixel roundtripping (lossless), kontrol sa lossy rate, at alpha continuity.

Bawat kaso ay tumatakbo sa `@zapwebp/core` upang tiyaking pareho at napatutunayan ang SHA-256 hash ng bawat resulta.

### Pagtatanggol Laban sa mga Pag-atake (Adversarial Defense)

Tinatanggihan agad ng bawat integration ang mga mapanganib na input bago pa man ito i-render o i-save sa storage:
- **XML Entity Expansion (`billion-laughs`)**: Hinaharang bago pa basahin ng XML parser.
- **Script Injection (`<script>`, inline handlers)**: Bawal at tinatanggihan nang may error na `E_UNSAFE_SVG`.
- **SSRF Network Ingestion (`external-ref`)**: Ang mga pribadong IP subnet, loopbacks (`127.0.0.1`), at cloud metadata (`169.254.169.254`) ay naglalabas ng `E_UNSAFE_URL`.
- **Path Traversal (`..`)**: Sinisiguro ng file system at storage operations na nasa loob lamang ng pinapayagang folder ang mga file sa pamamagitan ng `E_PATH_TRAVERSAL`.
- **Fork Safety**: Tinatanggihan ng GitHub Action ang pagsulat ng commit mula sa mga untrusted fork pull requests gamit ang `E_FORK_COMMIT_FORBIDDEN`.

### Dashboard ng Katatagan ng mga Integration

| Integration | Surface | Target Environment | Golden Cases | Adversarial Defense | Katayuan ng Soak |
|---|---|---|---|---|---|
| `@zapwebp/vite` | Vite Plugin | Client at SSR builds | 50 / 50 | Hinarang ang Unsafe SVG | Bounded (< 60MB) |
| `@zapwebp/next` | Next.js Plugin | Next.js webpack pipeline | 50 / 50 | Hinarang ang Unsafe SVG | Bounded (< 60MB) |
| `@zapwebp/github-action` | GitHub Action | Container at runner CI | 50 / 50 | Protektado sa Fork at Path | Idempotent |
| `@zapwebp/storage` | Storage Adapters | Supabase, Firebase, S3 | 50 / 50 | Protektado sa SSRF at Path | Bounded (< 60MB) |
| `@zapwebp/laravel` | Laravel Package | PHP web applications | 50 / 50 | Ligtas ang command | Zero-leak |
| `@zapwebp/lens` | Lens CLI | Terminal inspector | 50 / 50 | Ligtas sa sandbox | Bounded (< 60MB) |
| `@zapwebp/crop` | Crop Plugin | Auto-crop transform | 50 / 50 | Naka-clamp ang coordinates | Bounded (< 60MB) |

## Errors

| Error Code | Sanhi | Lunas |
|---|---|---|
| `E_UNSAFE_SVG` | Mayroong `<script>`, external entities, o event attributes ang SVG | Linisin ang vector source o alisin ang mga aktibong elemento bago iproseso. |
| `E_PATH_TRAVERSAL` | Naglalaman ng `..` o absolute drive root ang file path o storage path | Gumamit ng malinis na relative path sa loob ng pinapayagang directory. |
| `E_UNSAFE_URL` | Nakatutok sa pribado, internal, o metadata IP ang storage o fetch URL | Kumonekta lamang sa mga napatunayang pampublikong HTTP/HTTPS endpoint. |
| `E_FORK_COMMIT_FORBIDDEN` | Tumatakbo ang GitHub Action sa commit mode sa isang untrusted fork PR | Gamitin ang `comment` o `check` mode sa mga fork PR upang maprotektahan ang access token. |
| `E_SOAK_MEMORY_LIMIT` | Lumampas sa itinakdang RSS ceiling ang tuloy-tuloy na batch conversion | Suriin ang mga nakabitin na buffers o memory cache na hindi nalilinis. |

## For agents

```json
{
  "topic": "Integration Ecosystem Production Reliability",
  "sixDimensions": [
    "stability",
    "reliability",
    "security",
    "performance",
    "optimization",
    "realWorldTesting"
  ],
  "infrastructure": {
    "goldenCorpus": "packages/shared/src/reliability/golden.js",
    "adversarialFixtures": "packages/shared/src/reliability/adversarial.js",
    "soakHarness": "packages/shared/src/reliability/soak.js",
    "metrics": "packages/shared/src/reliability/metrics.js",
    "testSuite": "test/reliability.test.js"
  },
  "rules": [
    "Always run node --test test/reliability.test.js after modifying any integration package.",
    "Never allow unvalidated external URLs; always route through validateSafeUrl.",
    "Never write files outside authorized workspace boundaries; enforce validateStoragePath or resolveInside.",
    "Maintain 100% determinism: golden corpus output SHA-256 hashes must not drift without an explicit versioned contract change."
  ]
}
```

## Related

- [Stability at Error Boundaries](/stability.md)
- [Safety at Security Model](/safety.md)
- [Performance at Benchmarks](/performance.md)
- [Vite Plugin Reference](/plugins/vite.md)
- [Next.js Plugin Reference](/plugins/next.md)
- [GitHub Action Reference](/plugins/github-action.md)
- [Storage Adapters Reference](/plugins/storage.md)
