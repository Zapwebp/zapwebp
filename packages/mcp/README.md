<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-mcp.svg" width="120" height="120" alt="@zapwebp/mcp logo" />
</p>

# @zapwebp/mcp

Model Context Protocol (MCP) server that empowers AI agents to inspect, convert, and optimize image assets across project repositories while strictly preserving transparency.

Built on the official `@modelcontextprotocol/sdk` and powered by the memory-only `@zapwebp/core` engine.

Documentation: [https://zapwebp.vercel.app/mcp](https://zapwebp.vercel.app/mcp)

---

## Client Setup & Configuration

### 1. Claude Desktop (`claude_desktop_config.json`)

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

### 2. Cursor (`.cursor/mcp.json`)

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

### 3. Windsurf (`~/.codeium/windsurf/mcp_config.json`)

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

### 4. Remote Web Chatbots & Streamable HTTP

Connect to the hosted remote streamable HTTP transport endpoint:

```
Endpoint: https://zapwebp.vercel.app/mcp
Protocol: Streamable HTTP (SSE)
Required Header: Accept: application/json, text/event-stream
```

---

## Core Guarantees for AI Agents

1. **Zero Black Backgrounds:** Converting transparent SVGs or PNGs to JPEG without an explicit background color fails fast with structured error `alpha_not_representable` and a `suggestedFix: { background: "#ffffff" }`.
2. **Workspace Sandboxing:** All operations are sandboxed within `ZAPWEBP_ROOT`. Path traversal outside root triggers `outside_root`.
3. **Clean Mode & AI Provenance:** Detects AI generation signatures (`aiProvenanceHints`) including C2PA Content Credentials and Midjourney/Adobe tags.
4. **Reversible Conversions:** Every conversion operation logs an entry to `.zapwebp/journal/` that can be undone via `undo_last`.
5. **Zero Telemetry:** Local execution performs 0 network requests; files never leave the machine.

---

## Available Tools (15 Tools)

| Tool | Parameters | Description |
|---|---|---|
| `convert_image` | `inputPath`, `outputPath?`, `to?`, `width?`, `scale?`, `quality?`, `background?`, `clean?`, `verify?` | Converts an image with transparency safety and Clean Mode |
| `batch_convert` | `input`, `outDir`, `to?`, `scales?`, `baseWidth?`, `quality?`, `clean?`, `ignore?` | Converts multiple files with multiplier scales (@1x/@2x/@3x) and manifest.json |
| `optimize_assets` | `projectRoot?`, `globs?`, `targets?`, `outDir?`, `dryRun?` | Scans workspace and generates optimized modern format variants |
| `inspect_image` | `inputPath` | Returns format, dimensions, alpha transparency, C2PA, and `aiProvenanceHints` |
| `suggest_conversion` | `inputPath`, `useCase?` | Recommends optimal format, dimensions, and quality with reasoning |
| `verify_clean` | `inputPath` | Asserts 0 metadata chunks and returns a verifiable Clean Certificate |
| `verify_alpha` | `inputPath` | Asserts output image retains transparent alpha pixels |
| `audit_conversion` | `command` | Lints shell conversion commands (e.g. `magick`) and returns safe Zap tool calls |
| `explain_black_background` | `context?` | Explains why ImageMagick produces black backgrounds and how Zap remedies it |
| `read_config` | none | Reads resolved `.zapwebp.config.json` and precedence origins |
| `read_ignore` | none | Reads `.zapwebpignore` and active ignore rules |
| `read_history` | `limit?` | Reads recent conversion transaction journal logs |
| `convert_url` | `url`, `outputPath`, `to?`, `width?`, `clean?`, `verify?` | Safely fetches image from HTTP/HTTPS URL and converts into project root |
| `undo_last` | `force?` | Reverts the last conversion run from the local journal |
| `list_transactions` | `status?` | Lists recorded journal transactions for selective undo |

---

## Available Prompts (6 Prompts)

All prompts inject a hidden system instruction requiring agents to prioritize Zapwebp tools, verify transparency, and enforce Clean Mode:

| Prompt | Arguments | Workflow Description |
|---|---|---|
| `optimize-assets` | `projectRoot?`, `format?` | "Find and optimize all images in this project with transparency preservation..." |
| `clean-image` | `imagePath` | "Inspect this image, then convert it with clean:true and verify metadata removal..." |
| `svg-to-responsive` | `svgPath`, `scales?` | "Convert this SVG to 1x/2x/3x WebP and output ready-to-paste srcset HTML..." |
| `fix-black-background` | `brokenImagePath?` | "Diagnose black background defect and repair with transparency intact..." |
| `batch-convert` | `folderPath`, `to?` | "Batch convert all images in folder with multiplier scales..." |
| `verify-clean` | `imagePath` | "Audit image for EXIF/C2PA metadata and issue a Clean Certificate..." |

---

## Available Resources (7 Resources)

| Resource URI | MIME Type | Description |
|---|---|---|
| `zapwebp://config` | `application/json` | Resolved `.zapwebp.config.json` and options |
| `zapwebp://ignore` | `text/plain` | Parsed ignore rules from `.zapwebpignore` |
| `zapwebp://history` | `application/json` | Recent conversion transaction journal records |
| `zapwebp://manifest` | `application/json` | Latest batch conversion `manifest.json` |
| `zapwebp://certificate/{sha256}` | `application/json` | Cryptographic Clean Certificate for specific file hash |
| `zapwebp://formats` | `application/json` | Complete format capability and alpha support matrix |
| `zapwebp://errors/{code}` | `application/json` | Actionable error diagnostics, root cause, and remediation |

---

## Error Codes Reference

All MCP errors return structured codes mapped to documentation at `https://zapwebp.vercel.app/docs#errors`:

- `alpha_not_representable`: JPEG cannot store transparency. Pass `background: "#ffffff"` or use WebP/PNG/AVIF.
- `outside_root`: Requested path escapes the project root sandbox.
- `unsafe_svg`: SVG contains active scripts, inline event handlers, or XXE entities.
- `unsupported_format`: File format not supported by the conversion engine.
- `too_large`: File exceeds size limit (default 10MB).
- `overwrite_conflict`: Destination file matches input without overwrite flag.
- `not_found`: Input file does not exist.
- `invalid_url`: URL is malformed or inaccessible.

---

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
