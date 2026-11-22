# VS Code Extension

Covers: converting images directly within VS Code, Cursor, Windsurf, and VSCodium environments via Open VSX Registry, context-aware "Zap" menu with magic byte format detection, preference memory, Explorer folder conversions with mixed formats panel, retina scale variants (@1x/@2x/@3x), multi-resolution Windows icon and cursor containers (.ico/.cur) generation and extraction, workspace Target Lock enforcement, byte-budget size reduction (Compressor), aspect ratio cropping, and local execution.

Does not cover: terminal CLI operations, MCP server stdio pipelines, or build-tool bundlers. See [CLI](/cli) or [MCP Agent](/mcp).

Applies to: `zapwebp-vscode` v1.4.0 and later, VS Code 1.85+.

## Quick start

Install from your preferred extension registry:
- **[Download on Open VSX](https://open-vsx.org/extension/ebula/zapwebp-vscode)** (VSCodium, Cursor, Windsurf, Gitpod)
- **[Download on Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode)** (VS Code)

1. Open your editor's Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for **`zapwebp`**.
3. Click **Install**.
4. In Explorer or Editor tab, right-click any image file (`.svg`, `.png`, `.jpg`, `.webp`, `.avif`, `.gif`, `.tiff`, `.heic`, `.ico`, `.cur`) and select **Zap**.
5. Pick your target format from the dynamic QuickPick menu. Multipliers (@1x, @2x, @3x) appear automatically for SVG vectors.
6. For icons, select **Zap to ICO** and choose a resolution suite (16x16 through 256x256). For existing `.ico` or `.cur` files, select extraction mode (largest frame, all frames, or specific dimensions).
7. To enforce a strict byte budget, select **Zap to specific size...** and enter a threshold (e.g. `500 KB`).

Converted files appear immediately adjacent to source assets with transparency preserved and metadata stripped.

## What it does

- **Context-Aware "Zap" Command**: Right-clicking any image runs `zapwebp.zap`. The extension inspects the file's true format using magic bytes rather than trusting file extensions. It generates a tailored QuickPick containing only valid conversion targets (the source format is never offered as a target).
- **ICO & CUR Container Engine**: Full container generation and frame extraction powered by `@zapwebp/format-ico`. Convert vectors or rasters into multi-resolution `.ico` bundles (`16x16, 32x32, 48x48, 64x64, 128x128, 256x256` or custom), and extract individual frames or full image suites from `.ico` and `.cur` containers directly into PNG or WebP.
- **Target Lock Policy Enforcement**: Automatically detects `.zapwebp/config.json` in the workspace root. Enforces team conversion standards by defaulting the Zap menu to the locked target and blocking non-compliant formats with `E_FORMAT_REJECTED`. An active status bar indicator displays the current lock state (e.g., `⚡ Zapwebp: WebP lock active`).
- **Target-Size Compressor**: Optimize images to fit strict byte constraints using the `@zapwebp/compressor` plugin. Runs deterministic binary search quality optimization with adaptive Lanczos3 downscaling to guarantee output assets stay strictly within requested byte budgets (e.g. `500 KB`, `1.5 MB`).
- **Crop & Aspect Ratio Controls**: Perform instant aspect ratio cropping (`1:1` avatar, `16:9` hero, `4:3`, `3:2`) directly from the context menu via `@zapwebp/crop`.
- **Idempotent Conversion Lock**: Transparently checks existing sibling output files before running conversions. Skips redundant identical conversions while preserving intentional format migrations.
- **Preference Memory**: Remembers your chosen target format per source file type. On subsequent conversions, your preferred format moves to the top marked `★ Last used`.
- **Multi-Select Intelligence**: When selecting multiple files of the same format, converts them all in one batch. When multiple formats are selected (e.g. SVGs, PNGs, and ICOs), prompts with options to convert all to WebP or convert each to its preferred format.
- **Folder Conversion & Mixed Formats Panel**: Right-click any directory in Explorer to scan for convertible assets. If multiple formats are found, an interactive Folder Panel lets you configure target formats and retina multipliers per source format in a single pass.
- **Safe Subfolder Traversal**: Nested subfolder scanning is strictly opt-in, protecting deep project trees. Unsupported files are skipped silently.
- **100% In-Process Execution**: All conversions run strictly inside the local extension host. Zero files are uploaded over the internet; works fully offline and inside air-gapped secure development environments.
- **Multi-Scale Generation**: One-click generation of `@1x`, `@2x`, and `@3x` retina assets configured for modern responsive layouts.
- **Non-Destructive by Default**: Original source files are preserved by default. When `zapwebp.deleteOriginal` is enabled, original files are backed up to `.zapwebp/backups/` with one-click restore via `zapwebp.undo`.

## Commands

| Command | Identifier | Description |
|---|---|---|
| `Zap` | `zapwebp.zap` | Context-aware image conversion with format sniffing and preference memory. |
| `Zap Folder` | `zapwebp.zapFolder` | Scans and batch converts all images in the selected folder. |
| `Zap Folder (Configure Formats)` | `zapwebp.zapPanel` | Opens the interactive panel to assign custom targets per format. |
| `Zap to WebP` | `zapwebp.convert` | Converts selected files to the target format with alpha preserved. |
| `Zap to PNG` | `zapwebp.convertToPng` | Converts selected files directly to lossless PNG. |
| `Zap to AVIF` | `zapwebp.convertToAvif` | Converts selected files directly to next-gen AVIF. |
| `Zap to JPEG` | `zapwebp.convertToJpeg` | Converts selected files to JPEG with optional background color. |
| `Zap to ICO` | `zapwebp.convertToIco` | Generates multi-resolution Windows icon container with size presets. |
| `Zap to specific size...` | `zapwebp.convertCompress` | Optimizes image quality and scale to satisfy a maximum target byte constraint. |
| `Zap with options...` | `zapwebp.convertWithOptions` | Interactive conversion with aspect ratio cropping, dimensions, and format selection. |
| `Zap to WebP (@1x, @2x, @3x)` | `zapwebp.convertScales` | Generates `@1x`, `@2x`, and `@3x` density variants. |
| `Zapwebp: Undo Last Conversion` | `zapwebp.undo` | Restores original files deleted during the previous conversion session from backup. |

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `zapwebp.rememberLastChoice` | boolean | `true` | Remember last-used target format per file type and rank it first. |
| `zapwebp.showMultipliersForPng` | boolean | `false` | Offer @1x, @2x, @3x multipliers for PNG raster sources. |
| `zapwebp.defaultTargets` | object | `{ "svg": "webp", "png": "webp", "ico": "png", "cur": "ico", ... }` | Default recommended target format per source format. |
| `zapwebp.icoPreset` | string | `"default"` | Default size preset for ICO generation (`default`, `minimal`, `favicon`, `app`). |
| `zapwebp.compressorEnabled` | boolean | `true` | Enable target-size byte optimization commands in context menus. |
| `zapwebp.targetLockEnabled` | boolean | `true` | Enforce workspace `.zapwebp/config.json` target lock policy and status bar indicators. |
| `zapwebp.deleteOriginal` | boolean | `false` | Safely remove original source file after conversion, backing it up to `.zapwebp/backups/`. |
| `zapwebp.convertOnSave` | boolean | `false` | Automatically convert supported images when saved in the editor. |
| `zapwebp.baseWidth` | number | `512` | Baseline width in pixels for 1x multiplier. |
| `zapwebp.quality` | number | `85` | Compression quality rating (1–100). |
| `zapwebp.clean` | boolean | `true` | Purges EXIF, GPS, and C2PA metadata blocks. |
| `zapwebp.outputExtension` | string | `"webp"` | Target format extension (`webp`, `avif`, `png`, `jpeg`, `ico`). |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | Vector asset contains executable `<script>` tags or external entity references. | Sanitize SVG vectors before converting or disable script execution. |
| `E_ALPHA_NOT_REPRESENTABLE` | Converting transparent image to JPEG format without providing a background color. | Switch output format to `webp` or `png`, or configure a matte background. |
| `E_FORMAT_REJECTED` | Target format is rejected by the workspace Target Lock policy in `.zapwebp/config.json`. | Convert to one of the authorized formats specified in `acceptFormats`, or update workspace policy. |
| `E_TARGET_UNREACHABLE` | Image cannot fit under the requested target byte limit even after quality and dimension reduction. | Increase the target byte threshold, allow deeper downscaling, or lower minimum quality. |
| `E_CONVERSION_FAILED` | Internal conversion pipeline failure. | Verify image binary integrity and inspect VS Code output logs for diagnostic details. |

## Related

- [CLI](/cli) — Command-line interface for terminal workflows.
- [MCP Agent](/mcp) — Model Context Protocol for AI coding assistants.
- [Format ICO](/plugins/format-ico) — High-resolution multi-size ICO/CUR format plugin.
- [Compressor](/plugins/compressor) — Binary search quality and size optimizer.
- [Crop](/plugins/crop) — Aspect ratio and smart cropping plugin.
- [Lock](/plugins/lock) — Cryptographic fingerprinting and conversion skip engine.

## For agents

```json
{
  "pkg": "zapwebp-vscode",
  "version": "1.4.0",
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
    "localExecution",
    "icoSupport",
    "curSupport",
    "targetLock",
    "compressor",
    "cropIntegration",
    "lockSkip",
    "undoBackup"
  ]
}
```
