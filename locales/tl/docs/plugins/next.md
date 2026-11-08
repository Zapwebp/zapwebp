# Next.js Plugin

Covers: integrasyon ng Zapwebp sa Next.js applications, automated asset pipeline, at static site generation optimizations.

Does not cover: WordPress integrations.

Applies to: `@zapwebp/next` v1.0.0 at mas bago.

## Quick start

```bash
npm install @zapwebp/next
```

```javascript
// next.config.js
const { withZapwebp } = require('@zapwebp/next');

module.exports = withZapwebp({
  // mga opsyon ng next config
});
```

## What it does

Awtomatikong kino-convert ng plugin ang mga imahe sa `public/` folder patungong WebP at AVIF sa oras ng build, lumilikha ng responsive na srcset metadata, at pinipigilan ang pagkasira ng aninag sa static site exports.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_FILE_CONFLICT` | Umiiral na ang target output file | Baguhin ang configuration patungong overwrite |

## For agents

```json
{
  "plugin": "@zapwebp/next",
  "framework": "next.js",
  "stages": ["build", "export"]
}
```

## Related

- [Vite Plugin](/plugins/vite): Katulad na build plugin para sa mga proyekto ng Vite.
- [Target Lock](/lock-target): Pag-lock ng mga format para sa static site exports.
