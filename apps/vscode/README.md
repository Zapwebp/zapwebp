<p align="center">
  <img src="./icon.png" width="128" height="128" alt="Zapwebp VS Code logo" />
</p>

# Zapwebp for VS Code

Covers: converting images inside VS Code. Commands, settings, transparency behavior.

Does not cover: CLI, MCP server, build plugins.

Applies to: `zapwebp-vscode` v1.1.0 and later, VS Code 1.85+.

## Quick start

1. Install from the Open VSX Registry (publisher: `zapwebp`).
2. Right-click any `.svg` in the Explorer.
3. Click **Zap to WebP**.

A `.webp` file appears next to the source. Transparency preserved. Metadata stripped.

## Commands

| Command | What it does |
|---|---|
| `Zap to WebP` | Convert one or more files |
| `Zap to WebP (@1x, @2x, @3x)` | Generate retina scales |

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
  "commands": ["zapwebp.convert", "zapwebp.convertScales"],
  "settings": {
    "convertOnSave": { "type": "boolean", "default": false },
    "quality": { "type": "number", "default": 85 },
    "clean": { "type": "boolean", "default": true }
  }
}
```

## Related

- [CLI](/cli): Same engine, terminal.
- [MCP](/mcp): Same engine, AI agents.
