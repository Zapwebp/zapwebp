# CLI

Covers: Zapwebp command-line interface, mga opsyon sa bandang terminal, batch conversions, responsive multipliers, undo/redo transactions, at pagsasama sa CI pipelines.

Does not cover: pagpapatakbo ng MCP server o direct web API endpoints. Tingnan ang [MCP](/mcp) at [REST API](/api).

Applies to: Zapwebp CLI v1.1.0 at mas bago.

<Callout className="mb-6 border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900">

**Zero-Telemetry at Reversible:** Ang Zapwebp CLI ay tumatakbo nang 100% lokal sa memorya nang walang tracking beacons, at nagtatala ng bawat transaksyon sa `.zapwebp/journal/` para sa agarang rollback gamit ang isang command (`zap undo`).

</Callout>

Piliin ang nais mong paraan ng pagpapatakbo:

<div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
  <LinkedCard href="#quick-start" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Patakbuhin gamit ang npx</div>
    <div className="leading-relaxed text-muted-foreground">
      Gamitin on demand nang walang global installation: `npx zapwebp`.
    </div>
  </LinkedCard>
  <LinkedCard href="#subcommand-reference" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Mga Subcommand</div>
    <div className="leading-relaxed text-muted-foreground">
      Tuklasin ang `init`, `undo`, `redo`, `inspect`, `clean`, at `doctor`.
    </div>
  </LinkedCard>
  <LinkedCard href="#options" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Gabay sa Opsyon</div>
    <div className="leading-relaxed text-muted-foreground">
      Kumpletong gabay para sa multipliers, kalidad, at output targets.
    </div>
  </LinkedCard>
</div>

## Quick start

```bash
npx zapwebp "src/icons/**/*.svg" --to webp --quality 90
```

Kino-convert ang lahat ng katugmang SVG icons sa WebP na may kalidad na 90 habang pinapanatili ang aninag.

## What it does

Ang Zapwebp CLI ay isang command-line runner na nagbibigay-daan sa mga developer na mabilisang i-convert, i-optimize, at i-scale ang mga imahe sa terminal. Sinusuportahan nito ang atomikong pagsusulat, journalized undo/redo transactions, gitignore automation, at CI check modes.

## Commands

| Command | Deskripsyon |
|---|---|
| `zap [paths...]` | Mag-convert ng mga imahe batay sa mga ibinigay na path |
| `zap init` | Ihanda ang configuration, ignore rules, at .gitignore |
| `zap watch` | I-convert ang mga imahe habang may binabago sa directory |
| `zap check` | CI mode: mag-exit 1 kung may mga file na kailangan pang i-convert |
| `zap undo` | Ibalik sa dating anyo ang huling isinagawang conversion |
| `zap redo` | Muling ilapat ang huling na-undo na conversion |
| `zap audit` | Maglabas ng ulat sa kaligtasan at pagsusuri ng imahe nang hindi nagsusulat ng file |
| `zap doctor` | Suriin ang kalagayan ng sistema at mga dependency |

## Subcommand Reference

### init

Ihanda ang proyekto ng Zapwebp gamit ang `.zapwebpignore`, configuration files, at git hooks.

```bash
npx zap init [options]
```

| Opsyon | Deskripsyon | Default |
|---|---|---|
| `-y, --yes` | Laktawan ang mga prompt at tanggapin ang default | `false` |
| `--hook` | Maglagay ng Git pre-commit hook para sa mga staged asset | `false` |
| `-c, --cwd <dir>` | Direktoryo ng proyekto | Kasalukuyang direktoryo |

### undo

Ibalik sa dating anyo ang huling conversion o ang tinukoy na journal transaction ID.

```bash
npx zap undo [id] [options]
```

| Opsyon | Deskripsyon | Default |
|---|---|---|
| `--force-undo` | Pilitin ang rollback kahit binago ang destinasyon | `false` |
| `--json` | Maglabas ng buod sa JSON format | `false` |

### redo

Muling ilapat ang isang naunang na-undo na transaksyon.

```bash
npx zap redo [id]
```

### inspect

Pagsusuri ng container at binary chunks para sa mga imahe (gamit ang `zapwebp-lens`).

```bash
npx zap inspect <file> [options]
```

| Opsyon | Deskripsyon | Default |
|---|---|---|
| `--json` | Maglabas ng JSON structure | `false` |
| `--chunks` | Suriin ang mga chunk tulad ng RIFF, PNG, EXIF | `true` |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | Naglalaman ang SVG ng script o panlabas na entity | Linisin ang SVG o gamitin ang `--allow-unsafe` |
| `E_ALPHA_NOT_REPRESENTABLE` | Pag-convert ng may-aninag na imahe sa JPEG nang walang background | Magpasa ng `--background "#ffffff"` o pumili ng WebP/PNG |
| `E_DISK_FULL` | Walang natitirang espasyo sa storage | Magbawas ng files at subukang muli |

## For agents

```json
{
  "command": "zap",
  "package": "@zapwebp/cli",
  "flags": {
    "--to": "Target formats (webp, png, jpeg, avif)",
    "--quality": "Compression quality 0-100",
    "--scale": "Comma-separated multipliers (e.g. 1,2,3)",
    "--zip": "Package outputs into a zip bundle",
    "--clean": "Strip EXIF, XMP, C2PA metadata"
  }
}
```

## Related

- [Convert](/convert): Direktang conversion sa web browser.
- [MCP](/mcp): Gamitin ang Zapwebp sa pamamagitan ng mga AI coding model.
