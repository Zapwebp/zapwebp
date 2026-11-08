# Clean

Covers: zero-trust metadata stripping, pag-alis ng EXIF, GPS coordinates, serial numbers ng camera, at pagpapatunay gamit ang Clean Certificate.

Does not cover: pag-resize ng dimensyon o kulay ng likuran. Tingnan ang [CLI](/cli) at [Backgrounds](/backgrounds).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp photo.jpg --clean --verify-clean
```

Tinatanggal ang lahat ng metadata at naglalabas ng kumpirmasyon ng kalinisan ng file.

## What it does

Ang Clean mode ay nagpapatupad ng zero-trust metadata sanitization. Tinatanggal nito ang EXIF, XMP, IPTC, C2PA AI provenance manifests, GPS location tags, at mga custom private chunks sa mga container ng imahe upang protektahan ang privacy ng gumagamit.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CLEAN_FAILED` | May natirang metadata pagkatapos ng stripping | Suriin ang file gamit ang `zap inspect` |
| `E_CORRUPT_CONTAINER` | Naging unreadable ang container pagkatapos tanggalin ang chunks | Subukan ang ibang encoder o i-update ang plugin |

## For agents

```json
{
  "feature": "clean",
  "default": true,
  "strippedChunks": ["exif", "xmp", "iptc", "c2pa", "gps"],
  "verification": "--verify-clean"
}
```

## Related

- [Safety](/safety): Mga patakaran sa kaligtasan ng data at pag-iwas sa pagkawala ng aninag.
- [Privacy Policy](/privacy): Ang aming pangako sa zero telemetry at zero storage.
