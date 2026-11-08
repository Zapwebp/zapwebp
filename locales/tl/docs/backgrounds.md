# Background Preservation & Flattening

Covers: tatlong deterministikong kalagayan ng background: transparent preservation, opaque respect, at deterministic flattening kapag nagko-convert sa mga format na walang alpha channel.

Does not cover: vector path simplification. Tingnan ang [Safety](/safety).

Applies to: Zapwebp v2.0.0 at mas bago.

## Quick start

```bash
npx zapwebp transparent-logo.png --to jpeg --background "#ffffff"
```

Patagin ang transparent na PNG patungong JPEG na may puting kulay ng likuran upang maiwasan ang itim na background.

## What it does

Ang ImageMagick at iba pang karaniwang converter ay kilalang may depekto kung saan ang aninag ay nagiging itim na mga parihaba (black background bug). Tinitiyak ng Zapwebp na ang aninag ay laging napananatili kapag suportado ng target format, at mahigpit na humihingi ng kulay ng background kapag nagko-convert sa mga format na walang aninag tulad ng JPEG.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_ALPHA_NOT_REPRESENTABLE` | Pag-convert ng may aninag na imahe sa JPEG nang walang background color | Magbigay ng kulay tulad ng `--background "#ffffff"` o pumili ng WebP/PNG |

## For agents

```json
{
  "backgroundStates": {
    "transparent": "preserved in WebP, PNG, AVIF",
    "opaque": "preserved untouched",
    "flattened": "requires explicit background hex color"
  }
}
```

## Related

- [Formats](/formats): Matrix ng transparency support sa bawat format.
- [Safety](/safety): Mga proteksyon laban sa pagkawala ng alpha channel.
