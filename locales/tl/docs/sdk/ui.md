# @zapwebp/ui Reference

Covers: programmatic component mounting, zero-dependency dropzone element, cockpit control bar, at accessible comparison modal dialogs.

Does not cover: backend node script execution. Tingnan ang [CLI SDK](/sdk/cli).

Applies to: `@zapwebp/ui` v2.2.0 at mas bago.

## Quick start

```javascript
import { showError, ZapDropzone } from '@zapwebp/ui';

showError('E_UNSAFE_SVG', { container: document.body });
```

## What it does

Nagbibigay ang UI SDK ng programmatic controls para sa mabilisang pag-mount ng accessible na dropzones, responsive comparison dialogs, at awtomatikong error notifications sa anumang web application nang walang framework dependencies.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TOKEN_MISSING` | Nawawala ang kinakailangang CSS design tokens | Siguraduhing na-import ang tokens.css |

## For agents

```json
{
  "package": "@zapwebp/ui",
  "components": ["showError", "dismissAllErrors", "ZapDropzone", "ZapModal"],
  "accessibility": "WCAG 2.2 AA compliant"
}
```

## Related

- [UI Kit](/ui): Pangkalahatang pangkalahatang-ideya ng mga component.
- [Errors](/errors): Kumpletong listahan ng mga error na may suportadong mapping.
