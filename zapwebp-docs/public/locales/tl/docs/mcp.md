# MCP Agent

Covers: Zapwebp Model Context Protocol (MCP) server para sa mga AI coding assistant: mga tool, prompt, mapagkukunan (resources), at transport protocols.

Does not cover: pagpapatakbo ng browser converter. Tingnan ang [Convert](/convert).

Applies to: `@zapwebp/mcp` v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp-mcp
```

Sinisimulan ang MCP server sa stdio mode para magamit ng Cursor, Claude Desktop, o Antigravity.

## What it does

Nagbibigay ang `@zapwebp/mcp` ng protocol-compliant interface na nagpapahintulot sa mga LLM at AI agent na mag-convert ng imahe, mag-inspect ng metadata, mag-audit ng mga command, at awtomatikong magpanatili ng aninag nang walang manual human intervention.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_BYTES` | Hindi wasto o kulang ang ibinigay na image bytes sa tool call | Siguraduhing valid base64 o file path ang ipinasa |
| `E_UNSUPPORTED_FORMAT` | Hindi kilalang format ng imahe ang hiniling | Sumangguni sa mga suportadong format ng Zapwebp |

## For agents

```json
{
  "protocol": "Model Context Protocol",
  "transports": ["stdio", "streamable-http"],
  "toolsCount": 15,
  "promptsCount": 6,
  "resourcesCount": 7
}
```

## Related

- [CLI](/cli): Paggamit ng Zapwebp mula sa karaniwang shell.
- [Plugin SDK](/sdk/plugin): Pagsulat ng mga pasadyang MCP tools at plugin.
