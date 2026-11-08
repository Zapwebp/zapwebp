# CLI

Covers: Zapwebp command-line interface, mga opsyon sa bandang terminal, batch conversions, responsive multipliers, undo/redo transactions, at pagsasama sa CI pipelines.

Does not cover: pagpapatakbo ng MCP server o direct web API endpoints. Tingnan ang [MCP](/mcp) at [REST API](/api).

Applies to: Zapwebp CLI v1.1.0 at mas bago.

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
    "--scale": "Comma-separated multipliers",
    "--clean": "Strip metadata and AI provenance",
    "--check": "CI validation mode"
  }
}
```

## Related

- [Clean](/clean): Pag-alis ng EXIF at metadata sa pamamagitan ng CLI.
- [Target Lock](/lock-target): Pagtatakda ng mahigpit na format ng output.
