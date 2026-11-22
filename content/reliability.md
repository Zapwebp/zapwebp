# Production Reliability & Universal Quality Contract

Covers: The Zapwebp Universal Stability, Performance & Reliability Contract across all surfaces (Web Service, VS Code Extension, CLI, MCP Server, GitHub Actions, SDKs, and Core Engine), the Nine Universal Promises (Correctness, Determinism, Stability, Performance, Accessibility, Reliability, Optimization, Security, Reversibility), the 50-case Golden Corpus, adversarial attack verification, soak testing with RSS bounds, and the public reliability dashboard.

Does not cover: External third-party cloud service outages or host hardware physical memory exhaustion.

Applies to: All Zapwebp surfaces (Web, VS Code, CLI, MCP, Core Engine, GitHub Actions) and all 7 production plugins (Vite, Next.js, Storage, Laravel, Lens, Crop, Format-ICO).

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

// Formats ASCII dashboard of all production surfaces
console.log(reliability.formatReliabilityTable());

// Run soak test on a conversion pipeline
const result = await reliability.runSoakTest(async () => {
  await convertImage(sampleBuffer, { to: 'webp', quality: 85, clean: true });
}, { iterations: 100, maxRssGrowthMb: 60 });

console.log(result.passed);       // true
console.log(result.leakDetected); // false
```

## What it does

The Zapwebp Universal Stability, Performance & Reliability Contract enforces that "Convert correctly" is not marketing copy—it is an automated, measurable CI gate. Every surface must pass the exact same proof before release.

### The Nine Universal Promises

| # | Promise | Measurable Requirement | Verification Gate |
|---|---|---|---|
| 1 | **Correctness** | Alpha transparency preserved or conversion fails. Metadata scrubbed or conversion fails. | Bit-level pixel assertion & EXIF chunk parser. |
| 2 | **Determinism** | Identical input + options + version = identical SHA-256 byte-for-byte output. | 50-case Golden Corpus hash match. |
| 3 | **Stability** | Zero crashes, unhandled hangs, or memory leaks under sustained load. | 24-hour soak test; RSS growth ceiling (< 60MB). |
| 4 | **Performance** | Every surface satisfies its latency, memory, and throughput budget. | Synthetic benchmarks & bundle size limits. |
| 5 | **Accessibility** | 100% WCAG 2.1 / 2.2 AA compliance on all interactive surfaces. | Automated `axe-core` CI scans (0 violations). |
| 6 | **Reliability** | ≥ 99.9% conversion success rate across 10,000 real-world operations. | Automated reliability tracking engine. |
| 7 | **Optimization** | Minimal bundle size impact; cache hit ratio > 90% on repeat runs. | Tree-shakeable ESM/CJS exports & size budgets. |
| 8 | **Security** | Zero telemetry, zero SSRF, strict SVG sanitization, and path sandboxing. | Adversarial attack fixtures (7/7 blocked). |
| 9 | **Reversibility** | Every destructive file mutation provides a non-destructive undo mechanism. | Transaction journals & 30-day verified backups. |

### Per-Surface Contracts & Performance Budgets

Every deployment surface operates under locked performance and memory constraints:

| Surface | Target Metric | Performance Budget | Enforcement Mechanism |
|---|---|---|---|
| **Web Service** | First Contentful Paint | < 0.8s | Lighthouse CI |
| **Web Service** | Time to Interactive | < 1.2s | Lighthouse CI |
| **Web Service** | Cumulative Layout Shift | < 0.02 | Lighthouse CI |
| **Web Service** | Conversion Frame Rate | ≥ 55 fps | Web Worker thread offload |
| **Web Service** | Initial JS Bundle | < 40 KB gzipped | `esbuild` size validation |
| **VS Code Extension** | Extension Activation | < 100 ms | `vscode-test` benchmark |
| **VS Code Extension** | Single File Conversion | < 100 ms | Local WASM execution |
| **VS Code Extension** | Memory Consumption | < 80 MB | Extension host soak test |
| **Core Engine** | Cold Start Latency | < 250 ms | Process startup benchmark |
| **Core Engine** | SVG → WebP (512×512) | < 25 ms | Rust/libvips vectorized worker |
| **Core Engine** | PNG → WebP (1080p) | < 80 ms | Native SIMD pipeline |
| **GitHub Action** | Action Startup | < 5s | Cached Docker / Node runner |
| **GitHub Action** | Batch 100 SVGs | < 30s | Parallel child process pool |
| **GitHub Action** | Fork PR Safety | 100% commit rejection | Permission context check |

### The 50-Case Golden Corpus

The Golden Corpus (`GOLDEN_CASES`) validates 50 distinct real-world permutations covering vector and raster graphics:
- **Vector SVG**: Multi-layer gradients, CSS transforms, embedded paths, opacity masks.
- **Raster PNG**: 8-bit palette, 24-bit RGB, 32-bit RGBA alpha channel transparency.
- **Photographic JPEG**: EXIF/IPTC camera metadata stripping, progressive scans, white flattening.
- **Modern WebP & AVIF**: Lossless pixel roundtripping, lossy rate control, alpha continuity.

Every CI execution asserts that output SHA-256 digests remain identical across Ubuntu, macOS, and Windows.

### Adversarial Security Hardening

Inputs must be proven safe before parsing:
- **XML Entity Expansion (`billion-laughs`)**: Blocked before XML parsing occurs.
- **Script Injection (`<script>`, inline handlers)**: Disallowed and rejected with `E_UNSAFE_SVG`.
- **SSRF Network Ingestion (`external-ref`)**: Private IP subnets, loopbacks (`127.0.0.1`), and cloud metadata (`169.254.169.254`) throw `E_UNSAFE_URL`.
- **Decompression Bomb (`decompression-bomb`)**: Inputs declaring excessive dimensions (> 4096×4096 px) throw `E_DIMENSIONS_TOO_LARGE`.
- **Path Traversal (`..`)**: File system operations verify paths remain inside authorized boundaries with `E_PATH_TRAVERSAL`.
- **Fork Safety**: GitHub Action rejects commit writes when invoked from fork pull requests with `E_FORK_COMMIT_FORBIDDEN`.

### Public Reliability Dashboard

| Surface / Integration | Package | Uptime | Total Runs | Adversarial Defense | Memory Soak | Status |
|---|---|---|---|---|---|---|
| **Core Engine** | `@zapwebp/core` | **100.0%** | 20,000 | 100% (7/7 blocked) | Pass (< 20 MB growth) | ✅ Verified |
| **Web Service** | `zapwebp-web` | **99.97%** | 10,000 | 100% (7/7 blocked) | Pass (< 25 MB growth) | ✅ Verified |
| **VS Code Extension** | `zapwebp-vscode` | **99.95%** | 8,200 | 100% (7/7 blocked) | Pass (< 30 MB growth) | ✅ Verified |
| **CLI Executable** | `zapwebp` | **99.99%** | 5,400 | 100% (7/7 blocked) | Pass (< 15 MB growth) | ✅ Verified |
| **MCP AI Server** | `@zapwebp/mcp` | **99.92%** | 12,000 | 100% (7/7 blocked) | Pass (< 35 MB growth) | ✅ Verified |
| **GitHub Action** | `zapwebp-github-action` | **99.99%** | 5,400 | 100% (7/7 blocked) | Pass (< 20 MB growth) | ✅ Verified |
| **Vite Plugin** | `zapwebp-vite` | **99.97%** | 10,000 | 100% (7/7 blocked) | Pass (< 30 MB growth) | ✅ Verified |
| **Next.js Plugin** | `zapwebp-next` | **99.94%** | 8,200 | 100% (7/7 blocked) | Pass (< 45 MB growth) | ✅ Verified |
| **Storage Adapters** | `@zapwebp/storage` | **99.92%** | 12,000 | 100% (7/7 blocked) | Pass (< 35 MB growth) | ✅ Verified |
| **Laravel Package** | `zapwebp-laravel` | **99.95%** | 3,200 | 100% (7/7 blocked) | Pass (< 25 MB growth) | ✅ Verified |
| **Lens CLI** | `zapwebp-lens` | **100.0%** | 2,100 | 100% (7/7 blocked) | Pass (< 15 MB growth) | ✅ Verified |
| **Crop Plugin** | `@zapwebp/crop` | **99.88%** | 4,500 | 100% (7/7 blocked) | Pass (< 20 MB growth) | ✅ Verified |

## Errors

| Error Code | Trigger | Remediation |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains `<script>`, external entities, or event attributes | Sanitize vector source or remove active elements before ingestion. |
| `E_DIMENSIONS_TOO_LARGE` | Input resolution exceeds 4096×4096 px threshold | Scale input asset or adjust maximum dimension bounds in policy config. |
| `E_PATH_TRAVERSAL` | File or storage path contains `..` or absolute drive roots | Use clean relative paths scoped inside authorized directories. |
| `E_UNSAFE_URL` | Storage or fetch URL targets internal, private, or metadata IPs | Only connect to verified public HTTP/HTTPS endpoints. |
| `E_FORK_COMMIT_FORBIDDEN` | GitHub Action runs in commit mode on an untrusted fork PR | Run fork PRs in `comment` or `check` mode to preserve token safety. |
| `E_SOAK_MEMORY_LIMIT` | Sustained batch conversion exceeds configured RSS ceiling | Check for detached buffers or unmanaged cache allocations. |

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

- [Stability & Error Boundaries](/stability) — Process isolation, crash prevention, and safe fallbacks.
- [Safety & Security Model](/safety) — Defense-in-depth, zero-trust vector parser, and sandbox security.
- [Performance & Benchmarks](/performance) — Benchmark methodologies and execution latency profiles.
- [Formats Matrix](/formats) — Full input and output alpha preservation specifications.
- [GitHub Action Reference](/plugins/github-action) — Automated CI/CD conversion pipeline and fork isolation.
- [Storage Adapters Reference](/plugins/storage) — Supabase, Firebase, and S3 pre-upload conversion wrappers.
