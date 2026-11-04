# Translators & Internationalization

Covers: Supported language locales, catalog directory layout (`/locales/`), key discipline, variable placeholder preservation, and the official translators directory.

Does not cover: TypeScript SDK development. See [Contributing](/contributing) and [Developers](/developers).

Applies to: All Zapwebp translation catalogs (`en`, `tl`, and community locales).

## Quick start

```bash
# Validate translation catalog parity
pnpm run validate-locales
```

To contribute a new language, create `/locales/<locale-code>/` and run the validation suite before opening a pull request.

## What it does

Zapwebp's localization engine (`@zapwebp/shared`) delivers zero-dependency internationalization across the web application, terminal CLI, error catalog, and documentation.

### Supported Locales

| Code | Language | Native Name | Status | Maintainer |
|:---:|:---|:---|:---:|:---|
| `en` | English | English | Source of Truth | Core Team |
| `tl` | Tagalog | Filipino | Verified | Core Team |

### Translation Rules

1. **Immutable Keys**: Never modify or rename keys in `common.json`, `errors.json`, `cli.json`, or `docs.json`.
2. **Preserve Placeholders**: Interpolation variables like `{{count}}`, `{{from}}`, and `{{to}}` must be preserved exactly in the translated text.
3. **Plain Text Only**: Translations must not contain raw HTML tags (`<script>`, `<b>`) or executable event handlers.
4. **Natural Phrasing**: Use natural phrasing for descriptions while preserving technical terms (CLI flags, error codes, format names).

## Catalog Structure

```text
locales/
├── en/
│   ├── common.json   # Web application UI, buttons, titles, dropzone hints
│   ├── errors.json   # Error codes, causes, and actionable fixes
│   ├── cli.json      # CLI commands, flags, and help text
│   └── docs.json     # Documentation navigation and headings
└── tl/
    ├── common.json
    ├── errors.json
    ├── cli.json
    └── docs.json
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSUPPORTED_LOCALE` | Requested locale is not supported in catalog | Choose a supported locale (e.g. `en`, `tl`) |
| `missing_translation_key` | Key exists in base `en` catalog but missing in target | Add missing key and translation to target catalog |

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

- [Contributing](/contributing): Code contribution workflows.
- [Code of Conduct](/code-of-conduct): Community interaction standards.
- [About](/about): Project background and mission.
