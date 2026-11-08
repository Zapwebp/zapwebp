# Mga Karaniwang Tanong (FAQ)

Covers: mga madalas na katanungan tungkol sa mga pangalan ng package, mga 404 error sa npm at npx, mga alerto ng Socket.dev sa dependencies, pagpapatakbo sa VS Code extension, pag-iingat sa alpha transparency, pag-sanitize ng SVG, at pag-configure ng MCP agent.

Does not cover: pag-compile ng native C at Rust binaries o pagsasaayos ng sariling cloud server.

Applies to: lahat ng surface ng Zapwebp (Web, CLI, MCP, VS Code, Laravel, Vite, Next.js, at SDKs).

## Quick start

```bash
# Direktang patakbuhin ang MCP server para sa mga AI agent
npx -y @zapwebp/mcp

# Mag-convert ng imahe gamit ang CLI
npx zapwebp logo.svg --to webp

# Suriin ang estado ng kalusugan ng environment
npx zapwebp doctor
```

Ang mga command na ito ay agad na nagpapatakbo nang walang kinakailangang global installation.

## What it does

Ang dokumentong ito ay sumasagot sa mga praktikal na katanungan at alalahanin tungkol sa arkitektura, seguridad, tamang pangalan ng mga package sa registry, at pagresolba sa mga karaniwang isyu sa buong Zapwebp ecosystem.

---

## Mga Karaniwang Katanungan

### Pangalan ng package at pag-install

#### Bakit nagbabalik ng 404 Not Found ang `npx zapwebp-mcp` o `npm install zapwebp-mcp`?

Ang opisyal na package ng Model Context Protocol ay nakapaloob sa scoped organization namespace na **`@zapwebp/mcp`**, hindi sa payak na pangalang `zapwebp-mcp`.

Gamitin ang sumusunod na mga command:

```bash
# Gamit ang npx
npx -y @zapwebp/mcp

# Gamit ang pnpm
pnpm dlx @zapwebp/mcp

# Pag-install sa lokal na proyekto
npm install -D @zapwebp/mcp
```

Talahanayan ng mga opisyal na package identifier:

| Produkto / Kakayahan | Registry at Scope | Opisyal na Identifier | Command / Paggamit |
|---|---|---|---|
| **CLI (Unscoped)** | npm | `zapwebp` | `npx zapwebp <file>` |
| **CLI (Scoped)** | npm | `@zapwebp/cli` | `pnpm dlx @zapwebp/cli` |
| **MCP AI Server** | npm | `@zapwebp/mcp` | `npx -y @zapwebp/mcp` |
| **Core Engine** | npm | `@zapwebp/core` | `npm install @zapwebp/core` |
| **UI Kit & Store** | npm | `@zapwebp/ui` | `npm install @zapwebp/ui` |
| **VS Code Extension** | Open VSX | `ebula.zapwebp-vscode` | `ovsx install ebula.zapwebp-vscode` |
| **Laravel Package** | Packagist | `zapwebp/laravel` | `composer require zapwebp/laravel` |
| **Vite Plugin** | npm | `zapwebp-vite` | `npm install -D zapwebp-vite` |
| **Next.js Plugin** | npm | `zapwebp-next` | `npm install -D zapwebp-next` |
| **Storage Adapters** | npm | `@zapwebp/storage` | `npm install @zapwebp/storage` |
| **Lens Inspector** | npm | `zapwebp-lens` | `npx zapwebp-lens inspect <file>` |
| **Crop Transform** | npm | `@zapwebp/crop` | `npm install @zapwebp/crop` |
| **SDK Client** | npm | `@zapwebp/sdk` | `npm install @zapwebp/sdk` |

---

### Mga scanner ng seguridad at Socket.dev alerts

#### Bakit nagpapakita ang Socket.dev ng "High CVE" sa mga lumang bersyon?

Ang mga naunang bersyon ay gumamit ng mas lumang bersyon ng `sharp` (`0.33.5`) na may mga kahinaan sa C libraries (`libvips` at `libheif`).

Sa kasalukuyang bersyon, ang `sharp` ay naka-lock sa **`^0.35.5`**, na nag-aalis sa lahat ng kilalang CVE. Kinukumpirma ng `pnpm audit` na mayroong **0 vulnerabilities**. Lumalabas lamang ang alerto sa Socket.dev kapag sinusuri ang lumang version URL bago ito muling ma-crawl.

#### Bakit may babala na "Unstable ownership"?

Ito ay isang awtomatikong heuristic flag ng supply-chain scanner para sa mga bagong gawang npm scope (`@zapwebp`) o bagong publisher account. Hindi ito senyales ng malisyosong code, kundi paalala lamang sa edad ng account.

#### Bakit may flag na "Shell access" at "Install scripts"?

Kinakailangan ng image processing ang precompiled native binaries para sa iba't ibang operating system (Windows, macOS, Linux). Ang mga package tulad ng `@img/sharp-*` at `@resvg/resvg-js-*` ay nagda-download ng tamang binary sa panahon ng `npm install` upang maiwasan ang pangangailangang mag-compile ng C++ at Rust code sa makina ng user. Walang sariling telemetry o kakaibang shell scripts ang Zapwebp.

#### Nangongolekta ba ng datos o telemetry ang Zapwebp?

**Hindi kailanman.** Mahigpit na ipinagbabawal ng Rule 6 ng Operating Contract ang telemetry. Walang tracking beacons, walang panlabas na network calls, at 100% lokal sa memorya o disk ang pagpoproseso ng mga imahe.

---

### Pag-troubleshoot sa VS Code Extension

#### Bakit lumabas ang: `'zap.cmd' is not recognized as an internal or external command`?

Sa mga naunang bersyon ng extension, tinangkang tawagin ang `zap.cmd` sa pamamagitan ng Windows command prompt sa pag-aakalang naka-install ito nang global sa `PATH`.

Simula sa bersyon `1.2.0`, pinalitan ito ng 3-tier execution model:
1. **Tier 1 (In-Process)**: Direktang conversion gamit ang WASM/native bindings sa memorya.
2. **Tier 2 (Bundled Node Runner)**: Awtomatikong hinahanap ang `node.exe` ng system at pinatatakbo ang kasamang `dist/zap.js` script nang direkta, kaya hindi na kailangan ang global `.cmd` wrapper.
3. **Tier 3 (Subprocess Fallback)**: Pagtawag sa `npx --yes zapwebp` kung kinakailangan.

Upang ayusin: i-update ang extension sa bersyon **v1.2.0** o mas bago, at patakbuhin ang `Developer: Reload Window` sa Command Palette.

---

### Preserbasyon ng Alpha at Transparency

#### Bakit nagtatapon ng `E_ALPHA_NOT_REPRESENTABLE` kapag nagko-convert sa JPEG?

Ang JPEG format ay walang alpha channel. Karaniwang ginagawa ng ibang tool ang paglalagay ng itim na background (RGB 0,0,0) sa mga transparent na pixel ("black background bug").

Upang maiwasan ang pagkasira ng imahe, hindi tahimik na tinatanggal ng Zapwebp ang alpha. Humihingi ito ng tahasang kulay ng background (hal. `--background "#ffffff"`). Kung nais panatilihin ang transparency, gamitin ang **WebP**, **AVIF**, o **PNG**.

---

### Kaligtasan sa SVG (`E_UNSAFE_SVG`)

#### Bakit tinatanggihan ang aking SVG ng `E_UNSAFE_SVG`?

Ang mga SVG ay XML documents na maaaring maglaman ng JavaScript (`<script>`, `onload`), XML External Entities (XXE), o panlabas na mga link. Hinaharang ng Zapwebp ang anumang aktibong script bago ito i-render upang maprotektahan ang system mula sa SSRF at data exfiltration.

Solusyon: Linisin ang SVG gamit ang SVGO o alisin ang mga script bago mag-convert.

---

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | Naglalaman ang SVG ng scripts o mapanganib na mga tag | Alisin ang `<script>` at event handlers bago mag-convert |
| `E_ALPHA_NOT_REPRESENTABLE` | Pagtangkang i-convert ang transparent na imahe sa JPEG nang walang background | Maglagay ng `--background <kulay>` o gumamit ng WebP/AVIF |
| `E_UPLOADER_REQUIRED` | Tinawag ang `createZapStore().upload()` nang walang uploader function | Magbigay ng aktibong conversion handler sa configuration |
| `E_CONVERSION_FAILED` | Nagkaroon ng error sa ilalim na conversion process | Tiyaking hindi corrupt ang file o patakbuhin ang `zap doctor` |
| `E_SSRF_BLOCKED` | Tinangkang mag-access ng pribadong network o localhost IP | Gumamit ng pampublikong HTTPS URL |
| `path_outside_root` | Ang path ng file ay nasa labas ng pinapayagang folder | Panatilihin ang mga file sa loob ng workspace directory |

## For agents

```json
{
  "faqCatalog": {
    "officialPackages": {
      "mcp": "@zapwebp/mcp",
      "cli": "zapwebp",
      "core": "@zapwebp/core",
      "vscode": "ebula.zapwebp-vscode",
      "laravel": "zapwebp/laravel",
      "vite": "zapwebp-vite",
      "next": "zapwebp-next"
    },
    "securityInvariants": {
      "telemetry": false,
      "cveStatus": "clean",
      "sharpVersion": "^0.35.5",
      "maxDimension": 4096,
      "maxPixels": 16777216
    },
    "alphaPolicy": {
      "silentDropForbidden": true,
      "jpegRequiresBackground": true,
      "defaultBackground": "transparent"
    },
    "mcpRunner": "npx -y @zapwebp/mcp"
  }
}
```

## Related

- [Overview](/docs): Pangkalahatang-ideya ng plataporma.
- [Safety](/safety): Patakaran sa seguridad at proteksyon.
- [Errors](/errors): Kumpletong listahan ng mga structured error code.
- [Formats](/formats): Mga suportadong format ng imahe.
- [CLI](/cli): Gabay sa paggamit ng terminal executable.
- [MCP Agent](/mcp): Pagsasaayos ng Model Context Protocol.
- [VS Code Extension](/plugins/vscode): Paggamit ng extension sa editor.

