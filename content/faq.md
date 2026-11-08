# Common FAQs

Covers: frequent questions regarding package naming, npm and npx 404 errors, Socket.dev dependency alerts, VS Code extension execution, alpha transparency preservation, defensive SVG sanitization, AI agent MCP integration, and framework adapters.

Does not cover: low-level C and Rust native binding compilation or third-party cloud infrastructure hosting.

Applies to: all Zapwebp surfaces (Web, CLI, MCP, VS Code, Laravel, Vite, Next.js, and SDKs).

## Quick start

```bash
# Run MCP server directly for AI agents
npx -y @zapwebp/mcp

# Convert single image using CLI
npx zapwebp logo.svg --to webp

# Inspect environment and diagnostic status
npx zapwebp doctor
```

These commands provide immediate execution for terminal and AI agent workflows without requiring global installation.

## What it does

Zapwebp provides a unified image conversion platform spanning developer terminals, AI agents, code editors, and client-side browsers. This FAQ addresses real-world architectural decisions, security scanner interpretations, tool naming scopes, and runtime troubleshooting across the entire ecosystem.

---

## Frequently asked questions

### Package scopes & installation

#### Why does `npx zapwebp-mcp` or `npm install zapwebp-mcp` return 404 Not Found?

The official Model Context Protocol server is published under the scoped organization namespace **`@zapwebp/mcp`**, not the bare unscoped name `zapwebp-mcp`.

To run or install the MCP server:

```bash
# Direct execution with npx
npx -y @zapwebp/mcp

# Direct execution with pnpm
pnpm dlx @zapwebp/mcp

# Install locally in project
npm install -D @zapwebp/mcp
```

Here is the authoritative package name directory across registries:

| Product / Capability | Registry & Scope | Official Package Identifier | Command / Installation |
|---|---|---|---|
| **CLI (Unscoped)** | npm | `zapwebp` | `npx zapwebp <file>` |
| **CLI (Scoped)** | npm | `@zapwebp/cli` | `pnpm dlx @zapwebp/cli` |
| **MCP AI Server** | npm | `@zapwebp/mcp` | `npx -y @zapwebp/mcp` |
| **Core Engine** | npm | `@zapwebp/core` | `npm install @zapwebp/core` |
| **UI Kit & Store** | npm | `@zapwebp/ui` | `npm install @zapwebp/ui` |
| **VS Code Extension** | Open VSX / Marketplace | `ebula.zapwebp-vscode` | `ovsx install ebula.zapwebp-vscode` |
| **Laravel Package** | Packagist / Composer | `zapwebp/laravel` | `composer require zapwebp/laravel` |
| **Vite Plugin** | npm | `zapwebp-vite` | `npm install -D zapwebp-vite` |
| **Next.js Plugin** | npm | `zapwebp-next` | `npm install -D zapwebp-next` |
| **Storage Adapters** | npm | `@zapwebp/storage` | `npm install @zapwebp/storage` |
| **Lens Inspector** | npm | `zapwebp-lens` | `npx zapwebp-lens inspect <file>` |
| **Crop Transform** | npm | `@zapwebp/crop` | `npm install @zapwebp/crop` |
| **SDK Client** | npm | `@zapwebp/sdk` | `npm install @zapwebp/sdk` |

---

### Security scanners & Socket.dev alerts

#### Why does Socket.dev show "High CVE" on older Zapwebp releases?

Older releases referenced upstream dependencies (`sharp@0.33.5`) containing inherited vulnerabilities in native C libraries (`libvips` CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, and `libheif`).

All modern releases lock `sharp` to **`^0.35.5`**, resolving all known CVEs. Running `pnpm audit` in the repository confirms **0 vulnerabilities**. Socket.dev displays alerts for the specific version requested in the URL; once Socket crawls the latest published version (`1.1.1` and `2.14.0`), those dependency alerts clear.

#### Why does Socket.dev flag "Unstable ownership"?

"Unstable ownership" is a generic supply-chain heuristic triggered whenever an npm package belongs to a newly registered user account or newly created organization scope (`@zapwebp`). It reflects account age, not malicious behavior or compromised code.

#### Why do scanners flag "Shell access" and "Install scripts"?

High-performance image conversion requires precompiled platform-specific C++ (`libvips`) and Rust (`resvg`) binaries for macOS, Linux, and Windows. During `npm install`, native packages download or link the appropriate prebuilt binary for the host operating system (`@img/sharp-*`, `@resvg/resvg-js-*`). Zapwebp itself includes zero postinstall scripts, zero external curl executions, and zero shell wrappers.

#### Does Zapwebp phone home or collect telemetry?

**No.** Rule 6 of the Zapwebp Operating Contract strictly enforces zero telemetry. No analytics trackers, no error-monitoring beacons (Sentry, LogRocket), and no phone-home network calls exist anywhere in the codebase. Conversions execute 100% in local memory or within your isolated container.

---

### VS Code extension troubleshooting

#### Why did VS Code show: `'zap.cmd' is not recognized as an internal or external command`?

Early extension releases invoked `zap.cmd` through the Windows shell assuming the CLI was installed globally in your system `PATH`.

In `ebula.zapwebp-vscode` v1.2.0, this was permanently replaced by an enterprise-grade 3-tier execution pipeline:

1. **Tier 1 (In-Process)**: Direct in-memory conversion using native/WASM bindings.
2. **Tier 2 (Bundled Node Runner)**: Automatically resolves the system `node.exe` binary and executes the extension's self-bundled `dist/zap.js` runner directly (`node.exe dist/zap.js ...`), eliminating any dependency on Windows `.cmd` wrappers or global PATH entries.
3. **Tier 3 (Subprocess Fallback)**: Runs `npx --yes zapwebp` as a final fallback.

If you encounter this error on Windows:
1. Update `ebula.zapwebp-vscode` to **v1.2.0** or later from Open VSX or VS Code Marketplace.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run: **`Developer: Reload Window`**.

---

### Transparency & alpha preservation

#### Why does converting transparent images to JPEG throw `E_ALPHA_NOT_REPRESENTABLE`?

The JPEG format is strictly 24-bit RGB and has **no alpha channel**. 

Standard image tools (like ImageMagick or naive scripts) typically composite transparent pixels onto an uninitialized canvas defaulting to solid black (RGB 0, 0, 0). This causes the infamous "black background bug" where transparent logos become black boxes.

Zapwebp strictly enforces transparency safety:
- It **never** silently discards alpha channels.
- Converting a transparent image to JPEG requires an explicit `--background <color>` parameter (e.g. `--background "#ffffff"` or `--background white`).
- If no background is provided, Zapwebp halts immediately with `E_ALPHA_NOT_REPRESENTABLE` to prevent silent data corruption.
- To maintain full transparency, convert to **WebP**, **AVIF**, or **PNG**.

---

### Defensive SVG security

#### Why was my SVG rejected with `E_UNSAFE_SVG`?

SVG files are XML documents. They can contain active JavaScript (`<script>`, inline `onload` or `onclick` handlers), embedded HTML frames (`<foreignObject>`), external stylesheet imports (`@import`), or XML External Entity (XXE) expansion attacks (`<!DOCTYPE>` / `<!ENTITY>`).

Zapwebp employs defensive vector ingestion:
- Any SVG containing active scripts or executable tags is immediately rejected before rasterization.
- Remote external network URLs (`http://`, `https://`) in `<image>` or `<use>` tags are blocked to eliminate Server-Side Request Forgery (SSRF) and data exfiltration.
- Only static vector geometry (`<path>`, `<rect>`, `<circle>`, `<polygon>`, `<g>`) and inline data URIs are permitted.

To resolve: sanitize your SVG with tools like SVGO or remove `<script>` and event handlers before converting.

---

### AI agent & MCP integration

#### How do I configure Zapwebp MCP in Claude Desktop, Cursor, or Windsurf?

Add the following configuration to your client's MCP configuration file:

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "zapwebp": {
      "command": "npx",
      "args": ["-y", "@zapwebp/mcp"]
    }
  }
}
```

**Cursor & Windsurf** (`~/.cursor/mcp.json` or project settings):

```json
{
  "mcpServers": {
    "zapwebp": {
      "command": "node",
      "args": ["C:/path/to/zapwebp/packages/mcp/bin/zapwebp-mcp.js"]
    }
  }
}
```

Once connected, your AI agent has direct access to 15 tools including `convert_image`, `inspect_image`, `audit_conversion_command`, and `generate_multipliers`.

---

### Framework adapters & middleware

#### What happens if an image fails during a Laravel file upload?

The `@zapwebp/laravel` package provides the `ConvertUploads` middleware. It implements a **fail-open** policy:
- If an uploaded file fails conversion (e.g. invalid header or corrupt data), the exception is logged as a warning (`Log::warning("Zapwebp failed to convert...")`).
- The middleware retains the original uploaded file unchanged and allows the request to complete, ensuring user registration and checkout forms never crash.

#### How do Vite and Next.js handle multi-format image generation?

Both `zapwebp-vite` and `zapwebp-next` support parallel multi-format generation:

```javascript
// vite.config.js
import { zapwebp } from 'zapwebp-vite';

export default {
  plugins: [
    zapwebp({
      formats: ['webp', 'avif'],
      quality: 85,
      clean: true,
    })
  ]
};
```

In Vite, import queries allow generating responsive HTML structures:
```html
import pictureHtml from './hero.png?picture';
```

In Next.js, `zapwebpLoader` integrates natively with `next/image`:
```tsx
import Image from 'next/image';
import { zapwebpLoader } from 'zapwebp-next';

<Image src="/assets/hero.png" width={800} height={600} loader={zapwebpLoader} alt="Hero" />
```

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains scripts, event handlers, or external entity references | Strip `<script>` and inline event attributes from SVG before conversion |
| `E_ALPHA_NOT_REPRESENTABLE` | Converting transparent image to opaque format (JPEG) without background | Supply explicit `--background <color>` (e.g. `--background "#ffffff"`) or use WebP/AVIF |
| `E_UPLOADER_REQUIRED` | Calling `createZapStore().upload()` without providing an active conversion callback | Pass a real conversion handler into the UI store configuration |
| `E_CONVERSION_FAILED` | Underlying raster or vector conversion process exited with an error | Verify file integrity, check dimensions (max 4096px), or run `zap doctor` |
| `E_SSRF_BLOCKED` | Remote image fetch attempted to access private or loopback IP address | Provide a public HTTPS URL or convert local files directly |
| `path_outside_root` | Target file path resolves outside the permitted workspace directory | Keep input and output paths inside the authorized project root |

## For agents

```json
{
  "faqCatalog": {
    "officialPackages": {
      "mcp": "@zapwebp/mcp",
      "cli": "zapwebp",
      "core": "@zapwebp/core",
      "vscode": "ebula.zapwebp-vscode",
      "laravel": "zapwebp/laravel",
      "vite": "zapwebp-vite",
      "next": "zapwebp-next"
    },
    "securityInvariants": {
      "telemetry": false,
      "cveStatus": "clean",
      "sharpVersion": "^0.35.5",
      "maxDimension": 4096,
      "maxPixels": 16777216
    },
    "alphaPolicy": {
      "silentDropForbidden": true,
      "jpegRequiresBackground": true,
      "defaultBackground": "transparent"
    },
    "mcpRunner": "npx -y @zapwebp/mcp"
  }
}
```

## Related

- [Overview](/docs): Platform introduction and multi-surface guide.
- [Safety](/safety): Security policies and parser defenses.
- [Errors](/errors): Comprehensive machine-readable error dictionary.
- [Formats](/formats): Supported raster and vector formats.
- [CLI](/cli): Terminal command reference and flags.
- [MCP Agent](/mcp): Model Context Protocol tools and configuration.
- [VS Code Extension](/plugins/vscode): In-editor conversion guide.

