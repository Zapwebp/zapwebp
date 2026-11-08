# MCP

Covers: Model Context Protocol (`@zapwebp/mcp`) server, AI agent tool integration, stdio configuration, and tool schemas.

Does not cover: CLI command flags or browser UI. See [CLI](/cli) and [Convert](/convert).

Applies to: `@zapwebp/mcp` v1.1.0 and later.

## Quick start

```bash
npx -y @zapwebp/mcp
```

Starts the Zapwebp Model Context Protocol server over stdio for compatible AI clients.

## What it does

Exposes structured tools, prompts, and resources to AI assistants (Claude Desktop, Cursor, Windsurf, Cline, Antigravity) for inspecting images, converting formats, optimizing asset directories, scrubbing AI fingerprints, and verifying alpha safety. All operations are sandboxed to the project root with zero telemetry.

## Tools (15 Tools)

| Tool | Parameters | Description |
|---|---|---|
| `convert_image` | `inputPath`, `outputPath`, `to`, `width`, `scale`, `quality`, `background`, `clean`, `verify` | Converts image with verified alpha preservation and Clean Mode |
| `batch_convert` | `input`, `outDir`, `to`, `scales`, `baseWidth`, `quality`, `clean`, `ignore` | Converts multiple files with multiplier scales and manifest.json |
| `optimize_assets` | `projectRoot`, `globs`, `targets`, `dryRun` | Project-aware optimization generating WebP/AVIF/PNG variants |
| `inspect_image` | `inputPath` | Returns format, dimensions, alpha channel, C2PA, and `aiProvenanceHints` |
| `suggest_conversion` | `inputPath`, `useCase` | Returns recommended format, dimensions, quality, and human reasoning |
| `verify_clean` | `inputPath` | Asserts 0 metadata chunks and returns verifiable Clean Certificate |
| `verify_alpha` | `inputPath` | Asserts output image retains transparent pixels |
| `audit_conversion` | `command` | Lints shell conversion commands and returns safe Zap tool calls |
| `explain_black_background` | `context` | Explains why ImageMagick produces black backgrounds and how Zap fixes it |
| `read_config` | `{}` | Reads resolved `.zapwebp.config.json` and precedence origins |
| `read_ignore` | `{}` | Reads `.zapwebpignore` and active ignore rules |
| `read_history` | `limit` | Reads recent conversion transaction journal logs |
| `convert_url` | `url`, `outputPath`, `to`, `width`, `clean`, `verify` | Safely fetches from HTTP/HTTPS URL and converts into project root |
| `undo_last` | `force` | Reverts the last conversion run from the local journal |
| `list_transactions` | `status` | Lists recorded journal transactions for selective undo |

## Prompts (6 Prompts)

| Prompt | Description | What it does |
|---|---|---|
| `optimize-assets` | "Find and optimize all images in this project..." | Runs project-aware optimization across asset folders |
| `clean-image` | "Inspect this image, then convert it with clean:true..." | Inspects provenance and scrubs AI metadata |
| `svg-to-responsive` | "Convert this SVG to 1x/2x/3x WebP and give me srcset..." | Multiplier conversion with responsive `<img srcset>` tags |
| `fix-black-background` | "My WebP has a black background. Explain and fix..." | Explains ImageMagick bug and fixes image with Zap |
| `batch-convert` | "Convert everything in this folder to WebP..." | Batch conversion preserving alpha channel |
| `verify-clean` | "Verify this image has no metadata..." | Returns cryptographic Clean Certificate |

## Resources (7 Resources)

| URI | Content | MIME Type |
|---|---|---|
| `zapwebp://config` | Resolved `.zapwebp.config.json` | `application/json` |
| `zapwebp://ignore` | Parsed ignore rules | `text/plain` |
| `zapwebp://history` | Recent conversion transactions | `application/json` |
| `zapwebp://manifest` | Latest `manifest.json` batch manifest | `application/json` |
| `zapwebp://certificate/{sha256}` | Clean Certificate for a specific hash | `application/json` |
| `zapwebp://formats` | Supported formats and alpha capability matrix | `application/json` |
| `zapwebp://errors/{code}` | Diagnostic documentation and fix for error codes | `application/json` |

## Transports

1. **Local (stdio)**: High-speed, local filesystem access for IDE agents (Cursor, Claude Desktop, VS Code).
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
2. **Remote (Streamable HTTP / SSE)**: Remote endpoint for cloud chatbots connecting via HTTP POST/GET to `/mcp`.

## Examples

### Inspect image for AI provenance and alpha

```bash
$ echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"inspect_image","arguments":{"inputPath":"photo.png"}}}' | npx -y @zapwebp/mcp
{"result":{"content":[{"type":"text","text":"{\n  \"format\": \"png\",\n  \"hasAlpha\": true,\n  \"metadata\": {\n    \"aiProvenanceHints\": [\"CreatorTool contains 'Firefly'\", \"C2PA Content Credentials manifest present\"]\n  }\n}"}]},"jsonrpc":"2.0","id":1}
```

### Convert image with verified alpha safety and Clean Certificate

```bash
$ echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"convert_image","arguments":{"inputPath":"logo.svg","to":"webp","clean":true,"verify":true}}}' | npx -y @zapwebp/mcp
{"result":{"content":[{"type":"text","text":"{\n  \"outputPath\": \"logo.webp\",\n  \"format\": \"webp\",\n  \"alphaPreserved\": true,\n  \"clean\": true,\n  \"certificate\": { \"metadataChunks\": 0 }\n}"}]},"jsonrpc":"2.0","id":2}
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `alpha_not_representable` | Converting transparent input to JPEG without background | Pass `background: "#ffffff"` or choose WebP, PNG, or AVIF |
| `outside_root` | Path escapes the active project root | Use a project-relative path inside the workspace |
| `unsafe_svg` | SVG contains scripts or external references | Remove script tags or external links |
| `overwrite_conflict` | Destination matches source without `overwrite: true` | Specify a different destination or pass `overwrite: true` |
| `unsupported_format` | Input format not supported | Provide SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF |

## For agents

```json
{
  "server": "@zapwebp/mcp",
  "command": "npx -y @zapwebp/mcp",
  "transports": ["stdio", "streamable-http"],
  "capabilities": ["tools", "prompts", "resources"],
  "tools": [
    "convert_image",
    "batch_convert",
    "optimize_assets",
    "inspect_image",
    "suggest_conversion",
    "verify_clean",
    "verify_alpha",
    "audit_conversion",
    "explain_black_background",
    "read_config",
    "read_ignore",
    "read_history",
    "convert_url",
    "undo_last",
    "list_transactions"
  ],
  "prompts": [
    "optimize-assets",
    "clean-image",
    "svg-to-responsive",
    "fix-black-background",
    "batch-convert",
    "verify-clean"
  ],
  "resources": [
    "zapwebp://config",
    "zapwebp://ignore",
    "zapwebp://history",
    "zapwebp://manifest",
    "zapwebp://certificate/{sha256}",
    "zapwebp://formats",
    "zapwebp://errors/{code}"
  ]
}
```

## Related

- [CLI](/cli): Command line tool for build scripts and developers.
- [Safety](/safety): Security rules and sandbox boundaries.

