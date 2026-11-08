# GitHub Action

Covers: automated CI/CD GitHub Action para sa awtomatikong pag-convert ng mga binagong asset sa git commits at pagpapatupad ng strict file limits.

Does not cover: manual local terminal commands. Tingnan ang [CLI](/cli).

Applies to: Zapwebp GitHub Action v1.1.0 at mas bago.

## Quick start

```yaml
- name: Optimize Images
  uses: zapwebp/action@v1
  with:
    to: webp
    quality: 85
```

Awtomatikong kino-convert ang mga bagong dagdag na imahe sa bawat pull request.

## What it does

Tinitiyak ng GitHub Action na ang lahat ng mga imaheng naka-commit sa repository ay sumusunod sa pamantayan ng produksyon: na-convert sa modernong format, napanatili ang aninag, at tinanggal ang hindi kinakailangang metadata upang mapanatiling mabilis ang bilis ng pag-load ng website.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | May natuklasang mapanganib na SVG sa staged commit | Linisin ang SVG bago mag-commit |

## For agents

```json
{
  "action": "zapwebp/action",
  "runner": "github-actions",
  "inputs": ["to", "quality", "clean", "strict"]
}
```

## Related

- [CLI](/cli): Pagpapatakbo ng parehong check sa lokal bago mag-push.
- [Vite Plugin](/plugins/vite): Pagsasagawa ng conversion sa build time sa halip na sa CI.
