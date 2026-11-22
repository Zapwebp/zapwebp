# CLI

Covers: installing `zap` and `zapwebp`, running conversions from the terminal, undo/redo reversible journals, git-aware inputs, multipliers, ZIP bundles, srcset HTML generation, subcommands, and exit codes.

Does not cover: web app, MCP server. See [MCP](/mcp).

Applies to: `zap` and `zapwebp` v1.1.0 and later.

<Callout className="mb-6 border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900">

**Zero-Telemetry & Reversible:** The Zapwebp CLI executes 100% locally in memory with zero tracking beacons and journals every modification to `.zapwebp/journal/` for instant one-command rollbacks (`zap undo`).

</Callout>

Choose your preferred execution method:

<div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
  <LinkedCard href="#quick-start" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Run via npx</div>
    <div className="leading-relaxed text-muted-foreground">
      Execute on demand without a global installation: `npx zapwebp`.
    </div>
  </LinkedCard>
  <LinkedCard href="#subcommand-reference" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Subcommands</div>
    <div className="leading-relaxed text-muted-foreground">
      Explore `init`, `undo`, `redo`, `inspect`, `clean`, and `doctor`.
    </div>
  </LinkedCard>
  <LinkedCard href="#options" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Options Reference</div>
    <div className="leading-relaxed text-muted-foreground">
      Complete reference for multipliers, quality, and output targets.
    </div>
  </LinkedCard>
</div>

## Quick start

```bash
npx zapwebp ./icons --to webp --scale 1,2,3 --zip
```

Converts every supported image in `icons/` to WebP at 1x, 2x, and 3x scale multipliers and bundles them into a single ZIP archive.

## What it does

Reads SVG and raster image files, converts each to the requested format, preserves transparency, strips metadata, and writes output beside the source, to a destination folder, or inside a ZIP bundle. Every run creates an undoable journal in `.zapwebp/journal/` that can be rolled back with `zap undo`. Runs locally on your machine with zero remote network calls and zero telemetry.

## Commands

| Command | Usage | Description |
|---|---|---|
| `init` | `zap init [--hook]` | Set up config, ignore rules, and `.gitignore` block |
| `undo` | `zap undo [id]` | Revert the last run (or specific transaction) |
| `redo` | `zap redo [id]` | Reapply the last undone transaction |
| `history` | `zap history [--json]` | List past conversion transactions |
| `show` | `zap show <id>` | Inspect operations and checksums of a transaction |
| `gc` | `zap gc` | Garbage-collect old journals and backups |
| `explain` | `zap explain <file>` | Explain why a file will or will not convert |
| `ignored` | `zap ignored [dir]` | List files skipped by ignore rules with rule origins |
| `doctor` | `zap doctor` | Check environment, Node version, and filesystem permissions |
| `gitignore` | `zap gitignore <show\|add\|remove>` | Manage `.gitignore` marker block |
| `config` | `zap config show` | Display resolved configuration and origins |
| `inspect` | `zap inspect <image>` | Analyze image container and metadata chunks |
| `audit` | `zap audit <command>` | Lint shell conversion commands for transparency pitfalls |
| `explain-black-bg` | `zap explain-black-bg` | Explain ImageMagick black background bugs |

## Subcommand Reference

### init

Initialize a Zapwebp project with `.zapwebpignore`, configuration files, and git hooks.

```bash
npx zap init [options]
```

| Option | Description | Default |
|---|---|---|
| `-y, --yes` | Skip prompts and accept default settings | `false` |
| `--hook` | Install Git pre-commit hook to auto-convert staged assets | `false` |
| `-c, --cwd <dir>` | Project working directory | Current working directory |

### undo

Revert the last batch conversion or a specific journal transaction ID.

```bash
npx zap undo [id] [options]
```

| Option | Description | Default |
|---|---|---|
| `--force-undo` | Force rollback even if destination files were modified externally | `false` |
| `--json` | Return JSON transaction summary of restored files | `false` |

### redo

Reapply a previously undone transaction.

```bash
npx zap redo [id]
```

### inspect

Deep container and chunk analyzer for image assets (provided by `zapwebp-lens`).

```bash
npx zap inspect <file> [options]
```

| Option | Description | Default |
|---|---|---|
| `--json` | Output machine-readable JSON structure | `false` |
| `--chunks` | Inspect raw container binary chunks (RIFF, PNG, EXIF) | `true` |

## Options

| Flag | Type | Default | What it does |
|---|---|---|---|
| `-o, --output` | `string` | (source dir) | Destination output file path (single file or .zip archive) |
| `--out-dir` | `string` | (source dir) | Destination directory for batch operations |
| `--to` | `string` | `webp` | Target format: `webp`, `png`, `jpeg`, `avif` |
| `--scale` | `string` | `1` | Multiplier scales, comma-separated (e.g. `1,2,3`) |
| `--base-width` | `integer` | `512` | Base pixel width for scale 1x when `--scale` is passed |
| `--width` | `integer` | (intrinsic) | Output width bound in pixels (max 4096) |
| `--quality` | `integer` | `85` | Compression quality factor from 0 to 100 |
| `--lossless` | `boolean` | `false` | Lossless compression where supported |
| `--background` | `string` | None | Background hex color to flatten transparency |
| `--clean` | `boolean` | `true` | Strip AI provenance, C2PA, EXIF, and XMP metadata |
| `--verify-clean` | `boolean` | `false` | Enforce 0 metadata chunks and assert Clean Certificate |
| `--zip` | `boolean` | `false` | Bundle converted assets and manifest.json into a ZIP archive |
| `--srcset` | `boolean` | `false` | Print responsive `<img srcset>` HTML tags to stdout |
| `--changed` | `boolean` | `false` | Only convert files modified vs HEAD in git |
| `--staged` | `boolean` | `false` | Only convert files in git staging area |
| `--include-ignored` | `boolean` | `false` | Bypass `.zapwebpignore` and config ignores |
| `--include-all` | `boolean` | `false` | Bypass all ignore layers including built-ins |
| `--force-undo` | `boolean` | `false` | Force undo even if outputs were modified |
| `--commit-outputs` | `boolean` | `false` | Do not add output directory to `.gitignore` |
| `--watch` | `boolean` | `false` | Reconvert matching files when changes occur |
| `--check` | `boolean` | `false` | Exit code 1 if outputs are missing or stale |
| `--dry-run` | `boolean` | `false` | Print planned conversions without writing |
| `--json` | `boolean` | `false` | Output machine-readable JSON |

## Examples

### Convert with multipliers and print srcset HTML

```bash
$ zap logo.svg --scale 1,2,3 --base-width 512 --srcset
<img src="logo.webp" srcset="logo.webp 1x, logo@2x.webp 2x, logo@3x.webp 3x" alt="">
```

### Batch convert icons into a ZIP bundle

```bash
$ zap ./assets/**/*.svg --scale 1,2 --out-dir dist --zip
✓ Created archive dist/zap-export.zip (48120 bytes; 24 files)
```

### Stdin conversion pipeline

```bash
$ cat logo.svg | npx zapwebp - --to webp -o out.webp
✓ - → out.webp (2418 bytes)
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `unsafe_svg` | SVG contains scripts or external refs | Remove script tags or external links |
| `alpha_not_representable` | JPEG target with transparent input | Add `--background "#ffffff"` or target WebP |
| `input_not_found` | Input file path or glob matched nothing | Verify the input file path exists |
| `overwrite_conflict` | Destination would overwrite source file | Specify `--out-dir` or a different target |

## For agents

```json
{
  "tool": "zap-cli",
  "command": "zap",
  "args": {
    "input": { "type": "string", "required": true, "description": "File path, glob, or -" },
    "to": { "type": "string", "default": "webp", "enum": ["webp", "png", "jpeg", "avif"] },
    "outDir": { "type": "string", "description": "Output directory" },
    "scale": { "type": "string", "description": "Multiplier scales, e.g. 1,2,3" },
    "baseWidth": { "type": "integer", "default": 512 },
    "zip": { "type": "boolean", "default": false },
    "srcset": { "type": "boolean", "default": false },
    "quality": { "type": "integer", "min": 0, "max": 100, "default": 85 },
    "clean": { "type": "boolean", "default": true }
  },
  "exitCodes": {
    "0": "all conversions succeeded",
    "1": "one or more conversions failed or outputs are stale"
  }
}
```

## Related

- [MCP](/mcp): Use Zapwebp from an AI agent or language model.
- [Errors](/errors): Comprehensive table of every error code.
