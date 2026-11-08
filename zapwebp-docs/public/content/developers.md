# Developers

Covers: Zapwebp developer ecosystem, CLI binaries, Model Context Protocol server, VS Code extension, REST API, and SDK integration.

Does not cover: End-user web converter walkthrough. See [Convert](/convert).

Applies to: `@zapwebp/core`, `@zapwebp/cli`, `@zapwebp/mcp`, and `@zapwebp/sdk` v1.1.0 and later.

## Quick start

```bash
# Convert with CLI
npx zapwebp logo.svg --to webp --scale 1,2,3

# Launch Model Context Protocol server for AI coding agents
npx -y @zapwebp/mcp
```

## What it does

Zapwebp provides a unified, format-aware developer platform for automating high-performance image workflows across editors, terminals, build pipelines, and AI assistants:

- **CLI (`zapwebp` / `zap`)**: Fast, atomic, reversible terminal tool with undo journal, ignore rules, and gitignore integration.
- **MCP Server (`@zapwebp/mcp`)**: 15 tools, 6 prompts, and 7 resources enabling Claude, Cursor, Windsurf, and Copilot to inspect and convert images without alpha loss.
- **VS Code Extension**: Explorer context menu actions, convert-on-save watcher, and side-by-side alpha preview webviews.
- **Plugin SDK (`@zapwebp/plugin-sdk`)**: Build hooks and adapters for Vite, Next.js, and CI pipelines.
- **REST API**: Stateless HTTP conversion endpoints for serverless environments.

## Developer Surfaces

| Surface | Package | Installation | Execution |
|---|---|---|---|
| CLI | `@zapwebp/cli` | `npm i -g zapwebp` | Local filesystem |
| MCP Server | `@zapwebp/mcp` | `npx -y @zapwebp/mcp` | Stdio / Streamable HTTP |
| VS Code | `zapwebp-vscode` | VS Code Marketplace | Local IDE extension host |
| REST API | `@zapwebp/api` | `https://zapwebp.vercel.app/api/v1` | Hosted serverless |
| SDK | `@zapwebp/sdk` | `npm i @zapwebp/sdk` | Dual local/remote client |

## Examples

### Converting in Vite Build

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { zapwebp } from '@zapwebp/plugin-sdk/vite';

export default defineConfig({
  plugins: [zapwebp({ formats: ['webp', 'avif'], quality: 85 })],
});
```

### TypeScript SDK Client

```typescript
import { ZapClient } from '@zapwebp/sdk';

const zap = new ZapClient({ offline: true });
const output = await zap.convert('src/logo.svg', { to: 'webp', scale: [1, 2] });
console.log(`Saved ${output.bytesSaved} bytes!`);
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `dev_missing_runtime` | Node.js version is below requirement | Install Node.js >= 22.0.0 |
| `dev_outside_root` | Attempted file read or write escaped project sandbox | Keep file paths inside project directory |

## For agents

```json
{
  "ecosystem": "zapwebp-developer-platform",
  "tools": ["cli", "mcp", "vscode", "api", "sdk"],
  "cliCommands": ["zapwebp", "zap"],
  "mcpServer": "@zapwebp/mcp",
  "repo": "https://github.com/Zapwebp"
}
```

## Related

- [CLI](/cli): Terminal command reference and flags.
- [MCP](/mcp): Model Context Protocol tools and schemas.
- [Vite Plugin](/plugins/vite): Vite integration guide.

