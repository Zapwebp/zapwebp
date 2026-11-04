# Translation Guide — Zapwebp (i18n)

**Effective Date:** November 4, 2026  
**Status:** Active Community Policy

Zapwebp is an international, open-source project. We believe developer tools and image utilities should speak your native language without friction. Our internationalization (i18n) engine is built into `@zapwebp/shared` and powers the Web App, CLI output, error catalog, and documentation.

---

## 1. Supported Locales

| Locale Code | Language | Native Name | Status | Lead / Maintainer |
|:---:|:---|:---|:---:|:---|
| `en` | English | English | Source of Truth | Core Team |
| `tl` | Tagalog | Filipino | Verified | Core Team |

We actively welcome community contributions for additional languages, including Spanish (`es`), Japanese (`ja`), German (`de`), French (`fr`), Portuguese (`pt`), Chinese (`zh`), and others.

---

## 2. Catalog Architecture & Directory Layout

All translation catalogs live in the root `/locales/` directory:

```text
locales/
├── en/
│   ├── common.json   # Web application UI, buttons, titles, dropzone hints
│   ├── errors.json   # Structured error codes, user-friendly explanations, and fixes
│   ├── cli.json      # Terminal command descriptions, flags, doctor diagnostics
│   └── docs/         # Translated markdown documentation corresponding to content/
└── tl/
    ├── common.json
    ├── errors.json
    ├── cli.json
    └── docs/
```

---

## 3. Translation Discipline & Rules

To ensure reliable, safe rendering across both the browser and terminal interfaces, all translations must adhere to these strict rules:

### 3.1 Immutable Keys
Never alter, rename, or delete JSON keys. Keys serve as program contracts:
```json
// CORRECT
{
  "dropzone.idle": "I-drop ang imahe dito"
}

// INCORRECT (Never change the key name)
{
  "dropzone.naghihintay": "I-drop ang imahe dito"
}
```

### 3.2 Preserve Variable Placeholders
All variables formatted with `{{variable_name}}` must be preserved in the translated string. You may reposition the placeholder in the sentence to fit natural grammar:
```json
// English
"summary": "Converted {{count}} images in {{time}}ms"

// Tagalog (Correct - preserves {{count}} and {{time}})
"summary": "Matagumpay na na-convert ang {{count}} na imahe sa loob ng {{time}}ms"
```

### 3.3 Plain Text Only (No HTML / Script Injections)
Translations must be plain text. Never include HTML tags (`<b>`, `<span>`), markdown scripts, or event handlers. Any translation containing `<script>` or executable patterns will be automatically rejected by CI security validation.

### 3.4 Professional & Natural Tone
Avoid robotic, word-for-word machine translation. Translations should sound natural, concise, and respectful to a professional developer or designer in your native language.

---

## 4. How to Add a New Language (Step-by-Step)

### Step 1: Create the Locale Directory
Use the standard two-letter ISO 639-1 language code (e.g., `es` for Spanish, `de` for German, `ja` for Japanese):
```bash
mkdir locales/<locale-code>
mkdir locales/<locale-code>/docs
```

### Step 2: Copy the English Base Catalogs
Copy the source catalogs from `locales/en/`:
```bash
cp locales/en/common.json locales/<locale-code>/common.json
cp locales/en/errors.json locales/<locale-code>/errors.json
cp locales/en/cli.json locales/<locale-code>/cli.json
```

### Step 3: Translate the String Values
Open each JSON file and translate the string values into your native language. Ensure all keys and placeholders (`{{...}}`) remain intact.

### Step 4: Register the Locale in Shared Code
Open `packages/shared/src/i18n.js` and add your locale code to the `SUPPORTED_LOCALES` array:
```javascript
const SUPPORTED_LOCALES = ['en', 'tl', '<your-locale-code>'];
```

### Step 5: Translate Documentation (Optional but Recommended)
Translate the markdown manuals in `content/` and save them under `locales/<locale-code>/docs/` following the same filenames.

---

## 5. CI Validation Requirements

Before opening a pull request, you must run the automated localization validation suite to verify complete key parity and syntax safety:

```bash
# 1. Validate JSON catalogs (key parity, missing keys, unsafe scripts)
node scripts/validate-locales.js

# 2. Validate documentation translations
node --test test/locales-docs.test.js

# 3. Run full workspace tests
pnpm test
```

### What CI Enforces:
- **Zero Missing Keys:** Every key present in `locales/en/` must exist in your catalog.
- **Zero Extra Keys:** Orphaned or misspelled keys not present in English will trigger a failure.
- **Placeholder Integrity:** Any missing or altered `{{placeholder}}` will cause the test to fail.
- **Security Check:** Any presence of `<script` or active HTML triggers an immediate build block.

---

## 6. Contributor Recognition & `TRANSLATORS.md`

We deeply value international contributors. When your translation pull request is accepted:
1. Add your name, GitHub handle, and language to [`TRANSLATORS.md`](TRANSLATORS.md).
2. Your contribution will be highlighted in the upcoming release notes and [CHANGELOG.md](CHANGELOG.md).
3. You will be listed as the language maintainer for that locale.

If you have questions about specific terminology or context, open an issue on GitHub ([https://github.com/Zapwebp](https://github.com/Zapwebp)) or contact us at [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com).

