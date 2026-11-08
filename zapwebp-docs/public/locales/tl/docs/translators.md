# Translators & Internationalization

Covers: Mga sinusuportahang wika, ayos ng directory sa `/locales/`, disiplina sa mga key, pagpapanatili ng variable placeholder, at ang opisyal na listahan ng mga tagasalin.

Does not cover: Pagbuo ng TypeScript SDK. Tingnan ang [Contributing](/contributing) at [Developers](/developers).

Applies to: Lahat ng translation catalog ng Zapwebp (`en`, `tl`, at mga wika ng komunidad).

## Quick start

```bash
# Patunayan ang parity ng translation catalog
pnpm run validate-locales
```

Upang mag-ambag ng bagong wika, lumikha ng `/locales/<locale-code>/` at patakbuhin ang validation suite bago magbukas ng pull request.

## What it does

Ang localization engine ng Zapwebp (`@zapwebp/shared`) ay nagbibigay ng zero-dependency na pagsasalin sa buong web application, terminal CLI, error catalog, at dokumentasyon.

### Mga Sinusuportahang Wika

| Code | Wika | Katutubong Pangalan | Katayuan | Tagapamahala |
|:---:|:---|:---|:---:|:---|
| `en` | English | English | Batayan (Source of Truth) | Core Team |
| `tl` | Tagalog | Filipino | Napatunayan | Core Team |

### Mga Panuntunan sa Pagsasalin

1. **Mga Hindi Mababagong Key (Immutable Keys)**: Huwag kailanman baguhin o palitan ang pangalan ng mga key sa `common.json`, `errors.json`, `cli.json`, o `docs.json`.
2. **Panatilihin ang mga Placeholder**: Ang mga variable tulad ng `{{count}}`, `{{from}}`, at `{{to}}` ay dapat manatili sa eksaktong anyo sa isinaling teksto.
3. **Purong Teksto Lamang**: Ang mga salin ay hindi dapat maglaman ng HTML tags (`<script>`, `<b>`) o executable event handlers.
4. **Natural na Pagpapahayag**: Gumamit ng natural na Tagalog habang pinapanatili ang mga teknikal na termino (mga flag ng CLI, error code, format name).

## Catalog Structure

```text
locales/
├── en/
│   ├── common.json   # UI ng web app, mga button, pamagat, dropzone hints
│   ├── errors.json   # Mga error code, sanhi, at solusyon
│   ├── cli.json      # Mga command ng CLI, flags, at help text
│   └── docs.json     # Nabigasyon at mga pamagat sa dokumentasyon
└── tl/
    ├── common.json
    ├── errors.json
    ├── cli.json
    └── docs.json
```

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSUPPORTED_LOCALE` | Hindi suportado ang hiniling na wika sa catalog | Pumili ng suportadong wika (hal. `en`, `tl`) |
| `missing_translation_key` | Umiiral ang key sa `en` ngunit wala sa target catalog | Idagdag ang nawawalang key at salin sa target catalog |

## For agents

```json
{
  "system": "i18n",
  "engine": "@zapwebp/shared",
  "catalogs": ["common.json", "errors.json", "cli.json", "docs.json"],
  "validator": "scripts/validate-locales.js",
  "locales": ["en", "tl"]
}
```

## Related

- [Contributing](/contributing): Daloy ng trabaho sa pag-ambag ng code.
- [Code of Conduct](/code-of-conduct): Mga pamantayan sa pakikipag-ugnayan sa komunidad.
- [About](/about): Kasaysayan at layunin ng proyekto.
