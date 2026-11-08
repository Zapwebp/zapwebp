# Contributing

Covers: Daloy ng pagbuo, pag-setup ng kapaligiran, pangunahing mga patakaran sa arkitektura, checklist ng pull request, at mga alituntunin sa pagsubok para sa mga kontribyutor.

Does not cover: Lokalisasyon ng wika at pagsasalin ng catalog. Tingnan ang [Translators](/translators).

Applies to: Lahat ng mga kontribyutor, nag-uulat ng isyu, at gumagawa ng pull request sa lahat ng package ng `@zapwebp`.

## Quick start

```bash
# 1. I-clone at i-install ang mga dependency
git clone https://github.com/Zapwebp/zapwebp.git
cd zapwebp && pnpm install

# 2. Patakbuhin ang mga suite ng pagsubok sa lahat ng package
pnpm test
```

## What it does

Ang Zapwebp ay pinamamahalaan ng mahigpit na mga prinsipyo ng Enterprise Architecture upang matiyak ang madaling pagpapanatili, walang labis na dependencies, at ganap na kaligtasan sa aninag ng bawat conversion pipeline.

### Ang Dalawang Pangunahing Patakaran sa Arkitektura

1. **Pababang Direksyon Lamang ang Dependencies**:
   - `apps/web` (Presentasyon) $\rightarrow$ `@zapwebp/features` $\rightarrow$ `@zapwebp/ui` $\rightarrow$ `@zapwebp/core` $\rightarrow$ `@zapwebp/shared` (Kontrata).
   - Ang `@zapwebp/core` ay **hindi dapat** kailanman mag-import mula sa UI o feature layers.
2. **Huwag Mag-hardcode ng Hex Color**:
   - Ang estilo ng mga component ay dapat gumamit ng design tokens mula sa `@zapwebp/ui` (`tokens.css`). Ipinagbabawal ang paggamit ng hilaw na `#hex` na kulay sa presentasyon.

### Daloy ng Trabaho sa Pag-develop

| Gawain | Command | Deskripsyon |
|---|---|---|
| **Dev Server** | `pnpm dev` | Patakbuhin ang lokal na web server na may hot-reload sa port 3000 |
| **Workspace Tests** | `pnpm test` | Isagawa ang test suites sa lahat ng 20 packages |
| **Docs Bundle** | `pnpm run build:docs` | I-compile ang documentation SPA sa `public/docs.js` |
| **LLMS Manifest** | `pnpm run build:llms` | Gumawa ng mga salamin sa `public/llms.txt` |
| **Locale Validator** | `pnpm run validate-locales` | Patunayan ang parity ng catalog at alignment ng mga placeholder |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `test_failure` | May natuklasang regression habang tumatakbo ang `pnpm test` | Ayusin ang mga assertion ng unit test bago magbukas ng PR |
| `lint_failure` | May paglabag sa ESLint o patakaran sa arkitektura | Tiyaking pababa ang dependencies at gamitin ang tamang tokens |

## For agents

```json
{
  "project": "Zapwebp",
  "packageManager": "pnpm",
  "monorepo": "pnpm-workspace",
  "scripts": ["pnpm dev", "pnpm test", "pnpm run build:docs"],
  "rules": ["dependencies-point-down", "tokenized-colors", "100-percent-tests"]
}
```

## Related

- [Developers Overview](/developers): Pagsisimula at paggawa ng pasadyang plugin.
- [Code of Conduct](/code-of-conduct): Mga pamantayan sa pakikipag-ugnayan sa komunidad.
- [Translators](/translators): Gabay sa pag-ambag ng pagsasalin ng wika.
