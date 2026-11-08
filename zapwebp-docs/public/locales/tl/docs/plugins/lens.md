# Lens CLI

Covers: `zapwebp-lens` read-only inspection tool: visual difference analysis, structural chunk inspection, at alpha channel verification.

Does not cover: pagbabago o pagsusulat sa mga imahe. Tingnan ang [CLI](/cli).

Applies to: `@zapwebp/lens` v1.0.0 at mas bago.

## Quick start

```bash
npx zapwebp-lens inspect image.png
```

Sinusuri ang bawat chunk ng imahe nang hindi binabago ang file.

## What it does

Ang Lens CLI ay isang diagnostic at forensics tool para sa mga imahe. Sinusuri nito ang eksaktong istraktura ng container, nagbibigay ng ulat sa visual difference (PSNR, SSIM), at nagpapatunay kung may natitirang pribadong EXIF o GPS data.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_FILE_NOT_FOUND` | Hindi mahanap ang tinukoy na file | Tiyaking tama ang ibinigay na file path |
| `E_UNRECOGNIZED_FORMAT` | Hindi kilala ang format ng file para sa pagsusuri | Magpasa ng suportadong format ng imahe |

## For agents

```json
{
  "cli": "zapwebp-lens",
  "readOnly": true,
  "metrics": ["psnr", "ssim", "chunk-map", "alpha-integrity"]
}
```

## Related

- [Clean](/clean): Pagtitiyak kung malinis ang file gamit ang Lens.
- [Errors](/errors): Pagsusuri sa mga sirang container headers.
