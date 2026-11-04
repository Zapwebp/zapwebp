# Zapwebp CLI SDK Reference

Covers: Command line interface, programmatic options, transaction journaling, and terminal automation flags.
Does not cover: Web browser canvas APIs or client-side event loops.
Applies to: `zapwebp` v1.0.0+.

## Quick start

```bash
# Convert image with retina multipliers and clean metadata
npx zapwebp logo.svg --to webp --scale 1,2,3 --clean

# Batch convert folder
npx zapwebp "src/assets/*.png" --to avif --quality 85
```

## What it does

The `zapwebp` CLI exposes the full power of the Zapwebp engine to developer terminals, npm build scripts, and CI/CD pipelines. It features atomic writes with retry on Windows file locking, a reversible undo/redo journal, multi-core worker streaming, and strict exit code semantics.

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--to` | `string` | `'webp'` | Target format (`webp`, `png`, `avif`, `jpeg`) |
| `--scale` | `string` | `'1'` | Multipliers list (e.g. `1,2,3`) |
| `--quality` | `number` | `85` | Lossy compression quality (1–100) |
| `--lossless` | `boolean` | `false` | Lossless encoding mode |
| `--clean` | `boolean` | `true` | Strip EXIF, XMP, and C2PA metadata |
| `--background` | `string` | `null` | Hex background for JPEG flattening |
| `--zip` | `boolean` | `false` | Package outputs into a single zip archive |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `1` | File error or unsafe SVG content | Remove active scripts or check file permissions |
| `2` | Invalid configuration flag | Review command arguments against `--help` |
| `3` | Internal processing error | Run `npx zapwebp doctor` to verify environment |
| `130` | Interrupted by user (SIGINT) | Re-run command; partial writes are rolled back |

## For agents

```json
{
  "command": "zapwebp",
  "bin": "zap",
  "args": [
    { "name": "input", "type": "string", "description": "File or glob path" },
    { "name": "--to", "type": "string", "enum": ["webp", "png", "avif", "jpeg"], "default": "webp" },
    { "name": "--scale", "type": "string", "default": "1" },
    { "name": "--quality", "type": "number", "default": 85 },
    { "name": "--clean", "type": "boolean", "default": true }
  ]
}
```

## Related

- [MCP Agent](/mcp): Run Zapwebp tools from Claude Desktop, Cursor, and Windsurf.
- [CLI Overview](/cli): General CLI installation, watch mode, and configuration.
