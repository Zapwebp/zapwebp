# `@zapwebp/shared`

Universal shared constants, format matrices, MIME maps, error catalogs, and internationalization primitives for the Zapwebp ecosystem.

## Installation

```bash
pnpm add @zapwebp/shared
```

## Features

- **Format Registry Constants**: Exhaustive definitions for `INPUT_FORMATS` (`svg`, `png`, `jpeg`, `webp`, `avif`, `gif`, `tiff`) and `OUTPUT_FORMATS` (`webp`, `png`, `jpeg`, `avif`).
- **MIME & Extension Mappings**: Canonical bi-directional mappings via `getMimeType(format)` and `getExtension(mime)`.
- **Structured Error Catalog**: `ZapwebpError` class with standard codes (`E_UNSUPPORTED_FORMAT`, `E_CORRUPT_HEADER`, `E_INPUT_TOO_LARGE`, `E_OUTPUT_TOO_LARGE`, `E_ALPHA_NOT_REPRESENTABLE`), contextual messages, and suggested fixes.
- **Conversion Policy Defaults**: Pre-configured `DEFAULT_CONVERSION_POLICY` providing safe defaults for lossy, lossless, and automatic quality modes.
- **Lightweight i18n**: Multi-lingual message catalog supporting English (`en`) and Tagalog (`tl`).

## Usage

```javascript
import {
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  getMimeType,
  ZapwebpError,
  DEFAULT_CONVERSION_POLICY
} from '@zapwebp/shared';

console.log(getMimeType('webp')); // 'image/webp'
```

## License

MIT © Zapwebp

