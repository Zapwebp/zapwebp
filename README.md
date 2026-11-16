<div align="center">
  <img src="public/assets/zapwebp.svg" width="96" height="96" alt="Zapwebp logo" />
  <h1>Zapwebp</h1>
  <p><strong>AI-Ready Image Infrastructure</strong></p>
  <p>Built for developers who need reliable, reproducible, privacy-conscious image processing.</p>
  <p>
    <a href="https://zapwebp.vercel.app/">Web App</a> ·
    <a href="https://zapwebp-docs.vercel.app/">Documentation</a> ·
    <a href="https://zapwebp-docs.vercel.app/cli">CLI Docs</a> ·
    <a href="https://zapwebp-docs.vercel.app/mcp">MCP Docs</a> ·
    <a href="https://zapwebp-docs.vercel.app/formats">Format Matrix</a> ·
    <a href="https://zapwebp.vercel.app/llms.txt">llms.txt</a>
  </p>
  <p>
    <img src="https://github.com/Zapwebp/zapwebp/actions/workflows/proofs.yml/badge.svg" alt="Public Guarantees" />
    <img src="https://img.shields.io/badge/Alpha%20Preservation-Verified%20Pixel%20(0,0)-22c55e" alt="Alpha Verified" />
    <img src="https://img.shields.io/badge/Golden%20Corpus-50%20Cases%20Deterministic-blue" alt="Golden Corpus" />
    <img src="https://img.shields.io/badge/Telemetry-0%25%20Local--First-brightgreen" alt="Zero Telemetry" />
  </p>
</div>

> **Stop marketing features. Start proving guarantees.**
>
> Zapwebp is not just an image converter. It is a deterministic, privacy-first image infrastructure bridge designed for human developers and autonomous AI agents.

---

## The Five Promises (The Manifesto)

1. **Correctness:** *Conversion is not enough. Verify the result.*
   Transparent pixels stay transparent. Flattening transparent inputs to JPEG strictly requires an explicit background color—silent black-box alpha dropping is forbidden (`E_ALPHA_NOT_REPRESENTABLE`).
2. **Reproducibility:** *Same input, same configuration, same engine version.*
   Conversions produce identical bit-for-bit SHA-256 hashes on Ubuntu, macOS, and Windows, verified nightly against a public [`MANIFEST.json`](MANIFEST.json).
3. **Privacy:** *Local-first processing. No mandatory cloud uploads.*
   Zero telemetry, zero analytics tracking beacons, zero cloud storage of user media. 100% memory execution.
4. **Extensibility:** *Plugins, not a closed ecosystem.*
   A frozen, deterministic core engine surrounded by open plugins (`FormatHandler`, `StorageAdapter`, `TransformStep`) scaffolded via `npx create-zapwebp`.
5. **Universality:** *One engine. Multiple developer environments.*
   Identical behavior across Browser (WASM), Terminal (`zap`), Code Editor (VS Code), AI Agents (`@zapwebp/mcp`), and CI/CD pipelines.

---

## Publicly Proving the Guarantees

Don't trust our claims. Inspect our continuous public proofs:

### 1. Transparency Preservation (Proof 1)
- **The Guarantee:** Every transparent vector or raster asset preserves alpha transparency at pixel coordinate `(0,0)`.
- **The Proof:** Our public test [`test/proof-transparency.test.js`](test/proof-transparency.test.js) converts transparent SVGs to WebP, PNG, and AVIF and verifies that channel 3 (alpha) at origin `(0,0)` is strictly `0`.
- **Failing Loudly:** Converting transparent inputs to JPEG without an explicit background rejects with non-zero exit code and `E_ALPHA_NOT_REPRESENTABLE`.

### 2. Verification Enforcement (Proof 2)
- **The Guarantee:** The CLI `--verify <sha256>` flag enforces cryptographic verification before writing to disk.
- **The Proof:** If the converted output SHA-256 does not match the expected hash, Zapwebp aborts with `E_VERIFICATION_FAILED`, writes **zero** output bytes, and exits with code `1` ([`packages/cli/test/verify.test.js`](packages/cli/test/verify.test.js)).

### 3. Reproducible Outputs (Proof 3)
- **The Guarantee:** The same 50 golden test cases produce identical SHA-256 hashes across Ubuntu, macOS, and Windows.
- **The Proof:** Multi-OS CI converts all 50 cases and compares hashes against our public [`MANIFEST.json`](MANIFEST.json) on every commit ([`test/proof-reproducibility.test.js`](test/proof-reproducibility.test.js)).

---

## Ecosystem Surfaces

| Surface | Package / App | One-Line Command / Usage | Primary Actor |
|---|---|---|---|
| **Web App** | `public/` | Visit [zapwebp.vercel.app](https://zapwebp.vercel.app/) (100% in-browser WASM) | Designers, one-off web developers |
| **CLI** | `packages/cli` | `npx zapwebp logo.svg --to webp` or `npx zap logo.svg` | Engineers in terminal, build scripts, CI |
| **MCP Server** | `packages/mcp` | `npx -y @zapwebp/mcp` | AI coding assistants (Claude Desktop, Cursor, Windsurf) |
| **VS Code** | `apps/vscode` | Right-click image in Explorer → *Zapwebp: Convert Image* | Frontend developers in code editor |
| **HTTP API** | `packages/api` | `POST /api/v1/convert` | Microservices, webhook pipelines |
| **JS / TS SDK** | `packages/sdk` | `new Zap().convert('logo.svg')` | Web applications, Node backends, edge runtimes |
| **Plugin SDK** | `packages/plugin-sdk`| `definePlugin({ hooks, adapters })` | Platform engineers, storage adapters |
| **Storage Adapters** | `packages/storage`| `storageWrapper({ adapter, to: 'webp' })` | Supabase, Firebase, Neocities cloud pipelines |
| **Pure Crop** | `packages/crop`| `cropTransform({ aspectRatio: '1:1', gravity: 'face' })` | Avatar, banner, and thumbnail transforms |
| **Edge Gateway** | `packages/edge`| `handleEdgeConvert(request, { target: 'webp' })` | Cloudflare Workers, Vercel Edge Functions |

---

## Quick Starts

### 1. Terminal (CLI)
Install globally or run directly via `npx`:
```bash
# Direct run with npx
npx zapwebp logo.svg --to webp

# Convert SVG to WebP with target width
npx zapwebp logo.svg --width 512 --to webp -o logo.webp

# Responsive multipliers (@1x/@2x/@3x) with manifest.json
npx zap icon.png --scale 1,2,3 --out-dir dist/icons

# Batch convert folder into an in-memory ZIP bundle
npx zap 'src/assets/**/*.{svg,png}' --to webp --scale 1,2 --zip -o bundle.zip

# Generate ready-to-paste <img srcset> HTML markup
npx zap hero.png --scale 1,2,3 --srcset

# Revert the last conversion run byte-for-byte
npx zap undo
```

### 2. AI Agents (Model Context Protocol - MCP)
Add to your Claude Desktop configuration (`claude_desktop_config.json`) or Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "zapwebp": {
      "command": "npx",
      "args": ["-y", "@zapwebp/mcp"],
      "env": {
        "ZAPWEBP_ROOT": "."
      }
    }
  }
}
```

Or connect remote AI assistants over Streamable HTTP (SSE) at `https://zapwebp.vercel.app/mcp`.

### 3. Official JS / TS SDK
Install the SDK from npm:
```bash
npm install @zapwebp/sdk
# or
pnpm add @zapwebp/sdk
```

```typescript
import { Zap } from '@zapwebp/sdk';

// Runs 100% offline in-memory by default
const zap = new Zap();

// Multi-target conversion (generates WebP, AVIF, and PNG fallback)
const variants = await zap.convert('banner.png', {
  to: ['webp', 'avif', 'png'],
  width: 1200,
  quality: 85,
});
```

### 4. Code Editor (VS Code Extension - Open VSX)
```bash
# Build extension bundle
pnpm build:vscode

# Package .vsix
npx @vscode/vsce package

# Publish to Open VSX Registry (publisher: zapwebp)
npx ovsx publish $(ls *.vsix) -p $OVSX_PAT
```

### 5. Local Development
```bash
# Clone the repository
git clone https://github.com/Zapwebp/zapwebp.git
cd zapwebp

# Install dependencies
pnpm install

# Start local server (port 3000)
pnpm dev

# Run full workspace test suite (20 package suites + doc compliance)
pnpm test
```

---

## Format Compatibility Matrix

| Input Format | To WebP | To PNG | To JPEG | To AVIF | Transparency Notes |
|---|:---:|:---:|:---:|:---:|---|
| **SVG** | ✅ | ✅ | ⚠️ (Requires `--background`) | ✅ | Vector rasterized over transparent canvas |
| **PNG** | ✅ | ✅ | ⚠️ (Requires `--background`) | ✅ | Alpha preserved; 8-bit / 16-bit supported |
| **JPEG** | ✅ | ✅ | ✅ | ✅ | Opaque input |
| **WebP** | ✅ | ✅ | ⚠️ (Requires `--background`) | ✅ | Lossy and lossless alpha preserved |
| **AVIF** | ✅ | ✅ | ⚠️ (Requires `--background`) | ✅ | Alpha preserved |
| **GIF** | ✅ | ✅ | ⚠️ (Requires `--background`) | ✅ | First frame extracted; alpha preserved |
| **TIFF** | ✅ | ✅ | ⚠️ (Requires `--background`) | ✅ | First page extracted; alpha preserved |

---

## Core Guarantees

1. **Alpha Channel Safety:** WebP, PNG, and AVIF retain transparent pixels by default. Converting transparent images to JPEG strictly requires an explicit `--background` color; Zapwebp never silently converts transparent areas to black boxes.
2. **Reversible Transaction Journaling:** All CLI and MCP conversion runs log to `.zapwebp/journal/<id>.json`. Any run can be rolled back byte-for-byte with `zap undo [id]`.
3. **Clean Mode & AI Provenance:** Strips EXIF, XMP, and C2PA Content Credentials metadata, and produces cryptographically verifiable Clean Certificates.
4. **Security by Default:** SVG inputs with `<script>`, entity expansions (XXE), or external `<image href="http://...">` references are rejected prior to rasterization.
5. **Zero Telemetry:** In-memory execution only. No user tracking, no phone-home analytics, and no cloud asset caching.

---

## Architecture Topology

```text
┌──────────────────────────────────────────────────────────────┐
│                    @zapwebp/core (Shared Engine)             │
│        resvg (Rust SVG) + sharp/libvips (Raster pipeline)    │
│        Sniffing, alpha validation, dimension constraints     │
└──────────────────────────────────────────────────────────────┘
      │              │                 │               │
      ▼              ▼                 ▼               ▼
┌───────────┐ ┌─────────────┐   ┌─────────────┐ ┌──────────────┐
│  Web App  │ │   CLI       │   │  MCP Server │ │   VS Code    │
│  (Public) │ │ zap/zapwebp │   │@zapwebp/mcp │ │  Extension   │
└───────────┘ └─────────────┘   └─────────────┘ └──────────────┘
      │              │                 │               │
      ▼              ▼                 ▼               ▼
┌───────────┐ ┌────────────────────────────────────────────────┐
│ REST API  │ │                   Zap SDK                      │
│  Express  │ │    @zapwebp/sdk  ·  @zapwebp/plugin-sdk        │
└───────────┘ └────────────────────────────────────────────────┘
```

---

## Documentation

- [Documentation Portal](https://zapwebp-docs.vercel.app/)
- [Agentic Documentation Index](content/index.md)
- [Format Compatibility Matrix](content/formats.md)
- [CLI Reference](content/cli.md)
- [MCP Agent Reference](content/mcp.md)
- [Clean Mode & Safety](content/clean.md)
- [Error Codes Catalog](content/errors.md)
- [Machine-readable index (`llms.txt`)](public/llms.txt)

---

## Legal, Policy & Community Documentation

Zapwebp is governed by clear legal and community policies:

- **[Terms of Use (TERMS.md)](TERMS.md)** — Governing law (Republic of the Philippines), AS-IS warranty disclaimers, content rights, and liability limits.
- **[Privacy Policy (PRIVACY.md)](PRIVACY.md)** — Zero server uploads, local in-memory execution, zero telemetry, and cookie-free architecture.
- **[Security Policy (SECURITY.md)](SECURITY.md)** — Supported versions, coordinated vulnerability reporting (`eldrexdelosreyesbula@gmail.com`), and response timelines.
- **[Translation Guide (TRANSLATIONS.md)](TRANSLATIONS.md)** — How to contribute new languages, key-value rules, and CI validation.
- **[Translators Directory (TRANSLATORS.md)](TRANSLATORS.md)** — International contributor recognition roll.
- **[Contributing Guide (CONTRIBUTING.md)](CONTRIBUTING.md)** — Development setup, coding standards, and pull request workflow.
- **[Code of Conduct (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md)** — Contributor Covenant community standards.
- **[Operating Contract (AGENTS.md)](AGENTS.md)** — Technical specifications, engineering principles, and rules of engagement for developers and AI agents.
- **[Skills Declaration (Skills.md)](Skills.md)** — Required contributor capabilities and skills out of scope.
- **[Changelog (CHANGELOG.md)](CHANGELOG.md)** — Keep a Changelog SemVer release notes.

---

<div align="center">
  <img src="public/assets/zapwebp-footer.webp" width="100%" alt="Zapwebp footer artwork" />
</div>

## License

[MIT](LICENSE) © 2026 [Eldrex Delos Reyes Bula](mailto:eldrexdelosreyesbula@gmail.com) / [Zapwebp](https://zapwebp.vercel.app/)
