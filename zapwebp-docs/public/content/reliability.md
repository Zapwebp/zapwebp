# Production Reliability Masterplan

Covers: The Zapwebp Integration Ecosystem Reliability Masterplan, the six core engineering dimensions (Stability, Reliability, Security, Performance, Optimization, Real-World Testing), the 50-case Golden Corpus, adversarial attack verification, soak testing with RSS growth bounds, and the public reliability dashboard.
Does not cover: External third-party cloud service outages or host hardware memory limits.
Applies to: All 7 Zapwebp integrations (Vite Plugin, Next.js Plugin, GitHub Action, Storage Adapters, Laravel Package, Lens CLI, Crop Plugin) and `@zapwebp/core`.

## Quick start

Run the unified reliability test suite across the repository:

```bash
# Run golden corpus, adversarial checks, and integration verification
node --test test/reliability.test.js

# Run shared reliability helpers (golden cases, soak harness, metrics)
pnpm --filter @zapwebp/shared test
```

Inspect the live reliability metrics table programmatically:

```javascript
import { reliability } from '@zapwebp/shared';

// Formats ASCII dashboard of all 7 production integrations
console.log(reliability.formatReliabilityTable());

// Run soak test on a conversion pipeline
const result = await reliability.runSoakTest(async () => {
  await convertImage(sampleBuffer, { to: 'webp', quality: 85, clean: true });
}, { iterations: 100, maxRssGrowthMb: 60 });

console.log(result.passed);       // true
console.log(result.leakDetected); // false
```

## What it does

The Zapwebp Integration Ecosystem guarantees production-grade reliability across developer workstations, automated CI/CD pipelines, containerized runners, and edge storage. Instead of assuming "it works on my machine," every integration is held to six objective dimensions proven through deterministic tests.

### The Six Reliability Dimensions

| Dimension | Meaning | Verification Mechanism |
|---|---|---|
| **Stability** | Zero crashes, process hangs, or memory leaks under sustained load. | Continuous soak harness (`runSoakTest`), RSS growth ceiling (< 60MB), descriptor tracking. |
| **Reliability** | Identical bit-for-bit output for identical inputs across runs and platforms. | 50-case Golden Corpus with SHA-256 cryptographic hashes. |
| **Security** | Impossible to exfiltrate data, traverse directories, or execute scripts. | Adversarial attack fixtures (`billion-laughs`, `script-injection`, `external-ref`, `corrupt-header`). |
| **Performance** | Minimal wrapper overhead and predictable execution time. | Sub-millisecond latency tracking and strict memory caps. |
| **Optimization** | Minimal bundle size impact and zero extraneous runtime dependencies. | Tree-shakeable dual ESM/CJS exports with zero heavy frameworks. |
| **Real-World Testing** | Resilient against corrupted inputs, unannounced forks, and unusual paths. | Fork safety gates, multi-OS CI matrix (Ubuntu, macOS, Windows), and multi-Node support (20, 22). |

### The 50-Case Golden Corpus

The Golden Corpus (`GOLDEN_CASES`) consists of 50 structured test cases covering every canonical format permutation:
1. **SVG Vector Graphics**: Transparency preservation, viewBox dimensions, crisp gradients, path rendering.
2. **PNG Raster Images**: Transparent alpha channels, opaque screenshots, 8-bit paletted icons.
3. **JPEG Photographic Images**: Exif metadata handling, lossy compression quality levels, background flattening.
4. **WebP & AVIF Modern Formats**: Lossless pixel roundtripping, lossy rate control, alpha channel continuity.

Each case executes through `@zapwebp/core` and verifies that the output SHA-256 hash is deterministic and repeatable.

### Adversarial Security Hardening

Every integration rejects dangerous inputs before rasterization or storage writing:
- **XML Entity Expansion (`billion-laughs`)**: Blocked before XML parsing occurs.
- **Script Injection (`<script>`, inline handlers)**: Disallowed and rejected with `E_UNSAFE_SVG`.
- **SSRF Network Ingestion (`external-ref`)**: Private IP subnets, loopbacks (`127.0.0.1`), and cloud metadata (`169.254.169.254`) throw `E_UNSAFE_URL`.
- **Path Traversal (`..`)**: File system and storage adapter operations verify paths remain inside allowed boundaries with `E_PATH_TRAVERSAL`.
- **Fork Safety**: GitHub Action rejects commit writes when invoked from fork pull requests with `E_FORK_COMMIT_FORBIDDEN`.

### Integration Reliability Dashboard

| Integration | Surface | Target Environment | Golden Cases | Adversarial Defense | Soak Status |
|---|---|---|---|---|---|
| `@zapwebp/vite` | Vite Plugin | Client & SSR builds | 50 / 50 | Unsafe SVG rejected | Bounded (< 60MB) |
| `@zapwebp/next` | Next.js Plugin | Next.js webpack pipeline | 50 / 50 | Unsafe SVG rejected | Bounded (< 60MB) |
| `@zapwebp/github-action` | GitHub Action | Container & runner CI | 50 / 50 | Fork & path protected | Idempotent |
| `@zapwebp/storage` | Storage Adapters | Supabase, Firebase, S3 | 50 / 50 | SSRF & path protected | Bounded (< 60MB) |
| `@zapwebp/laravel` | Laravel Package | PHP web applications | 50 / 50 | Command sanitized | Zero-leak |
| `@zapwebp/lens` | Lens CLI | Terminal inspector | 50 / 50 | Safe read sandboxed | Bounded (< 60MB) |
| `@zapwebp/crop` | Crop Plugin | Auto-crop transform | 50 / 50 | Boundary clamped | Bounded (< 60MB) |

## Errors

| Error Code | Trigger | Remediation |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains `<script>`, external entities, or event attributes | Sanitize vector source or remove active elements before ingestion. |
| `E_PATH_TRAVERSAL` | File or storage path contains `..` or absolute drive roots | Use clean relative paths scoped inside authorized directories. |
| `E_UNSAFE_URL` | Storage or fetch URL targets internal, private, or metadata IPs | Only connect to verified public HTTP/HTTPS endpoints. |
| `E_FORK_COMMIT_FORBIDDEN` | GitHub Action runs in commit mode on an untrusted fork PR | Run fork PRs in `comment` or `check` mode to preserve token safety. |
| `E_SOAK_MEMORY_LIMIT` | Sustained batch conversion exceeds configured RSS ceiling | Check for detached buffers or unmanaged cache allocations. |

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

- [Stability & Error Boundaries](/stability)
- [Safety & Security Model](/safety)
- [Performance & Benchmarks](/performance)
- [Vite Plugin Reference](/plugins/vite)
- [Next.js Plugin Reference](/plugins/next)
- [GitHub Action Reference](/plugins/github-action)
- [Storage Adapters Reference](/plugins/storage)
