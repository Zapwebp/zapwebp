# Errors

Covers: standardized machine-readable error catalog ng Zapwebp, mga paliwanag sa sanhi ng error, at kaukulang mga hakbang para sa pag-aayos.

Does not cover: third-party compiler errors.

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp doctor
```

Sinusuri ang kapaligiran at mga dependency upang matukoy ang mga posibleng sanhi ng error.

## What it does

Ang bawat error sa Zapwebp ay may natatanging error code (hal. `E_UNSAFE_SVG`, `E_ALPHA_NOT_REPRESENTABLE`) na sinamahan ng malinaw na sanhi at madaling maisagawang solusyon. Ito ay dinisenyo upang mapadali ang debugging ng mga developer at AI agents.

## Errors

| Code | Deskripsyon | Aksyon |
|---|---|---|
| `E_UNSAFE_SVG` | May mapanganib na script o tag ang SVG | Linisin ang markup o alisin ang mga script |
| `E_TOO_LARGE` | Lumagpas ang file sa `maxInputBytes` limit | I-compress ang input file o taasan ang limitasyon |
| `E_OUTPUT_TOO_LARGE` | Hindi ma-compress pababa sa target output size | Taasan ang target size o babaan ang sukat |
| `E_UNSUPPORTED_FORMAT` | Hindi suportadong format ng imahe | Gumamit ng SVG, PNG, JPEG, WebP, AVIF, GIF, o TIFF |
| `E_CORRUPT_HEADER` | Sira o kulang ang header ng file | Suriin ang integridad ng file |
| `E_EMPTY_FILE` | 0 bytes ang ibinigay na file | Tiyaking may laman ang file bago i-convert |
| `E_ALPHA_NOT_REPRESENTABLE` | Walang background color para sa JPEG | Magdagdag ng `--background "#ffffff"` |
| `E_PATH_TRAVERSAL` | Lumabas sa workspace root ang path | Gumamit ng path sa loob ng workspace |
| `E_READ_PERMISSION` | Walang pahintulot na basahin ang file | Suriin ang file read permissions |
| `E_WRITE_PERMISSION` | Walang pahintulot na sumulat sa folder | Suriin ang folder write permissions |
| `E_DISK_FULL` | Puno ang disk ng device | Magbakante ng espasyo sa storage |
| `E_SYMLINK_LOOP` | Paikot-ikot na symlink loop | Alisin ang paulit-ulit na symlink |
| `E_TIMEOUT` | Lumagpas sa itinakdang oras ng conversion | Babaan ang resolution o taasan ang timeout |
| `E_WASM_FAILED` | Nabigo ang WebAssembly engine | Tiyaking may suporta sa WebAssembly ang browser |
| `E_NODE_VERSION` | Lumang bersyon ng Node.js (< 22.0.0) | Mag-upgrade sa Node.js 22 o mas bago |
| `E_INVALID_CONFIG` | Sira ang configuration file | Ayusin ang syntax sa `zapwebp.config.js` |
| `E_UPLOADER_REQUIRED` | Walang conversion handler ang UI store | Magpasa ng uploader callback function |
| `E_CROP_EMPTY` | Nagbunga ng 0×0 dimensyon ang crop | Ayusin ang coordinates ng crop region |
| `E_MODEL_FAILED` | Nabigong mag-load ang AI model | Kusang bumabagsak sa Smart-Subject mode |
| `E_RATE_LIMIT` | Masyadong maraming requests nang sabay-sabay | Maghintay sandali bago subukang muli |
| `E_AUTH` | Maling credentials para sa storage | I-verify ang API keys o tokens |
| `E_STORAGE` | Nagbalik ng error ang storage provider | Suriin ang bucket permissions at koneksyon |
| `E_UNKNOWN_FORMAT` | Hindi tugma ang magic bytes sa anumang format | I-verify ang file extension |

## For agents

```json
{
  "catalog": "ZapwebpError",
  "fields": ["code", "message", "fix", "docs", "exitCode"],
  "format": "JSON-serializable"
}
```

## Related

- [Safety](/safety): Paano maiiwasan ang mga error sa kaligtasan.
- [CLI](/cli): Mga exit code at diagnostic command.
