# VS Code Extension

Covers: converting images directly within VS Code and cursor/windsurf environments via the Open VSX Registry, context menu commands, retina scale variants (@1x/@2x/@3x), and local WASM execution.

Does not cover: terminal CLI operations, MCP server stdio pipelines, or build-tool bundlers. See [CLI](/cli) or [MCP Agent](/mcp).

Applies to: `zapwebp-vscode` v1.1.0 and later, VS Code 1.85+.

## Quick start

Install from your preferred extension registry:
- **[Download on Open VSX](https://open-vsx.org/extension/ebula/zapwebp-vscode)** (VSCodium, Cursor, Windsurf, Gitpod)
- **[Download on Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode)** (VS Code)

1. Open your editor's Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for **`zapwebp`**.
3. Click **Install**.
4. In Explorer or Editor tab, right-click any `.svg`, `.png`, `.jpg`, `.webp`, `.avif`, `.gif`, or `.tiff` file.
5. Select **Zap to WebP**, **Zap Image To...**, or **Zap to WebP (@1x, @2x, @3x)**.

Converted files appear immediately adjacent to the source asset with transparency preserved and metadata stripped.

## What it does

- **Open VSX Native**: Published under the canonical `zapwebp` namespace on Open VSX, ensuring instant availability across VS Code, Cursor, Windsurf, VSCodium, and Gitpod.
- **100% In-Process WASM**: All conversions run strictly inside the local extension host via WebAssembly. Zero files are uploaded over the internet; works fully offline and inside air-gapped secure development environments.
- **Multi-Scale Generation**: One-click generation of `@1x`, `@2x`, and `@3x` retina assets configured for modern responsive layouts.
- **Non-Destructive**: Original source files are strictly read-only and never overwritten or removed.

## Commands

| Command | Identifier | Description |
|---|---|---|
| `Zap to WebP` | `zapwebp.convert` | Converts selected files to the target format with alpha preserved. |
| `Zap to WebP (@1x, @2x, @3x)` | `zapwebp.convertScales` | Generates `@1x`, `@2x`, and `@3x` density variants. |

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `zapwebp.convertOnSave` | boolean | `false` | Automatically convert supported images when saved in the editor. |
| `zapwebp.baseWidth` | number | `512` | Baseline width in pixels for 1x multiplier. |
| `zapwebp.quality` | number | `85` | Compression quality rating (1–100). |
| `zapwebp.clean` | boolean | `true` | Purges EXIF, GPS, and C2PA metadata blocks. |
| `zapwebp.outputExtension` | string | `"webp"` | Target format extension (`webp`, `avif`, `png`, `jpeg`). |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | Vector asset contains executable `<script>` tags or external entity references. | Sanitize SVG vectors before converting or disable script execution. |
| `E_ALPHA_NOT_REPRESENTABLE` | Converting transparent image to JPEG format without providing a background color. | Switch output format to `webp` or `png`, or configure a matte background. |

## Related

- [CLI](/cli) — Command-line interface for terminal workflows.
- [MCP Agent](/mcp) — Model Context Protocol for AI coding assistants.
- [Vite Plugin](/plugins/vite) — Build-time asset optimization for web projects.

## For agents

```json
{
  "pkg": "zapwebp-vscode",
  "version": "1.1.0",
  "publisher": "zapwebp",
  "registry": "https://open-vsx.org/extension/zapwebp/zapwebp-vscode",
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/vscode",
  "docs": "https://zapwebp-docs.vercel.app/plugins/vscode"
}
```
