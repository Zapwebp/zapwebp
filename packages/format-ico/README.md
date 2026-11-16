# @zapwebp/format-ico

<div align="center">
  <img src="zapwebp-ico.svg" alt="Zapwebp ICO" width="120" height="120" />
  <h3>High-Resolution ICO Plugin & Favicon Generator for Zapwebp</h3>
  <p>Read, parse, and write multi-size ICO/CUR containers with 100% alpha preservation and complete web favicon suites.</p>
</div>

---

## Features

- **Multi-Resolution ICO Containers**: Embeds standard icon sizes (`16×16`, `32×32`, `48×48`, `64×64`, `128×128`, `256×256`) into a single container.
- **Universal Decoding**: Parses both modern PNG-compressed ICO entries and legacy Windows BMP DIBs (32-bit ARGB, 24-bit BGR, 8/4/1-bit palletized with 1-bit AND masks).
- **Deterministic Transparency**: Guarantees crisp alpha channels across all resolutions without black background discoloration.
- **Favicon Suite Generator**: Automatically produces `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`, and HTML `<head>` tags from a single SVG or PNG.
- **Standalone CLI**: Ships `zapwebp-favicon` for immediate terminal execution and CI asset pipelines.
- **Agentic Manifest**: Full `agent.json` and TypeScript typings for AI agent tool calling and discovery.

---

## Installation

```bash
npm install @zapwebp/format-ico
# or
pnpm add @zapwebp/format-ico
```

---

## Quick Start (Core Integration)

Register the handler with `@zapwebp/core` to unlock `.ico` input detection and output encoding:

```javascript
import { registerFormat, convertImage } from "@zapwebp/core";
import { icoHandler } from "@zapwebp/format-ico";

// 1. Register the format handler
registerFormat(icoHandler);

// 2. Convert SVG/PNG to multi-size ICO
const icoBuffer = await convertImage(svgBuffer, {
  to: "ico",
  sizes: [16, 32, 48, 256],
});

// 3. Convert existing ICO to modern WebP
const webpBuffer = await convertImage(icoBuffer, {
  to: "webp",
  quality: 90,
});
```

---

## Favicon Suite Generator

Generate a complete production web favicon package from a single high-resolution image:

```javascript
import { generateFaviconSuite } from "@zapwebp/format-ico";

const suite = await generateFaviconSuite("./logo.svg", {
  name: "My Web Application",
  shortName: "MyApp",
  themeColor: "#10b981",
  backgroundColor: "#ffffff",
  prefix: "/",
});

console.log(suite.files["favicon.ico"]); // Multi-size ICO buffer
console.log(suite.files["apple-touch-icon.png"]); // 180x180 PNG
console.log(suite.files["icon-192.png"]); // 192x192 PWA PNG
console.log(suite.files["icon-512.png"]); // 512x512 PWA Splash PNG
console.log(suite.files["site.webmanifest"]); // W3C JSON manifest string
console.log(suite.html); // Ready-to-use HTML tags
```

---

## Standalone CLI: `zapwebp-favicon`

Generate all favicon assets in one command:

```bash
npx zapwebp-favicon logo.svg -o ./public --name "My Project" --theme-color "#10b981"
```

CLI Options:

- `-o, --out <dir>`: Output directory (default: `./favicon-dist`).
- `-n, --name <name>`: Application name for `site.webmanifest`.
- `-s, --short-name <name>`: Short application name.
- `-t, --theme-color <hex>`: Theme color hex code (default: `#000000`).
- `-b, --background-color <hex>`: Splash background color (default: `#ffffff`).
- `--sizes <list>`: Comma-separated sizes for `.ico` container (default: `16,32,48,64,128,256`).
- `--prefix <path>`: URL prefix for tags and manifest (default: `/`).
- `--html-file`: Writes tags to `<out>/favicon-tags.html`.
- `--json`: Emits machine-readable JSON for CI and scripts.

---

## Direct Container Inspection

```javascript
import { parseIco, decodeIco } from "@zapwebp/format-ico";

// Inspect container structure
const info = parseIco(icoBuffer);
console.log(`Contains ${info.count} icons:`);
for (const entry of info.entries) {
  console.log(
    ` - ${entry.width}x${entry.height} (${entry.format}, ${entry.bitCount}bpp)`,
  );
}

// Extract specific resolution
const raw32 = await decodeIco(icoBuffer, { size: 32 });
```

---

## License

MIT © [Eldrex Delos Reyes Bula](https://github.com/Zapwebp)
