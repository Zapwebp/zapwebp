# Plugin Scaffolding

Covers: Scaffolding agent-native Zapwebp plugins, storage adapters, transforms, and metadata handlers using `create-zapwebp`, structured AGENTS.md and SKILLS.md context files, and TypeScript build harnesses.
Does not cover: Low-level engine internals (see [Core SDK](/sdk/core.md)), runtime sandbox policy enforcement (see [Plugin SDK](/sdk/plugin.md)), or format compatibility tables (see [Formats](/formats.md)).
Applies to: `create-zapwebp`, `@zapwebp/plugin-sdk`, Antigravity, Cursor, and developer AI agent environments.

## Quick start

```bash
# Interactive setup
pnpm create zapwebp

# Or non-interactive CLI
pnpm create zapwebp my-zapwebp-plugin --type format --author "Jane Doe" --github janedoe --pm pnpm
```

Generated directory layout:

```
my-zapwebp-plugin/
├── src/
│   ├── index.ts          # Empty, typed plugin stub
│   └── types.ts          # Convenience type re-exports
├── test/
│   ├── fixtures/         # Sample test image assets
│   └── index.test.ts     # Baseline passing test harness
├── AGENTS.md             # Project context contract for AI coding agents
├── SKILLS.md             # Agent skills definition for Antigravity & Cursor
├── agent.json            # Machine-readable discovery manifest
├── .zapwebp-scaffold.json# Metadata tracking archetype & template version
├── package.json          # Pre-configured build & test scripts
└── tsconfig.json         # Strict TypeScript configuration
```

## What it does

### Context Over Boilerplate

Conventional scaffolding CLI tools generate extensive, opinionated code that developers must delete before beginning work. `create-zapwebp` adopts an **agent-native starter** model:

1. **Working Skeleton Without Opinions**: Generates strict TypeScript, dual ESM/CJS packaging (`tsup`), test runner (`vitest`), and GitHub Actions CI without hardcoded conversion assumptions.
2. **First-Run Intent Definition**: Prompts the developer and their AI assistant to define their architectural boundaries in `AGENTS.md` and `SKILLS.md` before writing executable code.
3. **Preserved Project Memory**: Documents key decisions, who the plugin is for, what it deliberately excludes, and edge cases so future contributors and agents have full context.

### Available Archetypes

| Archetype | CLI Flag | Target Interface | Use Case |
|---|---|---|---|
| Format | `--type format` | `FormatHandler` | Decode & encode novel image formats (e.g. HEIC, JXL, WebP, SVG). |
| Storage | `--type storage` | `StorageAdapter` | Upload converted assets to object storage (e.g. Cloudflare R2, AWS S3). |
| Transform | `--type transform` | `TransformStep` | In-memory raw RGBA pixel manipulation (crop, watermark, filter). |
| Metadata | `--type metadata` | `MetadataHandler` | Inspect and strip proprietary container chunks (EXIF, XMP, IPTC). |
| Build Tool | `--type build` | `ZapPlugin` | Bundler integration for Vite, Next.js, Webpack, or Rollup. |
| Custom | `--type custom` | `ZapPlugin` | Start from scratch with standard conversion lifecycle hooks. |

### The Three Critical Agent Files

#### 1. `AGENTS.md` (Project Context Contract)
Read by AI coding agents first. It structures what the plugin does, target audience, non-goals, key architectural decisions, and edge cases.

#### 2. `SKILLS.md` (Agent Capability Definition)
Defines how autonomous agents invoke and debug the plugin, providing usage snippets, error descriptions, and standard agent workflows.

#### 3. `agent.json` (Machine-Readable Manifest)
Provides standardized capability metadata and documentation URLs for automated plugin discovery.

### Automated Upgrades with `.zapwebp-scaffold.json`

Every scaffolded project includes a `.zapwebp-scaffold.json` metadata file recording the archetype, template version, and generation timestamp. This enables non-destructive future migrations of build configs, CI actions, and lint rules without modifying user implementation code.

## Errors

| Error Code | Cause | Fix |
|---|---|---|
| `E_INVALID_CONFIG` | Scaffolder was invoked with an unsupported archetype or empty project name. | Specify a valid archetype: `format`, `storage`, `transform`, `metadata`, `build`, or `custom`. |
| `E_PLUGIN_SANDBOX_VIOLATION` | Scaffolded plugin attempted unauthorized filesystem access or unconsented network calls. | Ensure format and transform plugins execute strictly in-memory; declare network permissions in `package.json` for storage adapters. |

## For agents

```json
{
  "tool": "create-zapwebp",
  "philosophy": "Generate context before code. Fill in AGENTS.md and SKILLS.md prior to writing implementation.",
  "archetypes": [
    { "name": "format", "interface": "FormatHandler", "permissions": [] },
    { "name": "storage", "interface": "StorageAdapter", "permissions": ["network"] },
    { "name": "transform", "interface": "TransformStep", "permissions": [] },
    { "name": "metadata", "interface": "MetadataHandler", "permissions": [] },
    { "name": "build", "interface": "ZapPlugin", "permissions": [] },
    { "name": "custom", "interface": "ZapPlugin", "permissions": [] }
  ],
  "agentWorkflow": [
    "1. Read AGENTS.md to understand project goals and constraints.",
    "2. Read SKILLS.md to understand the exposed plugin capabilities.",
    "3. Read src/index.ts to review the exported interface stub.",
    "4. Update AGENTS.md and SKILLS.md with specific project choices.",
    "5. Implement functionality in src/index.ts.",
    "6. Add unit tests in test/index.test.ts.",
    "7. Verify test suite passes with pnpm test."
  ]
}
```

## Related

- [Plugin SDK & Sandboxing](/sdk/plugin.md)
- [Core SDK Reference](/sdk/core.md)
- [Format Compatibility Matrix](/formats.md)
- [Developer Contributing Guide](/contributing.md)
- [Error Dictionary](/errors.md)
