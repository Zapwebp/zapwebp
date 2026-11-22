# Gabay para sa mga Tagasalin at Internasyonalisasyon

Ang Zapwebp ay binuo para sa mga developer at creator sa buong mundo. Ang aming internationalization (i18n) engine ay nakapaloob sa `@zapwebp/shared`, nagbibigay ng mabilis at zero-dependency na localization sa web app, CLI, error catalog, at dokumentasyon.

Malugod naming tinatanggap ang mga kontribusyon upang maidagdag ang mga bagong wika sa Zapwebp.

---

## 1. Mga Sinusuportahang Wika

| Code | Wika | Katutubong Pangalan | Katayuan | Tagapamahala |
|:---:|---|---|:---:|---|
| **`en`** | English | English | **Authoritative Source of Truth** | Core Team |
| **`tl`** | Tagalog / Filipino | Wikang Filipino | **Verified (100% Parity)** | Core Team |

---

## 2. Balangkas ng mga Translation Catalog

Lahat ng catalog ay matatagpuan sa direktoryong `/locales/`:
```text
locales/
├── en/                      # Pangunahing source of truth
│   ├── common.json          # Web app UI, buttons, headers
│   ├── errors.json          # Mga mensahe ng error codes
│   ├── cli.json             # Mga flag at help text sa CLI
│   └── docs.json            # Navigation categories at titles
└── tl/                      # Salin sa Tagalog / Filipino
    ├── common.json
    ├── errors.json
    ├── cli.json
    ├── docs.json
    └── docs/                # Isinaling documentation markdown files
```

---

## 3. Mahigpit na Panuntunan sa Pagsasalin

1. **Huwag Baguhin ang mga Key**: Huwag kailanman palitan ang pangalan ng mga JSON key. Ang mga value lamang ang isinasalin.
2. **Panatilihin ang mga Variable Placeholder**: Ang mga variable na nasa loob ng double curly braces (tulad ng `{{from}}`, `{{to}}`, `{{count}}`, `{{limit}}`, `{{maxBytes}}`) ay hindi dapat palitan.
3. **Ligtas na Plain Text**: Bawal magsama ng raw HTML tags (`<script>`, `<a>`) sa mga salin.
4. **Katumpakan ng mga Teknikal na Termino**: Ang mga error code (`E_UNSAFE_SVG`), CLI flags (`--to`, `--scale`), at format names (`WebP`, `AVIF`, `SVG`) ay nananatili sa kanilang orihinal na anyo.

---

## 4. Paano Mag-ambag ng Bagong Wika

1. Gumawa ng bagong folder sa ilalim ng `locales/` gamit ang ISO 639-1 code (halimbawa: `locales/es`).
2. Kopyahin ang mga JSON file mula sa `locales/en/` patungo sa bagong folder.
3. Isalin ang mga string value sa iyong wika.
4. Patakbuhin ang validator: `pnpm run validate-locales`.
5. Magbukas ng pull request sa GitHub.

---

## 5. Talaan ng mga Kinikilalang Tagasalin

Pinasasalamatan namin ang mga miyembro ng komunidad na tumutulong magpanatili ng mga salin ng Zapwebp:
- **English**: Eldrex Delos Reyes Bula (@eldrex)
- **Tagalog / Filipino**: Eldrex Delos Reyes Bula (@eldrex), Mga Kontribyutor ng Komunidad
