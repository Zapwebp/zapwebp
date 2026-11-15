# `create-zapwebp`

Scaffold agent-native Zapwebp plugins, storage adapters, custom transforms, and metadata handlers in seconds.

The new scaffolder generates **context, not boilerplate**. It provides a working project skeleton, empty-but-structured `AGENTS.md` and `SKILLS.md` files, and a first-run prompt that tells your AI coding agent (Antigravity, Cursor, Claude) to define your project intent before writing code.

## Quick Start

```bash
pnpm create zapwebp
# or
npm create zapwebp@latest
```

Or scaffold non-interactively:

```bash
pnpm create zapwebp my-zapwebp-plugin --type format --author "Jane Doe" --github janedoe --pm pnpm
```

## Available Archetype Templates

| Archetype | Flag | Description |
|---|---|---|
| `format` | `--type format` | Input/output format decoder & encoder (`FormatHandler`) with sniffer and alpha safety. |
| `storage` | `--type storage` | Cloud storage adapter (`StorageAdapter`) with pre-upload conversion and cascade deletion. |
| `transform` | `--type transform` | In-memory raw RGBA pixel transformer (`TransformStep`) for cropping, filtering, and effects. |
| `metadata` | `--type metadata` | Custom metadata inspector and stripper (`MetadataHandler`) with chunk manipulation. |
| `build` | `--type build` | Build tool integration plugin (`ZapPlugin`) for Vite, Next.js, Webpack, or Rollup. |
| `custom` | `--type custom` | General lifecycle plugin (`ZapPlugin`) starting from scratch. |

## Generated Project Structure

```
my-zapwebp-plugin/
├── .github/
│   ├── workflows/
│   │   ├── test.yml              # CI test runner
│   │   └── release.yml           # Automated npm publish on release tag
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── src/
│   ├── index.ts                  # Typed plugin implementation stub
│   └── types.ts                  # Re-exported types from @zapwebp/plugin-sdk
├── test/
│   ├── fixtures/                 # Sample asset fixtures directory
│   └── index.test.ts             # Initial passing test proving harness works
├── AGENTS.md                     # Structured context contract for AI coding agents
├── SKILLS.md                     # Agent skill definition (Antigravity, Cursor, Claude)
├── agent.json                    # Machine-readable discovery manifest
├── .zapwebp-scaffold.json        # Template and version metadata for automated upgrades
├── README.md                     # Installation, usage, and security docs
├── CHANGELOG.md                  # Keep a Changelog format
├── CONTRIBUTING.md               # Open source contribution guide
├── CODE_OF_CONDUCT.md            # Contributor Code of Conduct
├── LICENSE                       # MIT License
├── tsconfig.json                 # Strict TypeScript configuration
├── tsup.config.ts                # Dual ESM/CJS bundler configuration
└── vitest.config.ts              # Unit test configuration
```

## The First-Run Workflow

1. Scaffold your project with `pnpm create zapwebp`.
2. Open the directory in your IDE or AI assistant.
3. Review `AGENTS.md` and `SKILLS.md`.
4. Prompt your AI assistant: *"Read AGENTS.md and SKILLS.md. Help me fill them in for my plugin, then write the implementation."*
5. Run `pnpm test` and `pnpm run build`.

## License

MIT © Zapwebp
