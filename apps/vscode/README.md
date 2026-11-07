<p align="center">
  <img src="./zapwebp_logo.png" width="128" height="128" alt="Zapwebp VS Code logo" />
</p>

# Zapwebp for VS Code

Covers: converting images inside VS Code. Commands, settings, transparency behavior.

Does not cover: CLI, MCP server, build plugins.

Applies to: `zapwebp-vscode` v1.1.0 and later, VS Code 1.85+.

## Quick start

1. Install from the Open VSX Registry (publisher: `ebula` / `zapwebp`).
2. Right-click any image (`.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.tiff`) in the Explorer or Editor.
3. Click **Zap to WebP** or choose **Zap Image To...** for other formats.

A converted file appears next to the source in the same directory. Transparency is strictly preserved where supported. Metadata is stripped.

## Commands

| Command | Action | Description |
|---|---|---|
| `Zap to WebP` | Quick Action | Convert one or more images directly to WebP. |
| `Zap to PNG` | Quick Action | Convert one or more images to lossless PNG. |
| `Zap to AVIF` | Quick Action | Convert one or more images to next-gen AVIF. |
| `Zap to JPEG` | Quick Action | Convert one or more images to JPEG (prompts for background flatten color). |
| `Zap to Any Format...` | Interactive Prompt | QuickPick menu to choose target format with visual format guidance. |
| `Zap to WebP (@1x, @2x, @3x)` | Scale Variants | Generate retina multi-scale WebP assets. |
| `Zap Multi-Scale (@1x, @2x, @3x)...` | Scale Variants | Interactive format prompt for retina scale assets. |
| `Show Conversion Logs` | Diagnostic | View real-time Zapwebp output channel logs. |

## Supported Formats

- **Input formats:** SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF (`.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.tif`, `.tiff`).
- **Output formats:** WebP, PNG, AVIF, JPEG.
- **Transparency rules:** Transparent inputs strictly retain alpha in WebP, PNG, and AVIF. Converting to JPEG prompts for background flatten color (default `#ffffff`), preventing accidental black background artifacts.

## Settings

| Setting | Type | Default | What it does |
|---|---|---|---|
| `zapwebp.convertOnSave` | boolean | `false` | Auto-convert on save |
| `zapwebp.baseWidth` | number | `512` | Base width for @1x |
| `zapwebp.quality` | number | `85` | Lossy quality (0–100) |
| `zapwebp.clean` | boolean | `true` | Strip EXIF, XMP, C2PA |
| `zapwebp.outputExtension` | string | `"webp"` | Target format (`webp`, `png`, `avif`, `jpeg`) |

## How it works

All conversion runs locally in the extension host using the same WASM engine as the CLI. **Nothing is uploaded.** Works offline, in remote SSH, in WSL, and in VS Code for the Web.

## What it does not do

- Upload files
- Modify the source file
- Convert folders automatically
- Run on background threads

## Errors

| Error | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains scripts | Remove them, or use CLI with `--allow-unsafe` |
| `E_UNSUPPORTED_FORMAT` | Not a supported image | Check the extension list |
| `E_WRITE_FAILED` | No write permission | Check file/folder permissions |

## For agents

```json
{
  "tool": "zapwebp-vscode",
  "commands": [
    "zapwebp.convert",
    "zapwebp.convertToPng",
    "zapwebp.convertToAvif",
    "zapwebp.convertToJpeg",
    "zapwebp.convertPrompt",
    "zapwebp.convertScales",
    "zapwebp.convertScalesPrompt",
    "zapwebp.showOutput"
  ],
  "settings": {
    "convertOnSave": { "type": "boolean", "default": false },
    "baseWidth": { "type": "number", "default": 512 },
    "quality": { "type": "number", "default": 85 },
    "clean": { "type": "boolean", "default": true },
    "outputExtension": { "type": "string", "default": "webp" }
  }
}
```

## Related

- [CLI](/cli): Same engine, terminal.
- [MCP](/mcp): Same engine, AI agents.
