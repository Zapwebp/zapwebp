'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const TL_DOCS_DIR = path.join(ROOT_DIR, 'locales', 'tl', 'docs');

const translations = {
  'index.md': `# Zapwebp

Covers: pangkalahatang-ideya ng pag-convert ng imahe gamit ang Zapwebp, mga sinusuportahang platform (web, CLI, MCP, API), pangunahing mga prinsipyo, at mabilisang oryentasyon.

Does not cover: detalyadong mga flag ng command-line, mga schema ng MCP protocol, o mga detalye ng routing sa REST API. Tingnan ang [CLI](/cli) at [MCP](/mcp).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp logo.svg --to webp
\`\`\`

Kino-convert ang \`logo.svg\` patungo sa transparent na \`logo.webp\` sa kasalukuyang folder.

## What it does

Kino-convert ng Zapwebp ang SVG at mga karaniwang raster na imahe patungong WebP, PNG, JPEG, at AVIF habang pinapanatili ang transparent na alpha channel. Gumagana ito nang lokal sa pamamagitan ng terminal, mga extension sa editor, at Model Context Protocol para sa AI, o direkta sa memorya sa web application nang walang remote storage.

## Surfaces

| Platform | Interface | Pangunahing command o URL | Ano ang ibinibigay nito |
|---|---|---|---|
| Web App | Browser | \`https://zapwebp.vercel.app/\` | Drag-and-drop na agarang conversion at maramihang pag-download gamit ang ZIP |
| CLI | Terminal | \`npx zapwebp <file>\` | Lokal na file, glob, watch daemon, at mga CI check |
| MCP Server | Stdio | \`npx zapwebp-mcp\` | Mga tool sa pag-convert at pag-optimize ng imahe para sa mga AI coding agent |
| HTTP API | REST | \`POST /api/v1/convert\` | Stateless na mga endpoint para sa pag-convert ng imahe |

## Examples

### Check image and convert to WebP

\`\`\`bash
$ npx zapwebp logo.svg --to webp
✓ logo.svg → logo.webp (2418 bytes)
\`\`\`

### Inspect image metadata

\`\`\`bash
$ npx zapwebp-mcp
{"result":{"serverInfo":{"name":"zapwebp","version":"1.1.0"}},"jsonrpc":"2.0","id":1}
\`\`\`

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`unsupported_format\` | Hindi suportado ang format ng ibinigay na file | Magbigay ng SVG, PNG, JPEG, WebP, AVIF, GIF, o TIFF na file |
| \`alpha_not_representable\` | Pag-convert ng transparent na imahe patungong JPEG nang walang kulay ng likuran | Magpasa ng \`--background "#ffffff"\` o pumili ng WebP, PNG, o AVIF |
| \`file_too_large\` | Lumampas ang file sa pinakamataas na pinapayagang laki | Bawasan ang sukat ng imahe o mag-upload ng mas maliit na asset |

## For agents

\`\`\`json
{
  "tool": "zapwebp",
  "surfaces": ["cli", "mcp", "api", "web"],
  "inputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputs": ["webp", "png", "jpeg", "avif"],
  "guarantees": {
    "alphaPreservation": true,
    "statelessExecution": true,
    "metadataStripped": true
  }
}
\`\`\`

## Related

- [Convert](/convert): Mag-drop ng mga file sa browser at agad makuha ang WebP.
- [CLI](/cli): Magpatakbo ng mga conversion at maramihang operasyon mula sa command line.
`,

  'convert.md': `# Convert

Covers: pag-convert ng imahe sa web, daloy ng browser drag-and-drop, mga opsyon sa client-side, at mga format ng output.

Does not cover: mga operasyon sa command-line o integrasyon sa MCP. Tingnan ang [CLI](/cli) at [MCP](/mcp).

Applies to: Zapwebp web app v1.1.0 at mas bago.

## Quick start

\`\`\`bash
open https://zapwebp.vercel.app/
\`\`\`

I-drop ang SVG o raster na imahe sa dropzone upang agad mag-convert.

## What it does

Kino-convert ng web application ang mga imahe sa loob mismo ng browser window gamit ang in-memory na pagproseso. Pinoproseso ang mga file kapag hiniling nang walang intermediate disk caching, mga database, o pagsubaybay sa analytics, at awtomatikong pinapanatili ang aninag ng imahe.

## Options

| Kontrol | Uri | Default | Ano ang ginagawa nito |
|---|---|---|---|
| Dropzone | \`file\` | Walang laman | Tumatanggap ng isahan o maramihang mga imahe |
| Quality | \`integer\` | \`85\` | Antas ng compression mula 1 hanggang 100 |
| Width | \`integer\` | \`2048\` | Hangganan ng lapad ng raster (512, 1024, 2048, 4096) |
| Lossless | \`boolean\` | \`false\` | Pinapagana ang eksaktong pixel fidelity para sa WebP at AVIF |

## Examples

### Convert single SVG

\`\`\`bash
$ curl -F "svg=@icon.svg" https://zapwebp.vercel.app/api/v1/convert -o icon.webp
✓ Napanatili ang aninag at na-save ang icon.webp
\`\`\`

### Batch convert raster images

\`\`\`bash
$ curl -F "files=@a.png" -F "files=@b.jpg" https://zapwebp.vercel.app/api/v1/batch -o bundle.zip
✓ Na-download ang bundle.zip na naglalaman ng mga na-convert na file
\`\`\`

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`unsupported_format\` | Hindi suportado ang format ng file sa browser canvas | Gumamit ng PNG, JPEG, WebP, AVIF, GIF, o SVG |
| \`alpha_not_representable\` | Pag-export sa JPEG habang may aninag ang imahe | Pumili ng WebP, PNG, o magtakda ng kulay ng background |
| \`file_too_large\` | Lumampas ang file sa limitasyon ng browser memory | I-resize ang imahe bago i-upload |

## For agents

\`\`\`json
{
  "surface": "convert",
  "endpoint": "https://zapwebp.vercel.app/",
  "inputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputs": ["webp", "png", "jpeg", "avif"],
  "browserOnly": true
}
\`\`\`

## Related

- [Overview](/docs): Balangkas ng buong Zapwebp architecture.
- [Clean](/clean): Paano tinatanggal ang metadata sa web app bago i-export.
`,

  'cli.md': `# CLI

Covers: Zapwebp command-line interface, mga opsyon sa bandang terminal, batch conversions, responsive multipliers, undo/redo transactions, at pagsasama sa CI pipelines.

Does not cover: pagpapatakbo ng MCP server o direct web API endpoints. Tingnan ang [MCP](/mcp) at [REST API](/api).

Applies to: Zapwebp CLI v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp "src/icons/**/*.svg" --to webp --quality 90
\`\`\`

Kino-convert ang lahat ng katugmang SVG icons sa WebP na may kalidad na 90 habang pinapanatili ang aninag.

## What it does

Ang Zapwebp CLI ay isang command-line runner na nagbibigay-daan sa mga developer na mabilisang i-convert, i-optimize, at i-scale ang mga imahe sa terminal. Sinusuportahan nito ang atomikong pagsusulat, journalized undo/redo transactions, gitignore automation, at CI check modes.

## Commands

| Command | Deskripsyon |
|---|---|
| \`zap [paths...]\` | Mag-convert ng mga imahe batay sa mga ibinigay na path |
| \`zap init\` | Ihanda ang configuration, ignore rules, at .gitignore |
| \`zap watch\` | I-convert ang mga imahe habang may binabago sa directory |
| \`zap check\` | CI mode: mag-exit 1 kung may mga file na kailangan pang i-convert |
| \`zap undo\` | Ibalik sa dating anyo ang huling isinagawang conversion |
| \`zap redo\` | Muling ilapat ang huling na-undo na conversion |
| \`zap audit\` | Maglabas ng ulat sa kaligtasan at pagsusuri ng imahe nang hindi nagsusulat ng file |
| \`zap doctor\` | Suriin ang kalagayan ng sistema at mga dependency |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_UNSAFE_SVG\` | Naglalaman ang SVG ng script o panlabas na entity | Linisin ang SVG o gamitin ang \`--allow-unsafe\` |
| \`E_ALPHA_NOT_REPRESENTABLE\` | Pag-convert ng may-aninag na imahe sa JPEG nang walang background | Magpasa ng \`--background "#ffffff"\` o pumili ng WebP/PNG |
| \`E_DISK_FULL\` | Walang natitirang espasyo sa storage | Magbawas ng files at subukang muli |

## For agents

\`\`\`json
{
  "command": "zap",
  "package": "@zapwebp/cli",
  "flags": {
    "--to": "Target formats (webp, png, jpeg, avif)",
    "--quality": "Compression quality 0-100",
    "--scale": "Comma-separated multipliers",
    "--clean": "Strip metadata and AI provenance",
    "--check": "CI validation mode"
  }
}
\`\`\`

## Related

- [Clean](/clean): Pag-alis ng EXIF at metadata sa pamamagitan ng CLI.
- [Target Lock](/lock-target): Pagtatakda ng mahigpit na format ng output.
`,

  'clean.md': `# Clean

Covers: zero-trust metadata stripping, pag-alis ng EXIF, GPS coordinates, serial numbers ng camera, at pagpapatunay gamit ang Clean Certificate.

Does not cover: pag-resize ng dimensyon o kulay ng likuran. Tingnan ang [CLI](/cli) at [Backgrounds](/backgrounds).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp photo.jpg --clean --verify-clean
\`\`\`

Tinatanggal ang lahat ng metadata at naglalabas ng kumpirmasyon ng kalinisan ng file.

## What it does

Ang Clean mode ay nagpapatupad ng zero-trust metadata sanitization. Tinatanggal nito ang EXIF, XMP, IPTC, C2PA AI provenance manifests, GPS location tags, at mga custom private chunks sa mga container ng imahe upang protektahan ang privacy ng gumagamit.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_CLEAN_FAILED\` | May natirang metadata pagkatapos ng stripping | Suriin ang file gamit ang \`zap inspect\` |
| \`E_CORRUPT_CONTAINER\` | Naging unreadable ang container pagkatapos tanggalin ang chunks | Subukan ang ibang encoder o i-update ang plugin |

## For agents

\`\`\`json
{
  "feature": "clean",
  "default": true,
  "strippedChunks": ["exif", "xmp", "iptc", "c2pa", "gps"],
  "verification": "--verify-clean"
}
\`\`\`

## Related

- [Safety](/safety): Mga patakaran sa kaligtasan ng data at pag-iwas sa pagkawala ng aninag.
- [Privacy Policy](/privacy): Ang aming pangako sa zero telemetry at zero storage.
`,

  'lock-target.md': `# Target Lock (Many-to-One Conversion)

Covers: many-to-one ingestion architecture kung saan isang canonical target format lamang ang pinapayagan, strict vs best-effort mode, at edge gateway pipelines.

Does not cover: multi-format export bundling. Tingnan ang [CLI](/cli).

Applies to: Zapwebp v2.0.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp "uploads/*" --lock-target webp --strict
\`\`\`

Ipinapatupad na ang lahat ng mga papasok na asset ay maging WebP; mag-e-error kapag may file na hindi ma-convert.

## What it does

Tinitiyak ng Target Lock na ang lahat ng ibat-ibang uri ng input (SVG, PNG, JPEG, TIFF, GIF) ay mako-convert sa iisang pamantayang format ng storage, tulad ng WebP o AVIF. Sa ilalim ng \`strict: true\`, ang anumang hindi tugmang format ay ibinabagsak nang mabilis. Sa ilalim ng \`strict: false\`, ang mga hindi ma-convert na file ay pinapayagang dumaan nang walang pagbabago.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_TARGET_LOCKED\` | Tinangkang mag-request ng ibang format habang naka-lock ang target | Alisin ang kahilingan ng ibang format o gamitin ang \`--override-lock\` |
| \`E_UNSUPPORTED_FORMAT\` | Hindi ma-decode ang input file sa mahigpit na Target Lock mode | Mag-upload ng suportadong format ng imahe |

## For agents

\`\`\`json
{
  "contract": "target-lock",
  "modes": ["strict", "best-effort"],
  "targetFormat": "webp",
  "overrideFlag": "--override-lock"
}
\`\`\`

## Related

- [Backgrounds](/backgrounds): Paghawak sa aninag kapag naka-lock sa format na JPEG.
- [Storage Adapters](/plugins/storage): Integrasyon ng Target Lock sa Supabase at Firebase.
`,

  'backgrounds.md': `# Background Preservation & Flattening

Covers: tatlong deterministikong kalagayan ng background: transparent preservation, opaque respect, at deterministic flattening kapag nagko-convert sa mga format na walang alpha channel.

Does not cover: vector path simplification. Tingnan ang [Safety](/safety).

Applies to: Zapwebp v2.0.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp transparent-logo.png --to jpeg --background "#ffffff"
\`\`\`

Patagin ang transparent na PNG patungong JPEG na may puting kulay ng likuran upang maiwasan ang itim na background.

## What it does

Ang ImageMagick at iba pang karaniwang converter ay kilalang may depekto kung saan ang aninag ay nagiging itim na mga parihaba (black background bug). Tinitiyak ng Zapwebp na ang aninag ay laging napananatili kapag suportado ng target format, at mahigpit na humihingi ng kulay ng background kapag nagko-convert sa mga format na walang aninag tulad ng JPEG.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_ALPHA_NOT_REPRESENTABLE\` | Pag-convert ng may aninag na imahe sa JPEG nang walang background color | Magbigay ng kulay tulad ng \`--background "#ffffff"\` o pumili ng WebP/PNG |

## For agents

\`\`\`json
{
  "backgroundStates": {
    "transparent": "preserved in WebP, PNG, AVIF",
    "opaque": "preserved untouched",
    "flattened": "requires explicit background hex color"
  }
}
\`\`\`

## Related

- [Formats](/formats): Matrix ng transparency support sa bawat format.
- [Safety](/safety): Mga proteksyon laban sa pagkawala ng alpha channel.
`,

  'policy.md': `# Policy Engine

Covers: conversion policy enforcement, allowlists, denylists, limitasyon sa laki ng byte, at dimension gates.

Does not cover: UI component styling. Tingnan ang [UI Kit](/ui).

Applies to: Zapwebp v2.0.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp src/ --max-input-bytes 10485760 --allowed-formats svg,png,jpeg
\`\`\`

Ipatupad ang patakaran na 10 MB maximum input size at limitahan ang mga format sa SVG, PNG, at JPEG.

## What it does

Nagbibigay ang Policy Engine ng sentralisadong pamamahala sa kung anong mga format, dimensyon, at sukat ng file ang pinapayagang pumasok o lumabas sa sistema. Kapag may lumabag sa patakaran, agad itong ibinabagsak nang may malinaw na error code.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_FORMAT_REJECTED\` | Ang format ay wala sa pinapayagang listahan ng patakaran | Gamitin ang pinapayagang format ng imahe |
| \`E_INPUT_TOO_LARGE\` | Lumampas ang sukat ng file sa pinapayagang maximum | Paliitin ang file o i-adjust ang policy |

## For agents

\`\`\`json
{
  "engine": "policy",
  "checks": ["allowedFormats", "maxInputBytes", "maxOutputBytes", "dimensionLimit"],
  "enforcement": "fail-fast"
}
\`\`\`

## Related

- [Errors](/errors): Kumpletong listahan ng mga error code ng policy.
- [Safety](/safety): Mga panuntunan sa seguridad ng pipeline.
`,

  'formats.md': `# Formats

Covers: format registry ng Zapwebp, matrix ng alpha channel preservation sa bawat format, at pagsusuri ng container headers.

Does not cover: pag-edit ng pixels. Tingnan ang [Crop Plugin](/plugins/crop).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp --explain-formats
\`\`\`

Ipinapakita ang lahat ng kasalukuyang nakarehistrong input at output formats.

## What it does

Kinikilala ng Zapwebp ang mga format ng imahe batay sa magic bytes sa container header, hindi lamang sa file extension. Sinusuportahan nito ang SVG, PNG, JPEG, WebP, AVIF, GIF, at TIFF para sa input, at naglalabas ng WebP, PNG, JPEG, at AVIF.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_UNKNOWN_FORMAT\` | Hindi tugma ang header sa anumang kilalang imahe | Tiyaking buo at hindi sira ang file |
| \`E_UNSUPPORTED_CONVERSION\` | Hindi suportado ang hiniling na conversion pair | Sumangguni sa matrix ng suportadong formats |

## For agents

\`\`\`json
{
  "inputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputs": ["webp", "png", "jpeg", "avif"],
  "magicBytes": true
}
\`\`\`

## Related

- [Overview](/docs): Arkitektura ng image engine.
- [Safety](/safety): Paano pinoprotektahan ang container headers.
`,

  'safety.md': `# Safety

Covers: mga garantiyang panseguridad ng Zapwebp: pag-iwas sa XML External Entity (XXE) sa SVG, pagharang sa scripts, pagpigil sa SSRF, at proteksyon sa alpha channel.

Does not cover: pag-deploy ng web servers. Tingnan ang [Edge SDK](/sdk/edge).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp malicious.svg
\`\`\`

Awtomatikong sinusuri at hinaharang ang mga mapanganib na tag tulad ng \`<script>\` o \`<foreignObject>\`.

## What it does

Ang mga SVG file ay maaaring maglaman ng JavaScript, panlabas na mga link, at mga XML entity na maaaring magamit sa pag-atake. Sinusuri at nililinis ng Zapwebp ang mga SVG bago ito i-convert. Bukod dito, pinipigilan nito ang Server-Side Request Forgery (SSRF) sa pamamagitan ng pagharang sa mga private IP address kapag nagko-convert mula sa mga URL.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_UNSAFE_SVG\` | Naglalaman ang SVG ng scripts o mapanganib na tags | Alisin ang mga script bago mag-convert |
| \`E_SSRF_BLOCKED\` | Tinangkang mag-access ng pribadong network o localhost URL | Magbigay ng pampublikong HTTPS URL |

## For agents

\`\`\`json
{
  "safetyGates": ["xxeDefense", "scriptStripping", "ssrfBlocker", "alphaAssertion"],
  "default": "strict"
}
\`\`\`

## Related

- [Clean](/clean): Pagtanggal ng sensitibong metadata.
- [Errors](/errors): Mga structured error code at remedyo.
`,

  'errors.md': `# Errors

Covers: standardized machine-readable error catalog ng Zapwebp, mga paliwanag sa sanhi ng error, at kaukulang mga hakbang para sa pag-aayos.

Does not cover: third-party compiler errors.

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp --doctor
\`\`\`

Sinusuri ang kapaligiran at mga dependency upang matukoy ang mga posibleng sanhi ng error.

## What it does

Ang bawat error sa Zapwebp ay may natatanging error code (hal. \`E_UNSAFE_SVG\`, \`E_ALPHA_NOT_REPRESENTABLE\`) na sinamahan ng malinaw na sanhi at madaling maisagawang solusyon. Ito ay dinisenyo upang mapadali ang debugging ng mga developer at AI agents.

## Errors

| Code | Deskripsyon | Aksyon |
|---|---|---|
| \`E_UNSAFE_SVG\` | May mapanganib na script o tag ang SVG | Linisin ang markup o gamitin ang \`--allow-unsafe\` |
| \`E_ALPHA_NOT_REPRESENTABLE\` | Walang background color para sa JPEG | Magdagdag ng \`--background "#ffffff"\` |
| \`E_EMPTY_FILE\` | 0 bytes ang ibinigay na file | Tiyaking na-download nang buo ang file |
| \`E_PATH_TRAVERSAL\` | Lumabas sa workspace ang path | Gumamit ng path sa loob ng workspace |
| \`E_DISK_FULL\` | Puno ang disk ng device | Magbakante ng espasyo sa storage |

## For agents

\`\`\`json
{
  "catalog": "ZapwebpError",
  "fields": ["code", "message", "fix", "docs", "exitCode"],
  "format": "JSON-serializable"
}
\`\`\`

## Related

- [Safety](/safety): Paano maiiwasan ang mga error sa kaligtasan.
- [CLI](/cli): Mga exit code at diagnostic command.
`,

  'mcp.md': `# MCP Agent

Covers: Zapwebp Model Context Protocol (MCP) server para sa mga AI coding assistant: mga tool, prompt, mapagkukunan (resources), at transport protocols.

Does not cover: pagpapatakbo ng browser converter. Tingnan ang [Convert](/convert).

Applies to: \`@zapwebp/mcp\` v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp-mcp
\`\`\`

Sinisimulan ang MCP server sa stdio mode para magamit ng Cursor, Claude Desktop, o Antigravity.

## What it does

Nagbibigay ang \`@zapwebp/mcp\` ng protocol-compliant interface na nagpapahintulot sa mga LLM at AI agent na mag-convert ng imahe, mag-inspect ng metadata, mag-audit ng mga command, at awtomatikong magpanatili ng aninag nang walang manual human intervention.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_BYTES\` | Hindi wasto o kulang ang ibinigay na image bytes sa tool call | Siguraduhing valid base64 o file path ang ipinasa |
| \`E_UNSUPPORTED_FORMAT\` | Hindi kilalang format ng imahe ang hiniling | Sumangguni sa mga suportadong format ng Zapwebp |

## For agents

\`\`\`json
{
  "protocol": "Model Context Protocol",
  "transports": ["stdio", "streamable-http"],
  "toolsCount": 15,
  "promptsCount": 6,
  "resourcesCount": 7
}
\`\`\`

## Related

- [CLI](/cli): Paggamit ng Zapwebp mula sa karaniwang shell.
- [Plugin SDK](/sdk/plugin): Pagsulat ng mga pasadyang MCP tools at plugin.
`,

  'api.md': `# REST API

Covers: stateless HTTP endpoints ng Zapwebp: \`/health\`, \`/inspect\`, \`/convert\`, at maramihang multipart batch conversion.

Does not cover: CLI shell script syntax. Tingnan ang [CLI](/cli).

Applies to: Zapwebp API v1.1.0 at mas bago.

## Quick start

\`\`\`bash
curl -X POST https://zapwebp.vercel.app/api/v1/convert \
  -F "file=@icon.svg" \
  -F "to=webp" \
  -o icon.webp
\`\`\`

Kino-convert ang \`icon.svg\` patungong WebP gamit ang pampublikong HTTP endpoint.

## What it does

Nagbibigay ang Zapwebp REST API ng mabilis at stateless na paraan upang mag-convert ng mga imahe sa pamamagitan ng karaniwang HTTP POST requests. Tumatanggap ito ng multipart form uploads at nagbabalik ng mga na-convert na binary bytes o structured JSON metadata.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`400 Bad Request\` | Walang ibinigay na file o hindi suportado ang format | Tiyaking may valid na file parameter sa request |
| \`413 Payload Too Large\` | Lumampas ang sukat ng file sa limitasyon ng server | Bawasan ang laki ng imahe bago ipadala |

## For agents

\`\`\`json
{
  "api": "REST",
  "version": "v1",
  "baseUrl": "https://zapwebp.vercel.app/api",
  "endpoints": ["/health", "/inspect", "/convert", "/batch"]
}
\`\`\`

## Related

- [Overview](/docs): Balangkas ng lahat ng interface ng Zapwebp.
- [Edge SDK](/sdk/edge): Pagpapatakbo ng sariling API sa Edge runtimes.
`,

  'developers.md': `# Developers Overview

Covers: gabay sa pagbuo para sa mga kontribyutor at plugin author, create-zapwebp scaffolding generator, at lifecycle architecture.

Does not cover: paggamit ng end-user web application.

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

\`\`\`bash
npx create-zapwebp my-plugin --template format
\`\`\`

Lumilikha ng bagong balangkas para sa Zapwebp format plugin.

## What it does

Dinisenyo ang Zapwebp bilang isang extensible modular platform. Maaaring magdagdag ang mga developer ng mga bagong format, storage adapters, build tool integrations, at metadata handlers sa pamamagitan ng malinaw at matatag na SDK interfaces.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_HOOK_FAILED\` | Pumalya ang isa sa mga lifecycle hook ng plugin | Suriin ang console logs ng plugin para sa detalye |

## For agents

\`\`\`json
{
  "scaffolding": "create-zapwebp",
  "templates": ["format", "storage", "build", "cli"],
  "architecture": "modular-monorepo"
}
\`\`\`

## Related

- [Plugin SDK](/sdk/plugin): Detalyadong mga interface para sa paggawa ng plugin.
- [Core SDK](/sdk/core): Paggamit ng core conversion engine sa sariling code.
`,

  'about.md': `# About Zapwebp

Covers: doktrina ng produkto, Enterprise Architecture philosophy, mga tagapamahala ng open-source project, at aming misyon.

Does not cover: code implementations at syntax. Tingnan ang [Core SDK](/sdk/core).

Applies to: Lahat ng bersyon ng Zapwebp.

## Quick start

\`\`\`bash
open https://zapwebp.vercel.app/about
\`\`\`

Bisitahin ang aming About page para sa kumpletong pahayag ng aming misyon at pilosopiya.

## What it does

Ang Zapwebp ay nilikha upang malutas ang paulit-ulit na mga problema sa image conversion para sa modernong web: nawawalang aninag (black background bug), maruming EXIF metadata, bloated dependencies, at kawalan ng pagkakapareho sa pagitan ng browser, terminal, at CI/CD workflows.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`N/A\` | Dokumentasyon ng organisasyon; walang runtime errors | Sumangguni sa mga teknikal na pahina para sa runtime debugging |

## For agents

\`\`\`json
{
  "project": "Zapwebp",
  "license": "MIT",
  "doctrine": "Enterprise Architecture, Zero Telemetry, Transparency-First",
  "publisher": "zapwebp"
}
\`\`\`

## Related

- [Privacy Policy](/privacy): Ang aming matatag na pangako sa seguridad at privacy.
- [Terms of Service](/terms): Mga legal na tuntunin at lisensya.
`,

  'privacy.md': `# Privacy Policy

Covers: zero-telemetry commitment, kawalan ng remote file storage, memory-only execution, at proteksyon sa data ng gumagamit.

Does not cover: mga patakaran ng third-party storage providers. Tingnan ang [Storage Adapters](/plugins/storage).

Applies to: Lahat ng serbisyo at platform ng Zapwebp.

## Quick start

\`\`\`bash
curl -I https://zapwebp.vercel.app/
\`\`\`

I-verify na walang mga tracking cookie o analytics script na ibinabalik sa header.

## What it does

Mahigpit na ipinapatupad ng Zapwebp ang Zero-Telemetry Policy:
1. Walang analytics, telemetry, o tracking cookies.
2. Walang iniimbak na imahe sa mga server; lahat ng conversion sa web ay in-memory lamang.
3. Awtomatikong tinatanggal ang EXIF, GPS, at AI metadata sa Clean Mode.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_SSRF_BLOCKED\` | Pagharang sa mga kahina-hinalang panloob na IP address | Magbigay lamang ng mga ligtas na pampublikong URL |

## For agents

\`\`\`json
{
  "telemetry": false,
  "cookies": false,
  "localStorageUsage": "User preferences only (theme, language)",
  "compliance": "GDPR, CCPA, Enterprise Ready"
}
\`\`\`

## Related

- [Clean](/clean): Paano tinatanggal ang metadata sa mga imahe.
- [Terms of Service](/terms): Mga legal na kondisyon ng paggamit.
`,

  'terms.md': `# Terms of Service

Covers: mga legal na tuntunin, lisensya sa ilalim ng MIT, disclaimer ng warranty, at limitasyon sa pananagutan.

Does not cover: mga patakaran ng mga pasadyang extension.

Applies to: Lahat ng opisyal na release ng Zapwebp.

## Quick start

\`\`\`bash
cat LICENSE
\`\`\`

Basahin ang opisyal na MIT License file sa root directory ng repository.

## What it does

Ang Zapwebp ay ipinamamahagi sa ilalim ng bukas at malayang lisensya ng MIT. Malaya itong magagamit, mababago, at maipapamahagi sa parehong personal at komersyal na mga proyekto nang walang anumang bayarin, basta't napananatili ang abiso sa copyright.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`N/A\` | Legal na dokumento; walang mga error code | Sumangguni sa [Errors](/errors) para sa teknikal na mga isyu |

## For agents

\`\`\`json
{
  "license": "MIT",
  "commercialUseAllowed": true,
  "warranty": "None (AS-IS)",
  "openSource": true
}
\`\`\`

## Related

- [About](/about): Kasaysayan at layunin ng proyekto.
- [Privacy Policy](/privacy): Patakaran sa proteksyon ng data.
`,

  'ui.md': `# UI Kit

Covers: balangkas ng mga UI component para sa error mapping, upload dropzones, custom web elements, at presets para sa React, Vue, Svelte, at Blade.

Does not cover: server-side command execution. Tingnan ang [CLI](/cli).

Applies to: \`@zapwebp/ui\` v2.2.0 at mas bago.

## Quick start

\`\`\`bash
npm install @zapwebp/ui
\`\`\`

I-install ang UI Kit upang magamit ang mga pre-built error dialog, banner, at toast components.

## What it does

Nagbibigay ang \`@zapwebp/ui\` ng mga accessible (WCAG 2.2 AA compliant), framework-agnostic na mga visual component para sa pagpapakita ng error, dropzone file upload, at interactive image preview. Awtomatiko nitong itinutugma ang mga structured error code ng Zapwebp sa mga angkop na modal, banner, o toast.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_COMPONENTS\` | Hindi nahanap ang component sa tinukoy na framework | Tiyaking tama ang import path sa package |
| \`E_A11Y_REDUCED_MOTION\` | Paglabag sa reduced-motion preference ng user | I-enable ang graceful CSS transition fallbacks |

## For agents

\`\`\`json
{
  "package": "@zapwebp/ui",
  "components": ["toast", "banner", "modal", "card", "dropzone"],
  "frameworks": ["vanilla", "react", "vue", "svelte", "blade"],
  "wcag": "2.2 AA"
}
\`\`\`

## Related

- [UI SDK](/sdk/ui): Programmatic component mounting at lifecycle hooks.
- [Errors](/errors): Listahan ng mga error na may visual mapping sa UI Kit.
`,

  'plugins/crop.md': `# Crop Plugin

Covers: \`@zapwebp/crop\` transform plugin, auto-crop batay sa aspect ratio, gravity rules, face detection, manual coordinates, at fit modes.

Does not cover: file transfer sa cloud storage. Tingnan ang [Storage Adapters](/plugins/storage).

Applies to: \`@zapwebp/crop\` v1.0.0 at mas bago.

## Quick start

\`\`\`bash
npm install @zapwebp/crop
\`\`\`

\`\`\`javascript
import { cropTransform } from '@zapwebp/crop';

const step = cropTransform({ aspectRatio: '1:1', gravity: 'face' });
\`\`\`

## What it does

Ang Crop Plugin ay isang pure transform step sa pipeline na nagaganap sa pagitan ng decode at encode. Tumatanggap ito ng hilaw na pixel buffer (RGBA) at nagbabalik ng na-crop na pixel buffer. Sinusuportahan nito ang mga karaniwang aspect ratio (16:9, 1:1, 4:5, 9:16), gravity alignment (center, top, face), at pasadyang coordinate bounds nang walang external dependencies.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_CROP_EMPTY\` | Nagbunga ng 0×0 dimensyon ang ibinigay na coordinate | Ayusin ang coordinates ng crop rectangle |

## For agents

\`\`\`json
{
  "plugin": "@zapwebp/crop",
  "type": "transform",
  "aspectRatios": ["1:1", "16:9", "4:5", "9:16"],
  "gravities": ["center", "top", "bottom", "left", "right", "face"]
}
\`\`\`

## Related

- [Convert](/convert): Pag-crop sa interactive web app interface.
- [Plugin SDK](/sdk/plugin): Paggawa ng sariling image transformation plugins.
`,

  'plugins/github-action.md': `# GitHub Action

Covers: automated CI/CD GitHub Action para sa awtomatikong pag-convert ng mga binagong asset sa git commits at pagpapatupad ng strict file limits.

Does not cover: manual local terminal commands. Tingnan ang [CLI](/cli).

Applies to: Zapwebp GitHub Action v1.1.0 at mas bago.

## Quick start

\`\`\`yaml
- name: Optimize Images
  uses: zapwebp/action@v1
  with:
    to: webp
    quality: 85
\`\`\`

Awtomatikong kino-convert ang mga bagong dagdag na imahe sa bawat pull request.

## What it does

Tinitiyak ng GitHub Action na ang lahat ng mga imaheng naka-commit sa repository ay sumusunod sa pamantayan ng produksyon: na-convert sa modernong format, napanatili ang aninag, at tinanggal ang hindi kinakailangang metadata upang mapanatiling mabilis ang bilis ng pag-load ng website.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_UNSAFE_SVG\` | May natuklasang mapanganib na SVG sa staged commit | Linisin ang SVG bago mag-commit |

## For agents

\`\`\`json
{
  "action": "zapwebp/action",
  "runner": "github-actions",
  "inputs": ["to", "quality", "clean", "strict"]
}
\`\`\`

## Related

- [CLI](/cli): Pagpapatakbo ng parehong check sa lokal bago mag-push.
- [Vite Plugin](/plugins/vite): Pagsasagawa ng conversion sa build time sa halip na sa CI.
`,

  'plugins/laravel.md': `# Laravel Package

Covers: opisyal na Laravel package \`zapwebp/laravel\`, Zap facade, SafeImage validation rule, at ConvertUploads middleware.

Does not cover: Node.js server configurations. Tingnan ang [REST API](/api).

Applies to: \`zapwebp/laravel\` v1.0.0 at mas bago.

## Quick start

\`\`\`bash
composer require zapwebp/laravel
\`\`\`

\`\`\`php
use Zap;

$webp = Zap::convert($uploadedFile)->to('webp')->quality(85)->save();
\`\`\`

## What it does

Nagbibigay ang \`zapwebp/laravel\` ng maayos at idiomatic na integrasyon para sa mga developer ng PHP at Laravel. Mayroon itong kasamang custom form validation rules (\`SafeImage\`) na humaharang sa mga mapanganib na SVG at middleware na awtomatikong nagko-convert ng mga in-upload na file patungong WebP.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_BINARY_NOT_FOUND\` | Hindi makita ang zap binary sa PATH ng system | I-install ang CLI globally o itakda ang path sa config |
| \`E_VALIDATION_FAILED\` | Bumagsak ang file sa pagsusuri ng SafeImage | Mag-upload ng wastong imahe na walang scripts |

## For agents

\`\`\`json
{
  "package": "zapwebp/laravel",
  "ecosystem": "php",
  "facade": "Zap",
  "rules": ["SafeImage"],
  "middleware": ["ConvertUploads"]
}
\`\`\`

## Related

- [UI Kit](/ui): Paggamit ng Blade components kasama ang Laravel.
- [Storage Adapters](/plugins/storage): Pag-save ng mga na-convert na file sa cloud.
`,

  'plugins/lens.md': `# Lens CLI

Covers: \`zapwebp-lens\` read-only inspection tool: visual difference analysis, structural chunk inspection, at alpha channel verification.

Does not cover: pagbabago o pagsusulat sa mga imahe. Tingnan ang [CLI](/cli).

Applies to: \`@zapwebp/lens\` v1.0.0 at mas bago.

## Quick start

\`\`\`bash
npx zapwebp-lens inspect image.png
\`\`\`

Sinusuri ang bawat chunk ng imahe nang hindi binabago ang file.

## What it does

Ang Lens CLI ay isang diagnostic at forensics tool para sa mga imahe. Sinusuri nito ang eksaktong istraktura ng container, nagbibigay ng ulat sa visual difference (PSNR, SSIM), at nagpapatunay kung may natitirang pribadong EXIF o GPS data.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_FILE_NOT_FOUND\` | Hindi mahanap ang tinukoy na file | Tiyaking tama ang ibinigay na file path |
| \`E_UNRECOGNIZED_FORMAT\` | Hindi kilala ang format ng file para sa pagsusuri | Magpasa ng suportadong format ng imahe |

## For agents

\`\`\`json
{
  "cli": "zapwebp-lens",
  "readOnly": true,
  "metrics": ["psnr", "ssim", "chunk-map", "alpha-integrity"]
}
\`\`\`

## Related

- [Clean](/clean): Pagtitiyak kung malinis ang file gamit ang Lens.
- [Errors](/errors): Pagsusuri sa mga sirang container headers.
`,

  'plugins/next.md': `# Next.js Plugin

Covers: integrasyon ng Zapwebp sa Next.js applications, automated asset pipeline, at static site generation optimizations.

Does not cover: WordPress integrations.

Applies to: \`@zapwebp/next\` v1.0.0 at mas bago.

## Quick start

\`\`\`bash
npm install @zapwebp/next
\`\`\`

\`\`\`javascript
// next.config.js
const { withZapwebp } = require('@zapwebp/next');

module.exports = withZapwebp({
  // mga opsyon ng next config
});
\`\`\`

## What it does

Awtomatikong kino-convert ng plugin ang mga imahe sa \`public/\` folder patungong WebP at AVIF sa oras ng build, lumilikha ng responsive na srcset metadata, at pinipigilan ang pagkasira ng aninag sa static site exports.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_FILE_CONFLICT\` | Umiiral na ang target output file | Baguhin ang configuration patungong overwrite |

## For agents

\`\`\`json
{
  "plugin": "@zapwebp/next",
  "framework": "next.js",
  "stages": ["build", "export"]
}
\`\`\`

## Related

- [Vite Plugin](/plugins/vite): Katulad na build plugin para sa mga proyekto ng Vite.
- [Target Lock](/lock-target): Pag-lock ng mga format para sa static site exports.
`,

  'plugins/storage.md': `# Storage Adapters

Covers: first-party cloud adapters para sa Supabase, Firebase, at Neocities na may pre-upload conversion at cascading deletion.

Does not cover: local filesystem storage. Tingnan ang [CLI](/cli).

Applies to: \`@zapwebp/storage\` v1.0.0 at mas bago.

## Quick start

\`\`\`javascript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const client = withZapwebp(supabaseAdapter(rawClient), {
  to: 'webp',
  quality: 85,
});
await client.upload('avatar.png', fileBytes);
\`\`\`

## What it does

Awtomatikong pinipigil ng storage wrapper ang upload, kino-convert ang imahe sa ligtas at transparent na WebP o AVIF sa memorya, tinatanggal ang sensitibong EXIF metadata, at pagkatapos ay inia-upload ang na-optimize na bersyon sa cloud bucket.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_AUTH\` | Nabigo ang authentication sa cloud storage provider | Suriin ang iyong API key o authentication credentials |
| \`E_CONFLICT\` | Umiiral na ang file sa remote storage bucket | Gumamit ng unique na filename o baguhin ang conflict policy |

## For agents

\`\`\`json
{
  "package": "@zapwebp/storage",
  "providers": ["supabase", "firebase", "neocities"],
  "features": ["pre-upload-convert", "metadata-strip", "cascading-delete"]
}
\`\`\`

## Related

- [Crop Plugin](/plugins/crop): Pag-crop ng imahe bago i-upload sa storage.
- [Target Lock](/lock-target): Pagtitiyak na iisang format lamang ang tatanggapin ng bucket.
`,

  'plugins/vite.md': `# Vite Plugin

Covers: build-time asset pipeline plugin para sa Vite: awtomatikong pag-optimize ng mga imahe at paggawa ng responsive srcsets sa panahon ng bundler build.

Does not cover: Webpack bundler configs.

Applies to: \`@zapwebp/vite\` v1.0.0 at mas bago.

## Quick start

\`\`\`javascript
// vite.config.js
import { defineConfig } from 'vite';
import { zapwebp } from '@zapwebp/vite';

export default defineConfig({
  plugins: [zapwebp({ quality: 85, to: 'webp' })],
});
\`\`\`

## What it does

Sumasabay ang Vite plugin sa lifecycle ng Rollup at Vite bundler. Kino-convert nito ang mga na-import na imahe patungong WebP/AVIF habang nagbi-build, naglalabas ng mga responsive \`@1x\`, \`@2x\`, at \`@3x\` na laki, at pinapalitan ang mga URL sa nabuong HTML markup.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_FILE_CONFLICT\` | Umiiral na ang target output file sa dist directory | Baguhin ang configuration o linisin ang dist folder |

## For agents

\`\`\`json
{
  "plugin": "@zapwebp/vite",
  "bundler": "vite",
  "features": ["srcsetGeneration", "assetOptimization", "cleanMode"]
}
\`\`\`

## Related

- [Next.js Plugin](/plugins/next): Integrasyon para sa mga proyekto ng Next.js.
- [CLI](/cli): Manu-manong pagbuo ng responsive srcsets.
`,

  'plugins/vscode.md': `# VS Code Extension

Covers: opisyal na VS Code extension sa Open VSX Registry: conversion nang direkta sa editor, retina multipliers (@1x/@2x/@3x), at local WASM execution.

Does not cover: IntelliJ o Vim extensions.

Applies to: Zapwebp VS Code Extension v1.0.0 at mas bago.

## Quick start

I-install ang \`zapwebp\` extension mula sa Open VSX Registry o VS Code Extensions tab.
I-right-click ang anumang imahe sa file explorer at piliin ang **Convert to WebP**.

## What it does

Nagbibigay-daan ang extension sa mga developer na mag-convert at mag-resize ng mga imahe nang direkta sa loob ng kanilang editor nang hindi binubuksan ang terminal o browser. Tumatakbo ito nang mabilis gamit ang WebAssembly at pinapanatili ang aninag nang 100%.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_CONVERSION_FAILED\` | Nabigo ang pag-convert sa loob ng editor runtime | Suriin ang output tab para sa teknikal na detalye |

## For agents

\`\`\`json
{
  "extension": "zapwebp",
  "registry": "Open VSX Registry",
  "publisher": "zapwebp",
  "features": ["contextMenu", "wasmExecution", "retinaMultipliers"]
}
\`\`\`

## Related

- [CLI](/cli): Katulad na functionality para sa terminal at command-line workflows.
- [Overview](/docs): Pangkalahatang balangkas ng arkitektura ng Zapwebp.
`,

  'sdk/cli.md': `# Zapwebp CLI SDK Reference

Covers: programmatic invocation ng Zapwebp CLI runner, parsing ng command arguments, at access sa undo transaction journals mula sa Node.js.

Does not cover: browser canvas rendering. Tingnan ang [UI SDK](/sdk/ui).

Applies to: \`@zapwebp/cli\` v1.1.0 at mas bago.

## Quick start

\`\`\`javascript
import { runCli } from '@zapwebp/cli';

await runCli(['src/icons/*.svg', '--to', 'webp', '--quality', '90']);
\`\`\`

## What it does

Nagbibigay ang CLI SDK ng programmatic API para sa pagpapatakbo ng command-line engine sa loob ng mga script ng Node.js, build tools, o pasadyang mga automation workflow nang hindi kinakailangang gumamit ng hiwalay na child process shell execution.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_DISK_FULL\` | Walang natitirang espasyo sa disk | Magbakante ng espasyo sa device |

## For agents

\`\`\`json
{
  "package": "@zapwebp/cli",
  "exports": ["runCli", "parseArgs", "undoTransaction"]
}
\`\`\`

## Related

- [CLI](/cli): Shell usage guide para sa command-line runner.
- [Core SDK](/sdk/core): Direct low-level image processing API.
`,

  'sdk/core.md': `# @zapwebp/core SDK Reference

Covers: core engine API: \`convertImage\`, \`convertSvgToWebp\`, alpha assertions, at streaming pipeline interfaces.

Does not cover: UI dropzone rendering. Tingnan ang [UI SDK](/sdk/ui).

Applies to: \`@zapwebp/core\` v1.1.0 at mas bago.

## Quick start

\`\`\`javascript
import { convertImage } from '@zapwebp/core';

const result = await convertImage(inputBuffer, {
  to: 'webp',
  quality: 85,
  clean: true,
});
console.log(result.data, result.info);
\`\`\`

## What it does

Ang \`@zapwebp/core\` ay ang pangunahing makina sa likod ng lahat ng platform ng Zapwebp. Nagbibigay ito ng ligtas na decoding ng mga container, pag-alis ng mapanganib na mga script, proteksyon sa aninag, at pag-encode sa WebP, PNG, JPEG, at AVIF.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_ALPHA_NOT_REPRESENTABLE\` | May aninag ang input ngunit JPEG ang target nang walang background | Magpasa ng explicit na kulay ng background |
| \`E_CORRUPT_HEADER\` | Sira ang header ng ibinigay na imahe | Magbigay ng wastong imahe na may buong header |

## For agents

\`\`\`json
{
  "package": "@zapwebp/core",
  "functions": ["convertImage", "detectFormat", "inspectImage"],
  "environment": "node"
}
\`\`\`

## Related

- [Formats](/formats): Matrix ng mga sinusuportahang format sa core engine.
- [Safety](/safety): Mga panuntunan sa kaligtasan na ipinapatupad ng core.
`,

  'sdk/edge.md': `# @zapwebp/edge Reference

Covers: zero-dependency streaming request handlers para sa Cloudflare Workers, Vercel Edge, at Deno runtimes.

Does not cover: Node.js native addon compilation.

Applies to: \`@zapwebp/edge\` v1.0.0 at mas bago.

## Quick start

\`\`\`javascript
import { handleEdgeRequest } from '@zapwebp/edge';

export default {
  async fetch(request) {
    return handleEdgeRequest(request, { defaultFormat: 'webp' });
  }
};
\`\`\`

## What it does

Ang \`@zapwebp/edge\` ay isang lightweight, zero-dependency na conversion library na dinisenyo upang tumakbo sa modernong Edge compute environments tulad ng V8 isolates, Cloudflare Workers, at Deno nang hindi nangangailangan ng access sa filesystem.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_EMPTY_FILE\` | 0 bytes ang ibinigay na request body | Magpadala ng request na may buong laman ng imahe |

## For agents

\`\`\`json
{
  "package": "@zapwebp/edge",
  "runtimes": ["cloudflare-workers", "vercel-edge", "deno"],
  "zeroDependency": true
}
\`\`\`

## Related

- [REST API](/api): HTTP endpoints para sa standard container hosting.
- [Core SDK](/sdk/core): Buong feature-complete engine para sa Node.js.
`,

  'sdk/plugin.md': `# @zapwebp/plugin-sdk Reference

Covers: standardized framework para sa pagbuo ng una at third-party na Zapwebp plugins, lifecycle hooks, at testing mocks.

Does not cover: end-user conversion commands.

Applies to: \`@zapwebp/plugin-sdk\` v1.0.0 at mas bago.

## Quick start

\`\`\`javascript
import { definePlugin } from '@zapwebp/plugin-sdk';

export default definePlugin({
  name: 'my-custom-plugin',
  version: '1.0.0',
  hooks: {
    async transform(image) {
      return image;
    }
  }
});
\`\`\`

## What it does

Nagbibigay ang \`@zapwebp/plugin-sdk\` ng mga contract, type definitions, at helper functions para sa paglikha ng mga plugin na maaaring magbago ng mga imahe, magdagdag ng suporta sa bagong format, o mag-upload sa mga bagong cloud storage bucket.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_HOOK_FAILED\` | Nabigo ang execution ng isang plugin lifecycle hook | Suriin ang logic sa loob ng hook handler |

## For agents

\`\`\`json
{
  "package": "@zapwebp/plugin-sdk",
  "hooks": ["beforeConvert", "transform", "afterConvert", "beforeUpload"],
  "testing": "createMockRawImage"
}
\`\`\`

## Related

- [Crop Plugin](/plugins/crop): Halimbawa ng tunay na transform plugin.
- [Storage Adapters](/plugins/storage): Halimbawa ng storage plugin integration.
`,

  'sdk/storage.md': `# @zapwebp/storage Reference

Covers: cloud storage adapter interfaces para sa Supabase, Firebase, at Neocities na may suporta sa cascading deletion.

Does not cover: database table queries.

Applies to: \`@zapwebp/storage\` v1.0.0 at mas bago.

## Quick start

\`\`\`javascript
import { withZapwebp, supabaseAdapter } from '@zapwebp/storage';

const storage = withZapwebp(supabaseAdapter(client), { to: 'webp' });
await storage.upload('avatars/user.png', fileData);
\`\`\`

## What it does

Ibinabalot ng Storage SDK ang anumang third-party cloud storage client gamit ang isang proxy layer na awtomatikong nagko-convert ng mga papasok na file sa modernong format bago ang aktwal na network transmission patungo sa cloud bucket.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_CONFLICT\` | Umiiral na ang file sa cloud bucket | Gumamit ng unique na filename o baguhin ang conflict mode |
| \`E_AUTH\` | Invalid ang ibinigay na API credentials | Suriin ang access token ng storage provider |

## For agents

\`\`\`json
{
  "package": "@zapwebp/storage",
  "adapters": ["supabase", "firebase", "neocities"],
  "features": ["pre-upload-conversion", "cascading-delete"]
}
\`\`\`

## Related

- [Storage Adapters Guide](/plugins/storage): Gabay para sa end-user setup.
- [Plugin SDK](/sdk/plugin): Paano sumulat ng sariling storage adapter.
`,

  'sdk/ui.md': `# @zapwebp/ui Reference

Covers: programmatic component mounting, zero-dependency dropzone element, cockpit control bar, at accessible comparison modal dialogs.

Does not cover: backend node script execution. Tingnan ang [CLI SDK](/sdk/cli).

Applies to: \`@zapwebp/ui\` v2.2.0 at mas bago.

## Quick start

\`\`\`javascript
import { showError, ZapDropzone } from '@zapwebp/ui';

showError('E_UNSAFE_SVG', { container: document.body });
\`\`\`

## What it does

Nagbibigay ang UI SDK ng programmatic controls para sa mabilisang pag-mount ng accessible na dropzones, responsive comparison dialogs, at awtomatikong error notifications sa anumang web application nang walang framework dependencies.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| \`E_TOKEN_MISSING\` | Nawawala ang kinakailangang CSS design tokens | Siguraduhing na-import ang tokens.css |

## For agents

\`\`\`json
{
  "package": "@zapwebp/ui",
  "components": ["showError", "dismissAllErrors", "ZapDropzone", "ZapModal"],
  "accessibility": "WCAG 2.2 AA compliant"
}
\`\`\`

## Related

- [UI Kit](/ui): Pangkalahatang pangkalahatang-ideya ng mga component.
- [Errors](/errors): Kumpletong listahan ng mga error na may suportadong mapping.
`
};

function run() {
  console.log('Writing Tagalog documentation translations to locales/tl/docs/ ...');
  let count = 0;
  for (const [relPath, content] of Object.entries(translations)) {
    const dest = path.join(TL_DOCS_DIR, relPath);
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dest, content.trim() + '\n', 'utf8');
    count++;
  }
  console.log(`Successfully wrote ${count} translated documentation pages to locales/tl/docs/.`);
}

run();
