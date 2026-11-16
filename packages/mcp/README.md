<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-mcp.svg" width="120" height="120" alt="@zapwebp/mcp logo" />
</p>

# @zapwebp/mcp

Model Context Protocol (MCP) server that empowers AI agents to inspect, convert, and optimize image assets across project repositories while strictly preserving transparency.

Covers: Model Context Protocol (MCP) server over stdio and Streamable HTTP (SSE), 20 image tools, AI provenance detection, reversible workspace journaling, and path sandboxing.

Does not cover: Interactive GUI components, long-running daemons with open ports outside MCP, or client-side web rendering.

Applies to: `@zapwebp/mcp` v1.0.0 and later, Node.js >=22.0.0, MCP-compatible clients (Claude, Cursor, Windsurf).

Built on the official `@modelcontextprotocol/sdk` and powered by the memory-only `@zapwebp/core` engine.

Documentation: [https://zapwebp.vercel.app/mcp](https://zapwebp.vercel.app/mcp)

---

## Quick start

Run the MCP server directly using `npx`:

```bash
npx -y @zapwebp/mcp
```

Or configure it in your AI coding assistant (Cursor, Claude Desktop, Windsurf).

## What it does

`@zapwebp/mcp` connects AI coding agents to Zapwebp's conversion engine:
- **Zero Black Backgrounds:** Converting transparent SVGs or PNGs to JPEG without an explicit background color fails fast with structured error `alpha_not_representable` and a `suggestedFix: { background: "#ffffff" }`.
- **Workspace Sandboxing:** All operations are sandboxed within `ZAPWEBP_ROOT`. Path traversal outside root triggers `outside_root`.
- **Clean Mode & AI Provenance:** Detects AI generation signatures (`aiProvenanceHints`) including C2PA Content Credentials and Midjourney/Adobe tags.
- **Reversible Conversions:** Every conversion operation logs an entry to `.zapwebp/journal/` that can be undone via `undo_last`.
- **Zero Telemetry:** Local execution performs 0 network requests; files never leave the machine.

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

### 4. Cline & Open Source IDE Extensions

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

---

## Core Guarantees for AI Agents

1. **Zero Black Backgrounds:** Converting transparent SVGs or PNGs to JPEG without an explicit background color fails fast with structured error `alpha_not_representable` and a `suggestedFix: { background: "#ffffff" }`.
2. **Workspace Sandboxing:** All operations are sandboxed within `ZAPWEBP_ROOT`. Path traversal outside root triggers `outside_root`.
3. **Clean Mode & AI Provenance:** Detects AI generation signatures (`aiProvenanceHints`) including C2PA Content Credentials and Midjourney/Adobe tags.
4. **Reversible Conversions:** Every conversion operation logs an entry to `.zapwebp/journal/` that can be undone via `undo_last`.
5. **Zero Telemetry:** Local execution performs 0 network requests; files never leave the machine.

---

## Available Tools (20 Tools)

| Tool | Parameters | Description |
|---|---|---|
| `convert_image` | `inputPath`, `outputPath?`, `to?`, `width?`, `scale?`, `quality?`, `background?`, `clean?`, `verify?` | Converts an image with transparency safety and Clean Mode |
| `batch_convert` | `input`, `outDir`, `to?`, `scales?`, `baseWidth?`, `quality?`, `clean?`, `ignore?` | Converts multiple files with multiplier scales (@1x/@2x/@3x) and manifest.json |
| `optimize_assets` | `projectRoot?`, `globs?`, `targets?`, `outDir?`, `dryRun?` | Scans workspace and generates optimized modern format variants |
| `inspect_image` | `inputPath` | Returns format, dimensions, alpha transparency, C2PA, and `aiProvenanceHints` |
| `suggest_conversion` | `inputPath` | Analyzes pixel buffer to recommend optimal format, quality, and lossless settings |
| `apply_smart` | `inputPath`, `outputPath?` | Applies content-aware smart optimization converting to recommended format/quality |
| `get_performance_report` | `path?`, `since?`, `format?`, `topN?` | Aggregates conversion logs into an Enterprise Performance & Carbon Report |
| `validate_policy` | `policyPath?` | Validates the project's team governance policy (`zapwebp.policy.json`) |
| `get_policy_status` | `policyPath?` | Returns team policy status, active exceptions, and expired exception warnings |
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

## Errors

All MCP errors return structured codes mapped to documentation at `https://zapwebp.vercel.app/docs#errors`:

| Code | Cause | Fix |
|---|---|---|
| `alpha_not_representable` | JPEG cannot store transparency | Pass `background: "#ffffff"` or select WebP/PNG/AVIF |
| `outside_root` | Requested path escapes the project root sandbox | Specify relative paths residing within workspace root |
| `unsafe_svg` | SVG contains active scripts or XXE entities | Sanitize SVG or pass explicit unsafe authorization |
| `unsupported_format` | File format not supported | Use supported input formats (SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF) |
| `too_large` | File exceeds maximum allowable bytes | Downsample image before submitting to MCP tool |
| `overwrite_conflict` | Destination file exists without overwrite flag | Enable overwrite option or provide distinct destination |

---

## For agents

```json
{
  "tool": "@zapwebp/mcp",
  "protocol": "Model Context Protocol (MCP)",
  "toolsCount": 20,
  "topTools": [
    "convert_image",
    "batch_convert",
    "inspect_image",
    "suggest_conversion",
    "apply_smart",
    "verify_clean",
    "verify_alpha"
  ],
  "resources": [
    "zapwebp://config",
    "zapwebp://ignore",
    "zapwebp://history",
    "zapwebp://formats"
  ]
}
```

---

## Related

- [MCP Documentation](https://zapwebp-docs.vercel.app/mcp): Complete protocol guide and client setup configs.
- [AI Integration](https://zapwebp-docs.vercel.app/ai-integration): Developer primitives and vision model pipelines.
- [CLI Reference](https://zapwebp-docs.vercel.app/cli): Terminal equivalent for scripts and build gates.

---

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
