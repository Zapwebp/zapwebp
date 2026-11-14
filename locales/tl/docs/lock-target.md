# Target Lock (Many-to-One Conversion)

Covers: many-to-one ingestion architecture kung saan isang canonical target format lamang ang pinapayagan, strict vs best-effort mode, at edge gateway pipelines.

Does not cover: multi-format export bundling. Tingnan ang [CLI](/cli).

Applies to: Zapwebp v2.0.0 at mas bago.

## Quick start

```bash
npx zapwebp "uploads/*" --lock-target webp --strict
```

Ipinapatupad na ang lahat ng mga papasok na asset ay maging WebP; mag-e-error kapag may file na hindi ma-convert.

## What it does

Ginagawang 4-stage smart ingestion gateway ng Target Lock ang Zapwebp:

```
Input Asset → [Stage 1: Detect] → [Stage 2: Desisyon sa Lock] → [Stage 3: Sukat ng Byte] → [Stage 4: Compression] → Canonical Output
```

1. **Stage 1 (Detect)**: Tinutukoy ang format gamit ang magic byte sniffing nang hindi umaasa sa file extension ng user.
2. **Stage 2 (Desisyon sa Lock)**:
   - `sameFormat: "passthrough"` (default): Kapag ang input ay pareho na sa target format, lumalampas ito sa decode/encode pass upang walang mawala sa kalidad (0% generational loss) at matapos sa loob ng sub-millisecond.
   - `sameFormat: "reencode"`: Muling dine-decode at kino-compress ayon sa setting ng kalidad.
   - `sameFormat: "reject"`: Mahigpit na tinatanggihan ang input kapag pareho na sa target format (`E_SAME_FORMAT_REJECTED`).
3. **Stage 3 (Sukat ng Byte)**: Sinusuri ang `minInputBytes` at `maxInputBytes` bago mag-allocate ng memory sa decode (`E_INPUT_TOO_SMALL`, `E_INPUT_TOO_LARGE`).
4. **Stage 4 (Binary Search Compression)**:
   - `sizeMode: "compress"` (default): Kapag may `maxOutputBytes`, awtomatikong gumagamit ng binary search sa loob ng $\le 5$ hakbang upang magkasya sa byte budget.
   - `sizeMode: "strict"`: Agad na tatanggihan kung ang output ay lalampas sa `maxOutputBytes` (`E_OUTPUT_TOO_LARGE`) o bababa sa `minOutputBytes` (`E_OUTPUT_TOO_SMALL`).
   - `sizeMode: "flexible"`: Naglalabas lamang ng babala nang hindi ibinabagsak ang proseso o binabawasan ang kalidad.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TARGET_LOCKED` | Tinangkang mag-request ng ibang format habang naka-lock ang target | Alisin ang kahilingan ng ibang format o gamitin ang `--override-lock` |
| `E_UNSUPPORTED_FORMAT` | Hindi ma-decode ang input file sa mahigpit na Target Lock mode | Mag-upload ng suportadong format ng imahe |
| `E_INPUT_TOO_SMALL` | Mas maliit ang input kaysa sa itinakdang `minInputBytes` | Magbigay ng wastong file na pasok sa itinakdang sukat |
| `E_INPUT_TOO_LARGE` | Lumampas ang input sa `maxInputBytes` bago ang pag-decode | I-downscale o i-compress ang orihinal bago i-upload |
| `E_OUTPUT_TOO_LARGE` | Hindi nagkasya ang output sa `maxOutputBytes` sa ilalim ng `strict` mode | Taasan ang `maxOutputBytes` o lumipat sa `compress` mode |
| `E_OUTPUT_TOO_SMALL` | Mas maliit ang output sa `minOutputBytes` | Tiyakin na ang imahe ay may laman at hindi blangkong placeholder |
| `E_SAME_FORMAT_REJECTED` | Ang input ay nasa target format na habang naka-set ang `sameFormat: "reject"` | Pahintulutan ang passthrough o mag-upload ng ibang format |

## For agents

```json
{
  "contract": "target-lock",
  "pipeline": "detect -> lock-decision -> size-bounds -> binary-search-compression",
  "modes": ["strict", "compress", "flexible"],
  "targetFormat": "webp",
  "sameFormat": ["passthrough", "reencode", "reject"],
  "overrideFlag": "--override-lock",
  "cliFlags": [
    "--lock-target <format>",
    "--strict",
    "--same-format <passthrough|reencode|reject>",
    "--size-mode <compress|strict|flexible>",
    "--min-input <bytes>",
    "--max-input <bytes>",
    "--min-output <bytes>",
    "--max-output <bytes>"
  ]
}
```

## Related

- [Backgrounds](/backgrounds): Paghawak sa aninag kapag naka-lock sa format na JPEG.
- [Storage Adapters](/plugins/storage): Integrasyon ng Target Lock sa Supabase at Firebase.
