# Errors

Covers: standardized machine-readable error catalog ng Zapwebp, mga paliwanag sa sanhi ng error, at kaukulang mga hakbang para sa pag-aayos.

Does not cover: third-party compiler errors.

Applies to: Zapwebp platform v2.28.0 at `@zapwebp/shared` v1.1.2 at mas bago.

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
| `E_INPUT_TOO_LARGE` | Lumagpas ang input file sa itinakdang sukat ng policy | Magbigay ng mas maliit na file o taasan ang `policy.maxInputBytes` |
| `E_INPUT_TOO_SMALL` | Mas maliit ang input file sa kinakailangang minimum byte threshold | Magbigay ng file na pasok sa minimum byte requirement |
| `E_OUTPUT_TOO_LARGE` | Hindi ma-compress pababa sa target output size | Taasan ang target size o babaan ang sukat |
| `E_OUTPUT_TOO_SMALL` | Mas maliit ang output file sa pinapayagang minimum threshold | Taasan ang quality o i-adjust ang size limits |
| `E_OUTPUT_BELOW_RANGE` | Bumagsak ang output sa ibaba ng target size range | I-adjust ang `minOutputBytes` |
| `E_TARGET_UNREACHABLE` | Masyadong masalimuot ang imahe para sa target byte budget kahit i-downscale | Taasan ang byte budget o payagan ang Lanczos3 downscaling |
| `E_UNSUPPORTED_FORMAT` | Hindi suportadong format ng imahe | Gumamit ng SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF, o ICO |
| `E_UNKNOWN_FORMAT` | Hindi tugma ang magic bytes sa anumang format | I-verify ang file extension o mag-install ng plugin |
| `E_CORRUPT_HEADER` | Sira o kulang ang header ng file | Suriin ang integridad ng file |
| `E_CORRUPT_INPUT` | May sirang data chunk ang stream ng imahe | Tiyaking tapos ang download o pagkopya ng file |
| `E_EMPTY_FILE` | 0 bytes ang ibinigay na file | Tiyaking may laman ang file bago i-convert |
| `E_ALPHA_NOT_REPRESENTABLE` | Walang background color para sa JPEG | Magdagdag ng `--background "#ffffff"` o piliin ang WebP/PNG/AVIF |
| `E_ALPHA_LOST` | May transparency ang input ngunit hindi ito suportado ng target | Magbigay ng explicit matte background o pumili ng alpha-capable format |
| `E_PATH_TRAVERSAL` | Lumabas sa workspace root ang path | Gumamit ng path sa loob ng workspace |
| `E_READ_PERMISSION` | Walang pahintulot na basahin ang file | Suriin ang file read permissions |
| `E_WRITE_PERMISSION` | Walang pahintulot na sumulat sa folder | Suriin ang folder write permissions |
| `E_WRITE_LOCKED` | Naka-lock ang file ng ibang proseso | Isara ang viewer o editor na humahawak sa file |
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
| `E_TOO_MANY_FILES` | Lumagpas ang bilang ng file sa batch ceiling (default 20) | Bawasan ang file o gamitin ang `--max-files` / `--unlimited` |
| `E_REQUEST_TOO_LARGE` | Lumagpas ang kabuuang byte size ng batch (default 100 MB) | Bawasan ang laki ng batch o taasan ang limitasyon |
| `E_SESSION_LIMIT_EXCEEDED` | Naabot ang limitasyon ng session (default 100 files) | Simulan ang bagong session o patakbuhin ang `zap --reset-session` |
| `E_USER_LIMIT_EXCEEDED` | Naabot ang quota limit para sa user account | Maghintay sa reset period o taasan ang `maxFilesPerUser` |
| `E_CONCURRENCY_LIMIT_EXCEEDED` | Lumagpas sa kapasidad ng concurrent worker pool | Maghintay na matapos ang mga conversion o taasan ang concurrency |
| `E_DELETE_NOT_ENABLED` | Hiniling ang pagbura nang walang opt-in consent | Ilagay ang `"allowDeleteOriginal": true` sa config o ipasa ang `--yes` |
| `E_BACKUP_VERIFICATION_FAILED` | Nabigo ang pagtutugma ng SHA-256 backup bago magbura | Suriin ang storage space sa `.zapwebp/backups/` |
| `E_FORK_DELETE_FORBIDDEN` | Natukoy ang deletion flag sa pull request mula sa fork | Alisin ang deletion arguments mula sa fork CI workflow |
| `E_AUTH` | Maling credentials para sa storage | I-verify ang API keys o tokens |
| `E_STORAGE` | Nagbalik ng error ang storage provider | Suriin ang bucket permissions at koneksyon |
| `E_SSRF_BLOCKED` | Tumuturo ang URL sa pribadong subnet o cloud metadata | Magbigay ng pampublikong HTTPS image URL |
| `E_UNSAFE_PROTOCOL` | Gumagamit ng hindi pinapayagang protocol ang URL | Tanging `https://` URLs lamang ang pinapayagan |
| `E_CLEAN_FAILED` | Nabigo ang pag-alis ng targeted metadata chunks | Suriin ang imahe gamit ang `zapwebp-lens inspect` |
| `E_CORRUPT_CONTAINER` | Naging unreadable ang container matapos tanggalan ng metadata | Suriin ang integridad ng file |
| `E_SAME_FORMAT_REJECTED` | Pareho ang input at target format at hindi pinapayagan ng policy | I-configure ang `sameFormat: "passthrough"` |
| `E_FORMAT_REJECTED` | Tinanggihan ang format batay sa policy allowlist | I-update ang format policy |
| `E_PLUGIN_SANDBOX_VIOLATION` | Hindi awtorisadong filesystem access ng plugin | Tiyaking byte buffers lamang ang pinoproseso ng plugin |
| `E_UNSAFE_RUNTIME` | Gumamit ng bawal na networking library sa core conversion | Alisin ang unauthorized network imports |
| `E_LOSSLESS_MISMATCH` | Nagkaiba ang pixels ng output at input sa lossless mode | Tiyaking suportado ang buong lossless encoding |
| `E_VERIFICATION_FAILED` | Hindi tugma ang nabuong SHA-256 sa inaasahang hash | I-verify ang inaasahang hash |
| `E_UNSUPPORTED_LOCALE` | Hindi suportadong wika sa catalog | Pumili ng suportadong wika (tulad ng `en`, `tl`) |
| `E_ABORTED` | Na-abort ang conversion bago matapos | Subukang muli kapag handa na |
| `E_EXTREME_ASPECT_RATIO` | Masyadong matinding aspect ratio ng SVG (< 0.01:1 o > 100:1) | Suriin ang SVG viewport dimensions |
| `E_VERSION` | Hindi tugmang bersyon sa lockfile | I-update ang lockfile gamit ang `zapwebp-lock` |
| `E_FILE_CONFLICT` | Umiiral na ang target output file | Gamitin ang `--force` o pumili ng ibang output directory |

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
- [Limits](/limits): Mga limitasyon sa bilang ng file at concurrency ceilings.
