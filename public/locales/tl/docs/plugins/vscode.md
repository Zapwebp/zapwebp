# VS Code Extension

Covers: opisyal na VS Code extension sa Open VSX Registry at Visual Studio Marketplace: context-aware "Zap" menu na may magic byte format detection, pag-alala sa preference ng gumagamit, conversion nang direkta sa editor, conversion ng buong folder gamit ang mixed formats panel, retina multipliers (@1x/@2x/@3x), multi-resolution Windows icon at cursor containers (.ico/.cur) generation at extraction, Target Lock enforcement, compressor target size optimization, aspect ratio cropping, at 100% lokal na pagpapatakbo.

Does not cover: terminal CLI operations, MCP server stdio pipelines, o build-tool bundlers. Tingnan ang [CLI](/cli) o [MCP Agent](/mcp).

Applies to: Zapwebp VS Code Extension v1.4.0 at mas bago, VS Code 1.85+.

## Quick start

I-install mula sa iyong nais na registry:
- **[I-download sa Open VSX](https://open-vsx.org/extension/ebula/zapwebp-vscode)** (VSCodium, Cursor, Windsurf, Gitpod)
- **[I-download sa Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode)** (VS Code)

1. Buksan ang Extensions view ng editor (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Hanapin ang **`zapwebp`**.
3. I-click ang **Install**.
4. Sa Explorer o tab ng editor, i-right-click ang anumang imahe (`.svg`, `.png`, `.jpg`, `.webp`, `.avif`, `.gif`, `.tiff`, `.heic`, `.ico`, `.cur`) at piliin ang **Zap**.
5. Pumili ng target format mula sa QuickPick menu. Kusang lilitaw ang multipliers (@1x, @2x, @3x) para sa SVG vectors.
6. Para sa icon files, piliin ang **Zap to ICO** upang pumili ng suite ng mga laki (16x16 hanggang 256x256). Para sa `.ico` o `.cur` files, piliin kung kukunin ang pinakamalaking frame, lahat ng frames, o partikular na sukat.
7. Para sa limitadong laki ng file, piliin ang **Zap to specific size...** at ilagay ang threshold (hal. `500 KB`).

Lilitaw agad ang na-convert na file sa tabi ng orihinal na asset nang pinapanatili ang transparency at inaalis ang metadata.

## What it does

- **Context-Aware "Zap" Command**: Sinusuri ang tunay na format ng imahe gamit ang magic bytes at ipinapakita lamang ang mga angkop na target format para sa source file.
- **ICO & CUR Container Engine**: Buong suporta sa paggawa at pagkuha ng Windows icon at cursor containers gamit ang `@zapwebp/format-ico`. Mag-convert sa multi-resolution `.ico` bundles (`16x16` hanggang `256x256`), o mag-extract ng mga indibidwal na frames diretso sa PNG o WebP.
- **Target Lock Policy Enforcement**: Kusang binabasa ang `.zapwebp/config.json` sa workspace root. Ipinapatupad ang napagkasunduang format ng koponan, binabalaan ang mga hindi awtorisadong format gamit ang `E_FORMAT_REJECTED`, at nagpapakita ng badge sa status bar (hal. `⚡ Zapwebp: WebP lock active`).
- **Target-Size Compressor**: Tinitiyak na hindi lalampas ang file sa tinukoy na byte limit gamit ang `@zapwebp/compressor`. Gumagamit ng binary search quality optimization at adaptive Lanczos3 downscaling.
- **Crop & Aspect Ratio Controls**: Mabilis na pag-crop sa karaniwang aspect ratio (`1:1` avatar, `16:9` hero, `4:3`, `3:2`) direkta mula sa context menu sa tulong ng `@zapwebp/crop`.
- **Idempotent Conversion Lock**: Sinusuri kung na-convert na ang file gamit ang parehong options upang maiwasan ang paulit-ulit na conversion habang pinapayagan ang sinasadyang pagbabago ng format.
- **Preference Memory**: Naaalala ang iyong paboritong target format at inuuna ito sa menu bilang `★ Last used`.
- **Batch at Folder Conversion**: I-convert ang maramihang napiling files o buong folder gamit ang interactive panel kung saan maaaring i-configure ang bawat format.
- **100% Lokal na Pagpapatakbo**: Walang ipinapadalang data sa internet; ligtas para sa pribado at air-gapped na kapaligiran.
- **Ligtas na Pagbura (Opsyonal)**: Kung naka-on ang `zapwebp.deleteOriginal`, ligtas na iniimbak ang orihinal sa `.zapwebp/backups/` na maaaring i-undo gamit ang `zapwebp.undo`.

## Commands

| Command | Identifier | Deskripsyon |
|---|---|---|
| `Zap` | `zapwebp.zap` | Context-aware na conversion na may format sniffing at preference memory. |
| `Zap Folder` | `zapwebp.zapFolder` | Nag-i-scan at nagko-convert ng lahat ng imahe sa napiling folder. |
| `Zap Folder (Configure Formats)` | `zapwebp.zapPanel` | Binubuksan ang interactive panel para magtakda ng target format bawat uri. |
| `Zap to WebP` | `zapwebp.convert` | Kino-convert ang mga napiling file sa WebP habang pinapanatili ang alpha. |
| `Zap to PNG` | `zapwebp.convertToPng` | Direktang pag-convert sa lossless PNG. |
| `Zap to AVIF` | `zapwebp.convertToAvif` | Direktang pag-convert sa next-gen AVIF. |
| `Zap to JPEG` | `zapwebp.convertToJpeg` | Pag-convert sa JPEG na may opsyonal na background color. |
| `Zap to ICO` | `zapwebp.convertToIco` | Gumagawa ng multi-resolution Windows icon container. |
| `Zap to specific size...` | `zapwebp.convertCompress` | Tinitiyak na ang output ay nasa ilalim ng itinakdang byte limit. |
| `Zap with options...` | `zapwebp.convertWithOptions` | Interactive na conversion na may aspect ratio crop at dimensions. |
| `Zap to WebP (@1x, @2x, @3x)` | `zapwebp.convertScales` | Gumagawa ng `@1x`, `@2x`, at `@3x` retina density variants. |
| `Zapwebp: Undo Last Conversion` | `zapwebp.undo` | Ibabalik ang mga orihinal na file mula sa `.zapwebp/backups/`. |

## Settings

| Setting | Uri | Default | Deskripsyon |
|---|---|---|---|
| `zapwebp.rememberLastChoice` | boolean | `true` | Tandaan ang huling ginamit na format bawat uri ng file. |
| `zapwebp.showMultipliersForPng` | boolean | `false` | Ipakita ang retina multipliers para sa PNG raster sources. |
| `zapwebp.defaultTargets` | object | `{ "svg": "webp", "png": "webp", "ico": "png", "cur": "ico", ... }` | Default na target format bawat source extension. |
| `zapwebp.icoPreset` | string | `"default"` | Default size preset para sa ICO generation (`default`, `minimal`, `favicon`, `app`). |
| `zapwebp.compressorEnabled` | boolean | `true` | Paganahin ang target-size compression commands sa menu. |
| `zapwebp.targetLockEnabled` | boolean | `true` | Ipatupad ang Target Lock mula sa `.zapwebp/config.json`. |
| `zapwebp.deleteOriginal` | boolean | `false` | Burahin ang orihinal na file pagkatapos ng conversion at i-backup sa `.zapwebp/backups/`. |
| `zapwebp.convertOnSave` | boolean | `false` | Kusang mag-convert kapag na-save ang imahe sa editor. |
| `zapwebp.baseWidth` | number | `512` | Batayang lapad sa pixels para sa 1x multiplier. |
| `zapwebp.quality` | number | `85` | Antas ng compression quality (1–100). |
| `zapwebp.clean` | boolean | `true` | Tanggalin ang EXIF, GPS, at C2PA metadata blocks. |
| `zapwebp.outputExtension` | string | `"webp"` | Target format extension (`webp`, `avif`, `png`, `jpeg`, `ico`). |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | Mayroong `<script>` tags o hindi ligtas na elemento ang SVG. | Linisin ang SVG bago i-convert. |
| `E_ALPHA_NOT_REPRESENTABLE` | Kino-convert ang transparent na imahe sa JPEG nang walang background color. | Lumipat sa `webp` o `png`, o magbigay ng background color. |
| `E_FORMAT_REJECTED` | Tinanggihan ang format ng workspace Target Lock sa `.zapwebp/config.json`. | Pumili ng pinapayagang format o i-update ang configuration. |
| `E_TARGET_UNREACHABLE` | Hindi kayang ipasok ang imahe sa itinakdang laki kahit binabaan ang kalidad at sukat. | Lakihan ang target bytes o payagan ang karagdagang downscaling. |
| `E_CONVERSION_FAILED` | Nagkaroon ng aberya sa loob ng conversion pipeline. | Suriin ang output tab para sa mga detalyeng teknikal. |

## Related

- [CLI](/cli) — Command-line interface para sa terminal workflows.
- [MCP Agent](/mcp) — Model Context Protocol para sa AI coding assistants.
- [Format ICO](/plugins/format-ico) — Plugin para sa multi-size ICO/CUR formats.
- [Compressor](/plugins/compressor) — Size at quality reduction optimizer.
- [Crop](/plugins/crop) — Aspect ratio at smart cropping plugin.
- [Lock](/plugins/lock) — Cryptographic fingerprinting at conversion skip engine.

## For agents

```json
{
  "pkg": "zapwebp-vscode",
  "version": "1.4.0",
  "publisher": "ebula",
  "marketplace": "https://marketplace.visualstudio.com/items?itemName=ebula.zapwebp-vscode",
  "registry": "https://open-vsx.org/extension/ebula/zapwebp-vscode",
  "canonicalUrl": "https://zapwebp.vercel.app/plugins/vscode",
  "docs": "https://zapwebp-docs.vercel.app/plugins/vscode",
  "features": [
    "contextAwareZap",
    "magicByteSniffing",
    "preferenceMemory",
    "mixedMultiSelect",
    "folderConversion",
    "mixedFormatsPanel",
    "subfolderOptIn",
    "contextMenu",
    "retinaMultipliers",
    "localExecution",
    "icoSupport",
    "curSupport",
    "targetLock",
    "compressor",
    "cropIntegration",
    "lockSkip",
    "undoBackup"
  ]
}
```
