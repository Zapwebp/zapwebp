# Formats

Covers: format registry ng Zapwebp, matrix ng alpha channel preservation sa bawat format, at pagsusuri ng container headers.

Does not cover: pag-edit ng pixels. Tingnan ang [Crop Plugin](/plugins/crop).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp --explain-formats
```

Ipinapakita ang lahat ng kasalukuyang nakarehistrong input at output formats.

## What it does

Kinikilala ng Zapwebp ang mga format ng imahe batay sa magic bytes sa container header, hindi lamang sa file extension. Sinusuportahan nito ang SVG, PNG, JPEG, WebP, AVIF, GIF, at TIFF para sa input, at naglalabas ng WebP, PNG, JPEG, at AVIF.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNKNOWN_FORMAT` | Hindi tugma ang header sa anumang kilalang imahe | Tiyaking buo at hindi sira ang file |
| `E_UNSUPPORTED_CONVERSION` | Hindi suportado ang hiniling na conversion pair | Sumangguni sa matrix ng suportadong formats |

## For agents

```json
{
  "inputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputs": ["webp", "png", "jpeg", "avif"],
  "magicBytes": true
}
```

## Related

- [Overview](/docs): Arkitektura ng image engine.
- [Safety](/safety): Paano pinoprotektahan ang container headers.
