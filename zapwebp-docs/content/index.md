# Zapwebp

Covers: overview of Zapwebp image conversion, supported surfaces (web, CLI, MCP, API), core principles, comparison matrix, and quick orientation.

Does not cover: in-depth command-line flags, MCP protocol schemas, or raw API routing details. See [CLI](/cli) and [MCP](/mcp).

Applies to: Zapwebp v1.1.0 and later.

<Callout className="mb-6 border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900">

**Recommended for new projects:** Use the instant [Web Converter](https://zapwebp.vercel.app) or [create-zapwebp](/scaffolding) to convert and optimize assets immediately with zero configuration.

</Callout>

Choose the setup that matches your starting point.

<div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
  <LinkedCard
    href="https://zapwebp.vercel.app"
    className="items-start gap-1 p-6 text-sm md:p-6"
  >
    <div className="font-medium">Web Converter</div>
    <div className="leading-relaxed text-muted-foreground">
      Drop, paste, and download. Zero server uploads, 100% in-memory client-side execution.
    </div>
  </LinkedCard>
  <LinkedCard href="/cli" className="items-start gap-1 p-6 text-sm md:p-6">
    <div className="font-medium">Use the CLI</div>
    <div className="leading-relaxed text-muted-foreground">
      Run single or batch conversions with undo journals directly from your terminal.
    </div>
  </LinkedCard>
  <LinkedCard
    href="/mcp"
    className="items-start gap-1 p-6 text-sm md:p-6"
  >
    <div className="font-medium">AI Agents (MCP)</div>
    <div className="leading-relaxed text-muted-foreground">
      Connect 15 image conversion and inspection tools to Claude, Cursor, and Antigravity.
    </div>
  </LinkedCard>
</div>

## Quick start

```bash
npx zapwebp logo.svg --to webp
```

Converts `logo.svg` to a transparent `logo.webp` in the current folder.

[Open Web Converter ↗](https://zapwebp.vercel.app)

## What it does

> **Convert correctly.**  
> Transparency preserved. Metadata stripped. Output verified. Same engine across the browser, terminal, build tools, and AI agents.

Zapwebp converts SVG and common raster images to WebP, PNG, JPEG, and AVIF while preserving transparent alpha channels. It operates locally through the terminal, editor extensions, and AI model context protocols, or in-memory through the web app without remote storage.

## Choose Your Framework

Zapwebp integrates directly into your build and cloud pipelines:

<div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
  <LinkedCard href="/plugins/next">
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="currentColor">
      <title>Next.js</title>
      <path d="M11.5725 0c-.1763 0-.3098.0013-.3584.0067-.0516.0053-.2159.021-.3636.0328-3.4088.3073-6.6017 2.1463-8.624 4.9728C1.1004 6.584.3802 8.3666.1082 10.255c-.0962.659-.108.8537-.108 1.7474s.012 1.0884.108 1.7476c.652 4.506 3.8591 8.2919 8.2087 9.6945.7789.2511 1.6.4223 2.5337.5255.3636.04 1.9354.04 2.299 0 1.6117-.1783 2.9772-.577 4.3237-1.2643.2065-.1056.2464-.1337.2183-.1573-.0188-.0139-.8987-1.1938-1.9543-2.62l-1.919-2.592-2.4047-3.5583c-1.3231-1.9564-2.4117-3.556-2.4211-3.556-.0094-.0026-.0187 1.5787-.0235 3.509-.0067 3.3802-.0093 3.5162-.0516 3.596-.061.115-.108.1618-.2064.2134-.075.0374-.1408.0445-.495.0445h-.406l-.1078-.068a.4383.4383 0 01-.1572-.1712l-.0493-.1056.0053-4.703.0067-4.7054.0726-.0915c.0376-.0493.1174-.1125.1736-.143.0962-.047.1338-.0517.5396-.0517.4787 0 .5584.0187.6827.1547.0353.0377 1.3373 1.9987 2.895 4.3608a10760.433 10760.433 0 004.7344 7.1706l1.9002 2.8782.096-.0633c.8518-.5536 1.7525-1.3418 2.4657-2.1627 1.5179-1.7429 2.4963-3.868 2.8247-6.134.0961-.6591.1078-.854.1078-1.7475 0-.8937-.012-1.0884-.1078-1.7476-.6522-4.506-3.8592-8.2919-8.2087-9.6945-.7672-.2487-1.5836-.42-2.4985-.5232-.169-.0176-1.0835-.0366-1.6123-.037zm4.0685 7.217c.3473 0 .4082.0053.4857.047.1127.0562.204.1642.237.2767.0186.061.0234 1.3653.0186 4.3044l-.0067 4.2175-.7436-1.14-.7461-1.14v-3.066c0-1.982.0093-3.0963.0234-3.1502.0375-.1313.1196-.2346.2323-.2955.0961-.0494.1313-.054.4997-.054z" />
    </svg>
    <p class="mt-2 font-medium">Next.js</p>
  </LinkedCard>
  <LinkedCard href="/plugins/vite">
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="currentColor">
      <title>Vite</title>
      <path d="m8.286 10.578.512-8.657a.306.306 0 0 1 .247-.282L17.377.006a.306.306 0 0 1 .353.385l-1.558 5.403a.306.306 0 0 0 .352.385l2.388-.46a.306.306 0 0 1 .332.438l-6.79 13.55-.123.19a.294.294 0 0 1-.252.14c-.177 0-.35-.152-.305-.369l1.095-5.301a.306.306 0 0 0-.388-.355l-1.433.435a.306.306 0 0 1-.389-.354l.69-3.375a.306.306 0 0 0-.37-.36l-2.32.536a.306.306 0 0 1-.374-.316zm14.976-7.926L17.284 3.74l-.544 1.887 2.077-.4a.8.8 0 0 1 .84.369.8.8 0 0 1 .034.783L12.9 19.93l-.013.025-.015.023-.122.19a.801.801 0 0 1-.672.37.826.826 0 0 1-.634-.302.8.8 0 0 1-.16-.67l1.029-4.981-1.12.34a.81.81 0 0 1-.86-.262.802.802 0 0 1-.165-.67l.63-3.08-2.027.468a.808.808 0 0 1-.768-.233.81.81 0 0 1-.217-.6l.389-6.57-7.44-1.33a.612.612 0 0 0-.64.906L11.58 23.691a.612.612 0 0 0 1.066-.004l11.26-20.135a.612.612 0 0 0-.644-.9z" />
    </svg>
    <p class="mt-2 font-medium">Vite</p>
  </LinkedCard>
  <LinkedCard href="/plugins/laravel">
    <svg role="img" viewBox="0 0 62 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10">
      <title>Laravel</title>
      <path d="M61.8548 14.6253C61.8778 14.7102 61.8895 14.7978 61.8897 14.8858V28.5615C61.8898 28.737 61.8434 28.9095 61.7554 29.0614C61.6675 29.2132 61.5409 29.3392 61.3887 29.4265L49.9104 36.0351V49.1337C49.9104 49.4902 49.7209 49.8192 49.4118 49.9987L25.4519 63.7916C25.3971 63.8227 25.3372 63.8427 25.2774 63.8639C25.255 63.8714 25.2338 63.8851 25.2101 63.8913C25.0426 63.9354 24.8666 63.9354 24.6991 63.8913C24.6716 63.8838 24.6467 63.8689 24.6205 63.8589C24.5657 63.8389 24.5084 63.8215 24.456 63.7916L0.501061 49.9987C0.348882 49.9113 0.222437 49.7853 0.134469 49.6334C0.0465019 49.4816 0.000120578 49.3092 0 49.1337L0 8.10652C0 8.01678 0.0124642 7.92953 0.0348998 7.84477C0.0423783 7.8161 0.0598282 7.78993 0.0697995 7.76126C0.0884958 7.70891 0.105946 7.65531 0.133367 7.6067C0.152063 7.5743 0.179485 7.54812 0.20192 7.51821C0.230588 7.47832 0.256763 7.43719 0.290416 7.40229C0.319084 7.37362 0.356476 7.35243 0.388883 7.32751C0.425029 7.29759 0.457436 7.26518 0.498568 7.2415L12.4779 0.345059C12.6296 0.257786 12.8015 0.211853 12.9765 0.211853C13.1515 0.211853 13.3234 0.257786 13.475 0.345059L25.4531 7.2415H25.4556C25.4955 7.26643 25.5292 7.29759 25.5653 7.32626C25.5977 7.35119 25.6339 7.37362 25.6625 7.40104C25.6974 7.43719 25.7224 7.47832 25.7523 7.51821C25.7735 7.54812 25.8021 7.5743 25.8196 7.6067C25.8483 7.65656 25.8645 7.70891 25.8844 7.76126C25.8944 7.78993 25.9118 7.8161 25.9193 7.84602C25.9423 7.93096 25.954 8.01853 25.9542 8.10652V33.7317L35.9355 27.9844V14.8846C35.9355 14.7973 35.948 14.7088 35.9704 14.6253C35.9792 14.5954 35.9954 14.5692 36.0053 14.5405C36.0253 14.4882 36.0427 14.4346 36.0702 14.386C36.0888 14.3536 36.1163 14.3274 36.1375 14.2975C36.1674 14.2576 36.1923 14.2165 36.2272 14.1816C36.2559 14.1529 36.292 14.1317 36.3244 14.1068C36.3618 14.0769 36.3942 14.0445 36.4341 14.0208L48.4147 7.12434C48.5663 7.03694 48.7383 6.99094 48.9133 6.99094C49.0883 6.99094 49.2602 7.03694 49.4118 7.12434L61.3899 14.0208C61.4323 14.0457 61.4647 14.0769 61.5021 14.1055C61.5333 14.1305 61.5694 14.1529 61.5981 14.1803C61.633 14.2165 61.6579 14.2576 61.6878 14.2975C61.7103 14.3274 61.7377 14.3536 61.7551 14.386C61.7838 14.4346 61.8 14.4882 61.8199 14.5405C61.8312 14.5692 61.8474 14.5954 61.8548 14.6253ZM59.893 27.9844V16.6121L55.7013 19.0252L49.9104 22.3593V33.7317L59.8942 27.9844H59.893ZM47.9149 48.5566V37.1768L42.2187 40.4299L25.953 49.7133V61.2003L47.9149 48.5566ZM1.99677 9.83281V48.5566L23.9562 61.199V49.7145L12.4841 43.2219L12.4804 43.2194L12.4754 43.2169C12.4368 43.1945 12.4044 43.1621 12.3682 43.1347C12.3371 43.1097 12.3009 43.0898 12.2735 43.0624L12.271 43.0586C12.2386 43.0275 12.2162 42.9888 12.1887 42.9539C12.1638 42.9203 12.1339 42.8916 12.114 42.8567L12.1127 42.853C12.0903 42.8156 12.0766 42.7707 12.0604 42.7283C12.0442 42.6909 12.023 42.656 12.013 42.6161C12.0005 42.5688 11.998 42.5177 11.9931 42.4691C11.9881 42.4317 11.9781 42.3943 11.9781 42.3569V15.5801L6.18848 12.2446L1.99677 9.83281ZM12.9777 2.36177L2.99764 8.10652L12.9752 13.8513L22.9541 8.10527L12.9752 2.36177H12.9777ZM18.1678 38.2138L23.9574 34.8809V9.83281L19.7657 12.2459L13.9749 15.5801V40.6281L18.1678 38.2138ZM48.9133 9.14105L38.9344 14.8858L48.9133 20.6305L58.8909 14.8846L48.9133 9.14105ZM47.9149 22.3593L42.124 19.0252L37.9323 16.6121V27.9844L43.7219 31.3174L47.9149 33.7317V22.3593ZM24.9533 47.987L39.59 39.631L46.9065 35.4555L36.9352 29.7145L25.4544 36.3242L14.9907 42.3482L24.9533 47.987Z" />
    </svg>
    <p class="mt-2 font-medium">Laravel</p>
  </LinkedCard>
  <LinkedCard href="/plugins/vscode">
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10">
      <title>VS Code</title>
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
    </svg>
    <p class="mt-2 font-medium">VS Code</p>
  </LinkedCard>
</div>

### Feature Grid

| Capability | Module / Package | Description |
|---|---|---|
| **Core Engine** | `@zapwebp/core` | Deterministic alpha preservation, SVG sanitization, and format registry |
| **Terminal CLI** | `zapwebp` / `zap` | Single file, batch glob, watch mode, manifest export, and CI checks |
| **AI Agents** | `@zapwebp/mcp` | Model Context Protocol tools for Cursor, Windsurf, Claude, and Codex |
| **Framework Plugins** | `@zapwebp/plugin-sdk` | Vite, Next.js, and GitHub Actions for automated build pipeline asset conversion |
| **Storage Adapters** | `@zapwebp/storage` | Zero-loss pre-upload conversion for Supabase, Firebase, and Neocities |
| **Lens Inspector** | `zapwebp-lens` | In-depth container chunk analysis, EXIF validation, and checkerboard preview |

### Comparison Matrix

| Feature | Zapwebp | ImageMagick | Sharp (libvips) | Online Converters |
|---|---|---|---|---|
| **Transparency** | Preserved & verified | Requires manual flags | Manual pipeline | Unpredictable loss |
| **Execution** | Pure local memory / WASM | Local machine | Local Node.js | Remote cloud upload |
| **Privacy & Telemetry** | Zero uploads, zero telemetry | Local | Local | Remote tracking & storage |
| **Metadata Stripping** | Automatic Clean Mode (EXIF/C2PA) | Manual `-strip` flag | Manual `.withMetadata(false)` | Often retained |
| **Resolution Limits** | Local RAM bound | Local disk bound | RAM bound | Strict 4.5 MB server caps |
| **AI Agent MCP** | Native MCP server | None | None | None |

## Surfaces

| Surface | Interface | Primary command or URL | What it provides |
|---|---|---|---|
| Web App | Browser | `https://zapwebp.vercel.app/` | Drag-and-drop instant conversion and batch downloads |
| CLI | Terminal | `npx zapwebp <file>` | Local file, glob, watch, and CI checks |
| MCP Server | Stdio | `npx -y @zapwebp/mcp` | Image conversion and optimization tools for AI agents |
| HTTP API | REST | `POST /api/v1/convert` | Stateless image conversion endpoints |

## Examples

### Check image and convert to WebP

```bash
$ npx zapwebp logo.svg --to webp
✓ logo.svg → logo.webp (2418 bytes)
```

### Inspect image metadata

```bash
$ npx -y @zapwebp/mcp
{"result":{"serverInfo":{"name":"zapwebp","version":"1.1.0"}},"jsonrpc":"2.0","id":1}
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `unsupported_format` | Input file format is not supported | Supply an SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF file |
| `alpha_not_representable` | Converting transparent image to JPEG without background | Supply `--background "#ffffff"` or target WebP, PNG, or AVIF |
| `file_too_large` | File exceeds maximum size limits | Reduce input dimensions or upload a smaller asset |

## For agents

```json
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
```

## Related

- [Convert](/convert): Drop files in the browser and get WebP back.
- [CLI](/cli): Run conversions and batch operations from the command line.
- [MCP](/mcp): Connect AI coding agents to image conversion tools.
- [Formats](/formats): Comprehensive format capability and alpha channel matrix.
- [Safety](/safety): Zero-trust security, SVG sanitization, and SSRF prevention.
- [Errors](/errors): Complete machine and human-readable error catalog.
