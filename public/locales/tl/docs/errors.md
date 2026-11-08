# Errors

Covers: standardized machine-readable error catalog ng Zapwebp, mga paliwanag sa sanhi ng error, at kaukulang mga hakbang para sa pag-aayos.

Does not cover: third-party compiler errors.

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp --doctor
```

Sinusuri ang kapaligiran at mga dependency upang matukoy ang mga posibleng sanhi ng error.

## What it does

Ang bawat error sa Zapwebp ay may natatanging error code (hal. `E_UNSAFE_SVG`, `E_ALPHA_NOT_REPRESENTABLE`) na sinamahan ng malinaw na sanhi at madaling maisagawang solusyon. Ito ay dinisenyo upang mapadali ang debugging ng mga developer at AI agents.

## Errors

| Code | Deskripsyon | Aksyon |
|---|---|---|
| `E_UNSAFE_SVG` | May mapanganib na script o tag ang SVG | Linisin ang markup o gamitin ang `--allow-unsafe` |
| `E_ALPHA_NOT_REPRESENTABLE` | Walang background color para sa JPEG | Magdagdag ng `--background "#ffffff"` |
| `E_EMPTY_FILE` | 0 bytes ang ibinigay na file | Tiyaking na-download nang buo ang file |
| `E_PATH_TRAVERSAL` | Lumabas sa workspace ang path | Gumamit ng path sa loob ng workspace |
| `E_DISK_FULL` | Puno ang disk ng device | Magbakante ng espasyo sa storage |

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
