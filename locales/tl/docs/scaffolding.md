# Plugin Scaffolding

Covers: Pag-scaffold ng mga agent-native na Zapwebp plugin, storage adapter, transform, at metadata handler gamit ang `create-zapwebp`, structured na AGENTS.md at SKILLS.md context files, at TypeScript build harness.
Does not cover: Low-level engine internals (tingnan ang [Core SDK](/sdk/core.md)), pagpapatupad ng sandbox security policies (tingnan ang [Plugin SDK](/sdk/plugin.md)), o format compatibility matrix (tingnan ang [Formats](/formats.md)).
Applies to: `create-zapwebp`, `@zapwebp/plugin-sdk`, Antigravity, Cursor, at mga AI agent development environment.

## Quick start

```bash
# Interaktibong pag-setup
pnpm create zapwebp

# O direktang CLI na may mga flag
pnpm create zapwebp my-zapwebp-plugin --type format --author "Jane Doe" --github janedoe --pm pnpm
```

Lalamanin ng na-generate na proyekto:

```
my-zapwebp-plugin/
├── src/
│   ├── index.ts          # Malinis at may type na plugin stub
│   └── types.ts          # Muling na-export na mga type
├── test/
│   ├── fixtures/         # Lalagyan ng sample test assets
│   └── index.test.ts     # Unang pumapasang test harness
├── AGENTS.md             # Kontrata ng konteksto para sa AI coding agents
├── SKILLS.md             # Kahulugan ng kasanayan para sa Antigravity at Cursor
├── agent.json            # Machine-readable discovery manifest
├── .zapwebp-scaffold.json# Metadata para sa archetype at template version
├── package.json          # Naka-configure na build at test scripts
└── tsconfig.json         # Strict TypeScript configuration
```

## What it does

### Konteksto Bago ang Boilerplate

Kadalasan, ang mga lumang CLI scaffolder ay lumilikha ng napakaraming paunang code na kailangan munang burahin ng developer. Ang `create-zapwebp` ay gumagamit ng **agent-native starter** na disenyo:

1. **Gumaganang Balangkas Nang Walang Kuro-kuro**: Naghahanda ng strict TypeScript, dual ESM/CJS packaging (`tsup`), test runner (`vitest`), at GitHub Actions CI nang walang haka-haka sa conversion logic.
2. **Pagtatakda ng Layunin sa Unang Araw**: Hinihikayat ang developer at ang kanilang AI assistant na itakda ang mga hangganan at desisyon sa `AGENTS.md` at `SKILLS.md` bago sumulat ng executable code.
3. **Pagpapanatili ng Alaala ng Proyekto**: Itinatala ang mahahalagang desisyon, para kanino ang plugin, ano ang sadyang hindi kasama, at mga edge cases upang hindi mawala ang konteksto sa hinaharap.

### Mga Magagamit na Archetype

| Archetype | CLI Flag | Target Interface | Gamit |
|---|---|---|---|
| Format | `--type format` | `FormatHandler` | Pag-decode at pag-encode ng mga bagong format ng imahe (hal. HEIC, JXL, WebP, SVG). |
| Storage | `--type storage` | `StorageAdapter` | Pag-upload ng mga na-convert na imahe sa cloud storage (hal. Cloudflare R2, AWS S3). |
| Transform | `--type transform` | `TransformStep` | Pagbabago ng raw RGBA pixel buffers sa memory (crop, watermark, filter). |
| Metadata | `--type metadata` | `MetadataHandler` | Pagsusuri at pag-alis ng proprietary container metadata chunks (EXIF, XMP). |
| Build Tool | `--type build` | `ZapPlugin` | Integrasyon sa mga bundler tulad ng Vite, Next.js, Webpack, o Rollup. |
| Custom | `--type custom` | `ZapPlugin` | Magsimula mula sa simula gamit ang standard conversion lifecycle hooks. |

## Errors

| Error Code | Sanhi | Lunas |
|---|---|---|
| `E_INVALID_CONFIG` | Tinawag ang scaffolder gamit ang hindi suportadong archetype o walang pangalan ng proyekto. | Tukuyin ang wastong archetype: `format`, `storage`, `transform`, `metadata`, `build`, o `custom`. |
| `E_PLUGIN_SANDBOX_VIOLATION` | Sinubukan ng na-scaffold na plugin na mag-access sa file system o network nang walang pahintulot. | Panatilihing memory-only ang format/transform plugins; ideklara ang network permissions sa `package.json` para sa storage adapters. |

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
    "1. Basahin ang AGENTS.md upang maunawaan ang mga layunin at hangganan.",
    "2. Basahin ang SKILLS.md upang malaman ang mga kakayahan ng plugin.",
    "3. Basahin ang src/index.ts upang suriin ang interface stub.",
    "4. I-update ang AGENTS.md at SKILLS.md bago magsimulang mag-code.",
    "5. Ipatupad ang lohika sa src/index.ts.",
    "6. Magdagdag ng unit tests sa test/index.test.ts.",
    "7. Patunayan gamit ang pnpm test bago i-commit."
  ]
}
```

## Related

- [Plugin SDK at Sandboxing](/sdk/plugin.md)
- [Core SDK Reference](/sdk/core.md)
- [Matrix ng mga Format](/formats.md)
- [Gabay sa Pagaambag ng Developer](/contributing.md)
- [Talaan ng mga Error](/errors.md)
