# Safety

Covers: security policies, SVG parser defenses, XXE mitigation, path traversal prevention, memory caps, alpha preservation guarantees, and shell command auditing.

Does not cover: CLI installation or batch glob syntax. See [CLI](/cli).

Applies to: `zap` and `zapwebp` v1.1.0 and later.

## Quick start

```bash
zap untrusted.svg --to webp
zap audit "magick logo.svg logo.webp"
```

Validates SVG content before rendering and lints agent conversion commands for accidental alpha-loss pitfalls.

## What it does

Zap enforces defensive boundaries across memory, file systems, rendering engines, and agent command generation:

1. **Parser Sandboxing**: Rejects active JavaScript, external entity expansions (Billion Laughs / XXE), and remote network fetches.
2. **Path Confinement**: Ensures every input and destination path strictly resides within the approved project root.
3. **Resource Capping**: Limits canvas dimensions to 4096 × 4096 px and 16,777,216 pixels to neutralize decompression bombs.
4. **Alpha Safety Guarantee**: Refuses silent alpha collapse. If a transparent asset is targeted for an opaque format like JPEG, Zap halts with code 1 unless an explicit background color is passed (`--background <color>`).
5. **Agent Command Auditing**: Lints shell commands proposed by AI agents (`convert`, `magick`, `cwebp`, `ffmpeg`) and catches uninitialized solid black canvas defaults.

## Security boundaries

| Risk vector | Protection mechanism | Behavior |
|---|---|---|
| Active script execution | Regular expression & AST inspection | Rejects `<script>`, `<foreignObject>`, inline `on*` |
| XML external entity (XXE) | Disallowed `<!ENTITY>` and `<!DOCTYPE>` | Halts immediately before XML parse |
| External asset exfiltration | Scans `href`, `src`, `@import`, `url()` | Forbids remote URLs; data URIs allowed |
| Path traversal (LFI/RFI) | `fs.realpath` & confinement check | Prevents reading/writing outside workspace root |
| Pixel flood / DoS bombs | Hard dimension cap (4096 × 4096 px) | Rejects extreme aspect ratios and oversized rasters |
| Silent Alpha Loss | Pre-conversion transparency probe | Blocks transparent-to-JPEG conversion without `--background` |
| ImageMagick Black Canvas Bug | Agent command auditing (`auditConversionCommand`) | Flags missing `-background none` in proposed commands |

## Examples

### Rejecting script injection in SVG

```bash
$ zap evil.svg --to webp
zap: This SVG contains active content and cannot be converted.
```

### Blocking silent transparency loss on JPEG target

```bash
$ zap transparent-logo.png --to jpeg
zap: JPEG cannot store transparency. Provide an explicit --background color (e.g. --background "#ffffff") to flatten alpha.
```

### Auditing an AI agent's proposed command

```bash
$ zap audit "magick logo.svg logo.webp"

Command: magick logo.svg logo.webp
Safe: NO
Issues detected:
  - ImageMagick defaults to compositing SVG onto a solid black or opaque canvas unless -background none is passed.
  - Command does not strip container metadata (EXIF/XMP/C2PA/software provenance).
Recommended Zap command:
  zap "logo.svg" --to webp --clean
```

### Diagnosing black background root causes

```bash
$ zap explain-black-bg

Root Cause: Single-step rasterization without explicit transparent canvas initialization or alpha quality retention.

Technical details:
  - ImageMagick and Cairo default uninitialized raster canvases to solid black (RGB 0, 0, 0) instead of transparent RGBA (0, 0, 0, 0).
  - Many WebP encoders drop alpha or set alpha compression quality to 0 in lossy mode unless explicitly given alpha_q: 100.
  - JPEG targets lack an alpha channel entirely, collapsing all transparent pixels into black boxes.

Remedy:
  Use a two-stage pipeline: (1) render SVG over explicit transparent canvas (resvg), then (2) encode to WebP with alpha retention (cwebp -alpha_q 100).

Zap Solution:
  zap <file.svg> --to webp (or convert_image MCP tool). Zap always defaults background to "transparent" and enforces alpha preservation by construction.
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `active_content_rejected` | SVG contains JavaScript or executable tags | Sanitize SVG to contain static vector geometry only |
| `doctype_rejected` | Custom DOCTYPE or ENTITY definitions found | Remove DOCTYPE header from SVG file |
| `external_reference_blocked` | SVG references external stylesheet or image | Embed raster assets and fonts inline as base64 |
| `jpeg_transparency_loss` | Attempted to convert transparent image to JPEG | Pass `--background <color>` (e.g. `#ffffff`) or choose WebP/PNG/AVIF |
| `path_outside_root` | Target file resolves outside workspace boundary | Confine all file paths inside project directory |

## For agents

```json
{
  "safetyPolicy": {
    "allowScripts": false,
    "allowDtd": false,
    "allowEntityExpansion": false,
    "allowRemoteRefs": false,
    "allowOutsideRootWrites": false,
    "maxPixels": 16777216,
    "preventBlackBackground": true,
    "auditToolAvailable": true
  }
}
```

## Related

- [Clean](/clean): Zero-tracking sanitization and Clean Certificates.
- [Formats](/formats): Allowed raster and vector standards.
- [Errors](/errors): Complete error dictionary.
