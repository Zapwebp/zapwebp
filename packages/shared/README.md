# @zapwebp/shared

Universal shared constants, format matrices, MIME maps, error catalogs, and internationalization primitives for the Zapwebp ecosystem.

Covers: Universal constants, format matrices, MIME mappings, structured `ZapwebpError` catalog, default conversion policies, and internationalization message dictionaries.

Does not cover: Native image decoding/encoding, filesystem I/O, or framework-specific UI components.

Applies to: `@zapwebp/shared` v1.0.0 and later, Node.js >=22.0.0, browser environments.

## Quick start

```bash
pnpm add @zapwebp/shared
```

```javascript
import {
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  getMimeType,
  getExtension,
  ZapwebpError,
  DEFAULT_CONVERSION_POLICY,
} from '@zapwebp/shared';

console.log(getMimeType('webp')); // 'image/webp'
console.log(getExtension('image/avif')); // 'avif'
```

## What it does

`@zapwebp/shared` acts as the single source of truth for types, constants, MIME definitions, and error dictionaries across the Zapwebp workspace:
- **Format Registry Constants**: Exhaustive definitions for `INPUT_FORMATS` (`svg`, `png`, `jpeg`, `webp`, `avif`, `gif`, `tiff`) and `OUTPUT_FORMATS` (`webp`, `png`, `jpeg`, `avif`).
- **MIME & Extension Mappings**: Canonical bi-directional mappings via `getMimeType(format)` and `getExtension(mime)`.
- **Structured Error Catalog**: `ZapwebpError` class with standard codes (`E_UNSUPPORTED_FORMAT`, `E_CORRUPT_HEADER`, `E_INPUT_TOO_LARGE`, `E_OUTPUT_TOO_LARGE`, `E_ALPHA_NOT_REPRESENTABLE`), contextual messages, and suggested fixes.
- **Conversion Policy Defaults**: Pre-configured `DEFAULT_CONVERSION_POLICY` providing safe defaults for lossy, lossless, and automatic quality modes.
- **Lightweight i18n**: Multi-lingual message catalog supporting English (`en`) and Tagalog (`tl`).

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSUPPORTED_FORMAT` | Format is not in `INPUT_FORMATS` or `OUTPUT_FORMATS` | Check supported format arrays |
| `E_INVALID_MIME` | Unrecognized MIME type requested | Use standard MIME type string (e.g. `image/webp`) |
| `E_ALPHA_NOT_REPRESENTABLE` | Flattening requested without background color | Specify solid background hex color |

## For agents

```json
{
  "tool": "@zapwebp/shared",
  "constants": {
    "INPUT_FORMATS": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
    "OUTPUT_FORMATS": ["webp", "png", "jpeg", "avif"],
    "DEFAULT_PORT": 3000,
    "MAX_DIMENSION": 4096
  },
  "exports": ["getMimeType", "getExtension", "ZapwebpError", "DEFAULT_CONVERSION_POLICY"]
}
```

## Related

- [Core SDK](https://zapwebp-docs.vercel.app/sdk/core): Engine consuming shared constants and error definitions.
- [Errors Reference](https://zapwebp-docs.vercel.app/errors): Exhaustive catalog of system error codes and solutions.
- [UI SDK](https://zapwebp-docs.vercel.app/sdk/ui): Design tokens and UI error handlers.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
