# VS Code Extension

Covers: converting images directly within VS Code, Cursor, Windsurf, and VSCodium environments via Open VSX Registry, context-aware "Zap" menu with magic byte format detection, preference memory, Explorer folder conversions with mixed formats panel, retina scale variants (@1x/@2x/@3x), and local execution.

Does not cover: terminal CLI operations, MCP server stdio pipelines, or build-tool bundlers. See [CLI](/cli) or [MCP Agent](/mcp).

Applies to: `zapwebp-vscode` v1.3.0 and later, VS Code 1.85+.

## Quick start

Install from your preferred extension registry:
- **[Download on Open VSX](https://open-vsx.org/extension/ebula/zapwebp-vscode)** (VSCodium, Cursor, Windsurf, Gitpod)
- **[Download on Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode)** (VS Code)

1. Open your editor's Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for **`zapwebp`**.
3. Click **Install**.
4. In Explorer or Editor tab, right-click any image file (`.svg`, `.png`, `.jpg`, `.webp`, `.avif`, `.gif`, `.tiff`, `.heic`, `.ico`) and select **Zap**.
5. Pick your target format from the dynamic QuickPick menu. Multipliers (@1x, @2x, @3x) appear automatically for SVG vectors.

Converted files appear immediately adjacent to source assets with transparency preserved and metadata stripped.

## What it does

- **Context-Aware "Zap" Command**: Right-clicking any image runs `zapwebp.zap`. The extension inspects the file's true format using magic bytes rather than trusting file extensions. It generates a tailored QuickPick containing only valid conversion targets (the source format is never offered as a target).
- **Preference Memory**: Remembers your chosen target format per source file type. On subsequent conversions, your preferred format moves to the top marked `★ Last used`.
- **Multi-Select Intelligence**: When selecting multiple files of the same format, converts them all in one batch. When multiple formats are selected (e.g. SVGs and PNGs), prompts with options to convert all to WebP or convert each to its preferred format.
- **Folder Conversion & Mixed Formats Panel**: Right-click any directory in Explorer to scan for convertible assets. If multiple formats are found, an interactive Folder Panel lets you configure target formats and retina multipliers per source format in a single pass.
- **Safe Subfolder Traversal**: Nested subfolder scanning is strictly opt-in, protecting deep project trees. Unsupported files are skipped silently.
- **100% In-Process Execution**: All conversions run strictly inside the local extension host. Zero files are uploaded over the internet; works fully offline and inside air-gapped secure development environments.
- **Multi-Scale Generation**: One-click generation of `@1x`, `@2x`, and `@3x` retina assets configured for modern responsive layouts.
- **Non-Destructive**: Original source files are strictly read-only and never overwritten or removed.

## Commands

| Command | Identifier | Description |
|---|---|---|
| `Zap` | `zapwebp.zap` | Context-aware image conversion with format sniffing and preference memory. |
| `Zap Folder` | `zapwebp.zapFolder` | Scans and batch converts all images in the selected folder. |
| `Zap Folder (Configure Formats)` | `zapwebp.zapPanel` | Opens the interactive panel to assign custom targets per format. |
| `Zap to WebP` | `zapwebp.convert` | Converts selected files to the target format with alpha preserved. |
| `Zap to WebP (@1x, @2x, @3x)` | `zapwebp.convertScales` | Generates `@1x`, `@2x`, and `@3x` density variants. |

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `zapwebp.rememberLastChoice` | boolean | `true` | Remember last-used target format per file type and rank it first. |
| `zapwebp.showMultipliersForPng` | boolean | `false` | Offer @1x, @2x, @3x multipliers for PNG raster sources. |
| `zapwebp.defaultTargets` | object | `{ "svg": "webp", "png": "webp", ... }` | Default recommended target format per source format. |
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
  "version": "1.3.0",
  "publisher": "ebula",
  "marketplace": "https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode",
  "registry": "https://open-vsx.org/extension/ebula/zapwebp-vscode",
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/vscode",
  "docs": "https://zapwebp-docs.vercel.app/plugins/vscode",
  "features": [
    "contextAwareZap",
    "magicByteSniffing",
    "preferenceMemory",
    "mixedMultiSelect",
    "folderConversion",
    "mixedFormatsPanel",
    "subfolderOptIn",
    "contextMenu",
    "retinaMultipliers",
    "localExecution"
  ]
}
```
