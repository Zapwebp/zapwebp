# Plugin para sa ICO

Covers: `@zapwebp/format-ico` format plugin, paggawa ng multi-size ICO/CUR container, pag-parse ng embedded PNG, pag-decode ng legacy BMP DIBs (32-bit ARGB, 24-bit BGR, 8/4/1 bpp na may AND mask), `generateFaviconSuite` multi-asset generator, at `zapwebp-favicon` CLI executable.

Does not cover: pag-upload sa cloud storage o client-side drag-and-drop form component. Tingnan ang [Storage Adapters](/plugins/storage) o [UI Kit](/ui).

Applies to: `@zapwebp/format-ico` at `@zapwebp/core` v1.0.0 at mas bago.

## Quick start

```bash
npm install @zapwebp/format-ico
```

```javascript
import { registerFormat, convertImage } from '@zapwebp/core';
import { icoHandler, generateFaviconSuite } from '@zapwebp/format-ico';

// 1. Irehistro ang ICO format handler sa core engine
registerFormat(icoHandler);

// 2. I-convert ang SVG/PNG patungong multi-size ICO
const icoBuffer = await convertImage(inputBuffer, {
  to: 'ico',
  sizes: [16, 32, 48, 64, 128, 256],
});

// 3. Bumuo ng kumpletong favicon suite para sa web
const suite = await generateFaviconSuite(inputBuffer, {
  name: 'Aking Web App',
  shortName: 'App',
  themeColor: '#10b981',
  backgroundColor: '#ffffff',
  prefix: '/',
});
```

Paggamit ng standalone CLI:

```bash
npx zapwebp-favicon logo.svg -o ./public --name "Aking App" --theme-color "#10b981"
```

## What it does

- **Multi-Resolution ICO Containers**: Pinagsasama ang iba't ibang resolusyon (`16×16`, `32×32`, `48×48`, `64×64`, `128×128`, `256×256`) sa iisang `.ico` container file para sa malinaw na pagpapakita sa browser tabs, desktop taskbars, at shortcuts.
- **Embedded PNG Compression**: Iniimbak ang mga larawan gamit ang PNG compression sa loob ng ICO, nakatitipid ng hanggang 80% laki habang pinapanatili ang 8-bit alpha transparency.
- **Universal Decoding**: Kayang magbasa ng modernong PNG-compressed ICO at lumang Windows BMP DIBs (32-bit ARGB, 24-bit BGR, 8/4/1-bit palletized na may 1-bit AND mask).
- **Favicon Suite Generator**: Awtomatikong lumilikha ng `favicon.ico`, `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`, `favicon-32x32.png`, `favicon-16x16.png`, W3C `site.webmanifest`, at HTML `<head>` link tags mula sa iisang imahe.
- **Garantisadong Alpha Transparency**: Pinapanatili ang transparency nang walang pangingitim o pagkawala ng alpha channel.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_CORRUPT_HEADER` | Ang ICO file ay mas maliit sa 6 bytes o may maling magic signature. | Tiyakin na ang file ay buo at wastong ICO/CUR container. |
| `E_BOUNDS_EXCEEDED` | Higit sa 20 image entries ang nasa container o lumagpas sa 4096×4096 pixels. | Bawasan ang bilang ng resolutions o gumamit ng karaniwang sukat. |
| `E_INVALID_CONFIG` | Ang ibinigay na sukat ay hindi wasto (dapat integer sa pagitan ng 8 at 512). | Magbigay ng wastong listahan ng sukat tulad ng `[16, 32, 48, 256]`. |

## For agents

```json
{
  "pkg": "@zapwebp/format-ico",
  "version": "1.0.0",
  "contract": "generateFaviconSuite(input: Buffer | string, options?: FaviconSuiteOptions): Promise<FaviconSuiteResult>",
  "import": "import { icoHandler, generateFaviconSuite, encodeIco, parseIco, decodeIco } from '@zapwebp/format-ico';",
  "peerDependencies": {
    "@zapwebp/core": ">=1.1.0",
    "@zapwebp/plugin-sdk": ">=1.1.0"
  },
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/format-ico",
  "docs": "https://zapwebp-docs.vercel.app/plugins/format-ico"
}
```

## Related

- [Formats](/formats) — Matris ng suportadong mga format ng imahe at alpha transparency.
- [Crop Plugin](/plugins/crop) — Pagsusuri ng mukha at awtomatikong pag-crop ng imahe.
- [Core SDK](/sdk/core) — Gabay sa paggamit ng core image conversion engine.
