# Mga Karaniwang Tanong (FAQ)

Covers: mga madalas na katanungan tungkol sa mga pangalan ng package, mga 404 error sa npm at npx, mga alerto ng Socket.dev sa dependencies, pagpapatakbo sa VS Code extension, pag-iingat sa alpha transparency, pag-sanitize ng SVG, pag-configure ng MCP agent, configurable batch limits, orihinal na pagbura ng file, favicon suite generation, byte target compression, conversion locking, at documentation delivery engine.

Does not cover: pag-compile ng native C at Rust binaries o pagsasaayos ng sariling cloud server.

Applies to: lahat ng surface ng Zapwebp (Web, CLI, MCP, VS Code, Laravel, Vite, Next.js, at SDKs) v2.28.0 at mas bago.

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
| **VS Code Extension** | Open VSX / Marketplace | `ebula.zapwebp-vscode` | `ovsx install ebula.zapwebp-vscode` |
| **Laravel Package** | Packagist | `zapwebp/laravel` | `composer require zapwebp/laravel` |
| **Vite Plugin** | npm | `zapwebp-vite` | `npm install -D zapwebp-vite` |
| **Next.js Plugin** | npm | `zapwebp-next` | `npm install -D zapwebp-next` |
| **GitHub Action** | GitHub Marketplace | `zapwebp-github-action` | `uses: zapwebp/zapwebp-github-action@v1` |
| **Storage Adapters** | npm | `@zapwebp/storage` | `npm install @zapwebp/storage` |
| **Lens Inspector** | npm | `zapwebp-lens` | `npx zapwebp-lens inspect <file>` |
| **Crop Transform** | npm | `@zapwebp/crop` | `npm install @zapwebp/crop` |
| **ICO / Favicon Plugin** | npm | `@zapwebp/format-ico` | `npm install @zapwebp/format-ico` |
| **Compressor Plugin** | npm | `@zapwebp/compressor` | `npm install @zapwebp/compressor` |
| **Lock Plugin** | npm | `@zapwebp/lock` | `npm install @zapwebp/lock` |
| **Docs Delivery Engine** | npm | `@zapwebp/docs` | `npm install @zapwebp/docs` |
| **Plugin Scaffolder** | npm | `create-zapwebp` | `pnpm create zapwebp` |
| **Edge SDK** | npm | `@zapwebp/edge` | `npm install @zapwebp/edge` |
| **Plugin SDK** | npm | `@zapwebp/plugin-sdk` | `npm install @zapwebp/plugin-sdk` |
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

**Hindi kailanman.** Mahigpit na ipinagbabawal ng Rule 3 ng Operating Contract ang telemetry. Walang tracking beacons, walang panlabas na network calls, at 100% lokal sa memorya o disk ang pagpoproseso ng mga imahe.

---

### Pag-troubleshoot sa VS Code Extension

#### Bakit lumabas ang: `'zap.cmd' is not recognized as an internal or external command`?

Sa mga naunang bersyon ng extension, tinangkang tawagin ang `zap.cmd` sa pamamagitan ng Windows command prompt sa pag-aakalang naka-install ito nang global sa `PATH`.

Simula sa bersyon `1.2.0+`, pinalitan ito ng 3-tier execution model:
1. **Tier 1 (In-Process)**: Direktang conversion gamit ang WASM/native bindings sa memorya.
2. **Tier 2 (Bundled Node Runner)**: Awtomatikong hinahanap ang `node.exe` ng system at pinatatakbo ang kasamang `dist/zap.js` script nang direkta, kaya hindi na kailangan ang global `.cmd` wrapper.
3. **Tier 3 (Subprocess Fallback)**: Pagtawag sa `npx --yes zapwebp` kung kinakailangan.

Upang ayusin: i-update ang extension sa bersyon **v1.3.0** o mas bago, at patakbuhin ang `Developer: Reload Window` sa Command Palette.

---

### Preserbasyon ng Alpha at Transparency

#### Bakit nagtatapon ng `E_ALPHA_NOT_REPRESENTABLE` kapag nagko-convert sa JPEG?

Ang JPEG format ay walang alpha channel. Karaniwang ginagawa ng ibang tool ang paglalagay ng itim na background (RGB 0,0,0) sa mga transparent na pixel ("black background bug").

Upang maiwasan ang pagkasira ng imahe, hindi tahimik na tinatanggal ng Zapwebp ang alpha. Humihingi ito ng tahasang kulay ng background (hal. `--background "#ffffff"`). Kung nais panatilihin ang transparency, gamitin ang **WebP**, **AVIF**, o **PNG**.

---

### Configurable batch limits at session controls

#### Bakit nabigo ang batch conversion gamit ang `E_TOO_MANY_FILES` o `E_SESSION_LIMIT_EXCEEDED`?

Simula v2.28.0, nagpapatupad ang Zapwebp ng standard limits upang maprotektahan ang mga resource:
- **`E_TOO_MANY_FILES`**: Lumagpas ang batch sa `maxFilesPerRequest` (default 20 files). Ipasa ang `--max-files <n>` o `--unlimited` sa CLI.
- **`E_SESSION_LIMIT_EXCEEDED`**: Naabot ang rolling session ceiling (`maxFilesPerSession`, default 100 files). Sa CLI, patakbuhin ang `zap --reset-session` upang i-reset ang counter sa `.zapwebp/session.json`.

---

### File deletion at garantiyang zero-data-loss

#### Binubura ba ng Zapwebp ang orihinal na file pagkatapos mag-convert?

**Hindi bilang default.** Protektado ang iyong mga orihinal na asset:
- Naka-off ang deletion bilang default sa lahat ng surface (`allowDeleteOriginal: false`).
- Nagaganap lamang ang pagbura kapag tahasang ipinasa ang `--delete-original` sa CLI o pinili sa VS Code.
- Bago burahin, gumagawa ang Zapwebp ng cryptographic backup sa `.zapwebp/backups/{timestamp}/{filepath}` at tinitiyak ang SHA-256 hash nito.
- Maaaring ibalik ang anumang naburang file anumang oras gamit ang `zap undo` o `undo_last` tool sa MCP.

---

### Mga Favicon at Size Reduction

#### Paano gumawa ng multi-size ICO files at favicons?

I-install ang `@zapwebp/format-ico` at ipasa ang `--to ico`:
```bash
npx zapwebp logo.svg --to ico
```
Para sa buong favicon suite (`favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`):
```bash
npx zapwebp logo.svg --favicon
```

#### Paano i-compress ang imahe sa isang tiyak na sukat sa bytes?

I-install ang `@zapwebp/compressor` at ipasa ang `--target-bytes`:
```bash
npx zapwebp hero.png --to webp --target-bytes 250000
```
Isinasagawa ng Zapwebp ang binary search quality optimization at adaptive Lanczos3 downscaling upang maabot ang target size.

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
| `E_TOO_MANY_FILES` | Lumagpas ang bilang ng file sa batch ceiling | Bawasan ang file o ipasa ang `--max-files` / `--unlimited` |
| `E_SESSION_LIMIT_EXCEEDED` | Naabot ang limitasyon ng session | I-reset ang session gamit ang `zap --reset-session` |
| `E_UPLOADER_REQUIRED` | Tinawag ang `createZapStore().upload()` nang walang uploader function | Magbigay ng aktibong conversion handler sa configuration |
| `E_CONVERSION_FAILED` | Nagkaroon ng error sa ilalim na conversion process | Tiyaking hindi corrupt ang file o patakbuhin ang `zap doctor` |
| `E_SSRF_BLOCKED` | Tinangkang mag-access ng pribadong network o localhost IP | Gumamit ng pampublikong HTTPS URL |
| `E_PATH_TRAVERSAL` | Ang path ng file ay nasa labas ng pinapayagang folder | Panatilihin ang mga file sa loob ng workspace directory |

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
      "next": "zapwebp-next",
      "formatIco": "@zapwebp/format-ico",
      "compressor": "@zapwebp/compressor",
      "lock": "@zapwebp/lock",
      "docs": "@zapwebp/docs",
      "scaffolder": "create-zapwebp",
      "edge": "@zapwebp/edge"
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
- [Limits](/limits): Mga limitasyon sa bilang ng file at concurrency.
- [Deletion](/deletion): Orihinal na pagbura ng file at mga backup.
- [VS Code Extension](/plugins/vscode): Paggamit ng extension sa editor.
