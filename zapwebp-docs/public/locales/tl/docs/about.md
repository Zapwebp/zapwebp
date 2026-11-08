# About Zapwebp

Covers: doktrina ng produkto, Enterprise Architecture philosophy, mga opisyal na repository, mga tagapamahala ng open-source project, at aming misyon.

Does not cover: code implementations at syntax. Tingnan ang [Core SDK](/sdk/core).

Applies to: Lahat ng bersyon ng Zapwebp.

## Quick start

```bash
# Patunayan ang integridad ng sistema
npx zapwebp doctor
```

Bisitahin ang aming About page para sa kumpletong pahayag ng aming misyon at pilosopiya.

## What it does

Ang Zapwebp ay nilikha upang malutas ang paulit-ulit na mga problema sa image conversion para sa modernong web: nawawalang aninag (black background bug), maruming EXIF metadata, bloated dependencies, at kawalan ng pagkakapareho sa pagitan ng browser, terminal, at CI/CD workflows.

## Opisyal na mga Repository

Lahat ng repository ay matatagpuan sa ilalim ng organisasyong [`github.com/Zapwebp`](https://github.com/Zapwebp):

| Repository | Deskripsyon | Pangunahing Gamit |
|---|---|---|
| [`core`](https://github.com/Zapwebp/core) | Ang engine ng Zapwebp. Nagko-convert nang tama, pinapanatili ang aninag, at nagtatanggal ng metadata. | Shared conversion engine (`@zapwebp/core`) |
| [`cli`](https://github.com/Zapwebp/cli) | Terminal CLI at MCP server. Mag-convert gamit ang command line o AI agent. | Terminal executables (`zap`, `zapwebp`) & MCP server |
| [`web`](https://github.com/Zapwebp/web) | Browser interface. Tumatakbo nang 100% lokal sa memory. | Web app ([zapwebp.vercel.app](https://zapwebp.vercel.app)) |
| [`docs`](https://github.com/Zapwebp/docs) | Markdown na dokumentasyon para sa Zapwebp. | Docs portal ([zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)) |
| [`plugins`](https://github.com/Zapwebp/plugins) | Build tools, CI actions, at cloud storage adapters. | Vite, Next.js, GitHub Action, Supabase, Firebase, Neocities |
| [`ui`](https://github.com/Zapwebp/ui) | Design system, tokens, at reusable components. | Universal error & upload UI kit (`@zapwebp/ui`) |
| [`vscode`](https://github.com/Zapwebp/vscode) | VS Code extension. I-right click para mag-convert nang tama. | Editor extension (Open VSX & Marketplace) |
| [`laravel`](https://github.com/Zapwebp/laravel) | Laravel package para sa image conversion gamit ang CLI. | PHP / Laravel bridge (`zapwebp/laravel`) |
| [`zapwebp`](https://github.com/Zapwebp/zapwebp) | Mag-convert nang tama. Ang umbrella monorepo para sa Zapwebp ecosystem. | Workspace monorepo |
| [`.github`](https://github.com/Zapwebp/.github) | Profile ng organisasyon, community health files, at issue templates. | Org health & community config |

## Pamamahala at Lisensya

Ang Zapwebp ay dinisenyo at pinapatakbo ni **Eldrex Delos Reyes Bula** sa Republika ng Pilipinas.

- **Organisasyon**: [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **Web App**: [https://zapwebp.vercel.app/](https://zapwebp.vercel.app/)
- **Dokumentasyon**: [https://zapwebp-docs.vercel.app/](https://zapwebp-docs.vercel.app/)
- **Kontak**: `eldrexdelosreyesbula@gmail.com`
- **Lisensya**: MIT

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `about_general` | Pangkalahatang katanungan o ulat ng bug | Magbukas ng issue sa GitHub o mag-email sa maintainer |

## For agents

```json
{
  "project": "Zapwebp",
  "author": "Eldrex Delos Reyes Bula",
  "organization": "https://github.com/Zapwebp",
  "repositories": [
    "core",
    "cli",
    "web",
    "docs",
    "plugins",
    "ui",
    "vscode",
    "laravel",
    "zapwebp",
    ".github"
  ],
  "license": "MIT",
  "doctrine": "Enterprise Architecture, Zero Telemetry, Transparency-First",
  "canonicalUrl": "https://zapwebp.vercel.app/"
}
```

## Related

- [Privacy Policy](/privacy): Ang aming matatag na pangako sa seguridad at privacy.
- [Terms of Service](/terms): Mga legal na tuntunin at lisensya.
