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

Tinitiyak ng Target Lock na ang lahat ng ibat-ibang uri ng input (SVG, PNG, JPEG, TIFF, GIF) ay mako-convert sa iisang pamantayang format ng storage, tulad ng WebP o AVIF. Sa ilalim ng `strict: true`, ang anumang hindi tugmang format ay ibinabagsak nang mabilis. Sa ilalim ng `strict: false`, ang mga hindi ma-convert na file ay pinapayagang dumaan nang walang pagbabago.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TARGET_LOCKED` | Tinangkang mag-request ng ibang format habang naka-lock ang target | Alisin ang kahilingan ng ibang format o gamitin ang `--override-lock` |
| `E_UNSUPPORTED_FORMAT` | Hindi ma-decode ang input file sa mahigpit na Target Lock mode | Mag-upload ng suportadong format ng imahe |

## For agents

```json
{
  "contract": "target-lock",
  "modes": ["strict", "best-effort"],
  "targetFormat": "webp",
  "overrideFlag": "--override-lock"
}
```

## Related

- [Backgrounds](/backgrounds): Paghawak sa aninag kapag naka-lock sa format na JPEG.
- [Storage Adapters](/plugins/storage): Integrasyon ng Target Lock sa Supabase at Firebase.
