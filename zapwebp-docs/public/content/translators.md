# Translators & Internationalization Guide

Zapwebp is built for developers and creators worldwide. Our internationalization (i18n) engine is engineered into `@zapwebp/shared`, delivering lightweight, zero-dependency localization across the web application, terminal CLI, error catalog, and documentation.

We welcome community contributions to help expand Zapwebp into new languages. This guide explains how our translation architecture works, our key discipline rules, and the step-by-step process for contributing translations.

---

## 1. Supported Languages & Status

| Locale Code | Language Name | Native Name | Status | Maintained By |
|:---:|---|---|:---:|---|
| **`en`** | English | English | **Authoritative Source of Truth** | Core Team |
| **`tl`** | Tagalog / Filipino | Wikang Filipino | **Verified (100% Parity)** | Core Team |

---

## 2. Translation Catalog Structure

All translation catalogs live in the `/locales/` directory at the repository root. Each locale is housed in its own ISO 639-1 subdirectory:

```text
locales/
├── en/                      # Authoritative base locale
│   ├── common.json          # Web app UI, buttons, headers, dropzone text
│   ├── errors.json          # Error code descriptions and diagnostic messages
│   ├── cli.json             # CLI flags, command descriptions, and help screens
│   └── docs.json            # Documentation navigation categories and route titles
├── tl/                      # Tagalog / Filipino translation
│   ├── common.json
│   ├── errors.json
│   ├── cli.json
│   ├── docs.json
│   └── docs/                # Translated documentation markdown files (*.md)
```

---

## 3. Strict Translation Rules

To guarantee runtime stability, security, and consistent developer experiences, all translation contributions must adhere to four strict rules:

### Rule 1: Immutable Keys
Never alter, rename, or delete existing JSON keys. The key names serve as program identifiers in application code. Only the string values should be translated.

### Rule 2: Strict Placeholder Preservation
Strings containing interpolation variables enclosed in double curly braces (e.g. `{{from}}`, `{{to}}`, `{{maxBytes}}`, `{{limit}}`, `{{count}}`) must retain those exact variable names unchanged. 

- **Correct (English):** `"Conversion from {{from}} to {{to}} is not supported."`
- **Correct (Tagalog):** `"Hindi suportado ang pag-convert mula {{from}} patungong {{to}}."`
- **Incorrect:** `"Hindi suportado ang pag-convert mula {mula} patungong {patungo}."`

### Rule 3: Plain Text Safety (Zero Injected Markup)
Translation strings must not contain raw HTML tags (`<script>`, `<iframe>`, `<div>`, `<a>`) or executable JavaScript handlers (`onload=`, `javascript:`). The localization validator actively flags any HTML tags as security violations.

### Rule 4: Technical Term Integrity
Core technical terms, error code constants (`E_UNSAFE_SVG`, `E_ALPHA_NOT_REPRESENTABLE`), CLI flags (`--to`, `--quality`, `--scale`), and image format names (`SVG`, `WebP`, `AVIF`, `PNG`, `JPEG`) should remain untranslated to prevent developer confusion.

---

## 4. How to Contribute a New Language

### Step 1: Create the Locale Directory
Create a new directory under `locales/` named with the standard ISO 639-1 two-letter language code (e.g., `es` for Spanish, `ja` for Japanese, `de` for German):

```bash
mkdir -p locales/es
```

### Step 2: Copy and Translate Base Catalogs
Copy the four core JSON catalogs from `locales/en/`:
```bash
cp locales/en/*.json locales/es/
```
Translate the string values in each file into your target language while preserving keys and placeholders.

### Step 3: Run the Locale Validator
Run the automated localization validation script:
```bash
pnpm run validate-locales
```
The validator automatically verifies:
- Complete key parity against the base English catalog;
- Exact placeholder variable alignment;
- Absence of unsafe HTML or script payloads.

### Step 4: Translate Documentation (Optional but Recommended)
To translate platform documentation:
1. Create `locales/<locale>/docs/`.
2. Copy markdown files from `content/` and translate the technical explanations.
3. Validate documentation compliance with `node --test test/locales-docs.test.js`.

### Step 5: Submit a Pull Request
Open a pull request on GitHub with the title `feat(i18n): add <language> translation catalog`.

---

## 5. Recognized Translators Directory

We gratefully acknowledge the community members who maintain and review Zapwebp's localization catalogs:

| Language | Locale | Contributors & Maintainers |
|---|:---:|---|
| **English** | `en` | Eldrex Delos Reyes Bula (@eldrex) |
| **Tagalog / Filipino** | `tl` | Eldrex Delos Reyes Bula (@eldrex), Zapwebp Community Contributors |

To be listed in the Recognized Translators directory, submit an approved translation catalog or review a pending localization pull request.
