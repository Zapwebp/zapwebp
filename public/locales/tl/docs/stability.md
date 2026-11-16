# Stability at Error Boundaries

Covers: mga error boundary sa lahat ng runtime surfaces (CLI, Web App, MCP server, VS Code extension, Vite at Next.js plugins, GitHub Action, storage adapters, at Laravel middleware), mga patakaran sa graceful degradation, at ang zero stack trace guarantee.

Does not cover: pagkasira ng kernel ng operating system o downtime ng third-party cloud servers.

Applies to: lahat ng Zapwebp surfaces v1.1.0 at mas bago.

## Quick start

```bash
# Suriin ang kalusugan ng kapaligiran at error diagnostics
npx zapwebp doctor
```

Ipinapakita ang estado ng runtime, pahintulot sa pagsulat sa file system, at kalagayan ng mga dependency.

## What it does

Ipinapatupad ng Zapwebp ang mahigpit na "Never Breaks" stability guarantee sa lahat ng interface. Ang bawat error ay sinasalo sa panlabas na boundary, ibinabalot sa structured na `ZapwebpError`, at inihahatid nang may kasamang malinaw na solusyon nang hindi naglalantad ng nakalilitong runtime stack traces.

---

## Mga boundary sa bawat surface

- **CLI**: Naka-wrap ang `main()` sa `try/catch`; naglalabas ng malinis na error banner at tamang exit code nang walang raw stack trace.
- **Web App**: Naka-isolate ang mga component at Web Worker; nagpapakita ng error card na may auto-retry button sa halip na mag-crash ang buong pahina.
- **MCP Server**: Ang bawat tool call ay may safety try/catch; nagbabalik ng JSON-RPC error na may `suggestedFix` nang hindi nagka-crash ang server.
- **VS Code**: Naka-wrap ang bawat command sa toast notification handler upang maiwasan ang paghinto ng extension host.
- **Vite at Next.js**: Naglalabas ng compiler warning at pinapanatili ang orihinal na imahe nang hindi pinapatay ang project build.
- **Storage Adapters**: May built-in na 3-attempt exponential backoff retry para sa mga panandaliang problema sa koneksyon sa network.
- **Laravel**: Naka-log ang mga babala sa pamamagitan ng `Log::warning` habang pinapanatili ang orihinal na upload file nang walang HTTP 500.

---

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_WASM_FAILED` | Hindi ma-initialize ang WebAssembly | Tiyaking may suporta sa WebAssembly ang browser |
| `E_MODEL_FAILED` | Hindi nag-load ang AI detection model | Kusang lumilipat sa Smart-Subject saliency |
| `E_UPLOADER_REQUIRED` | Walang aktibong conversion handler | Magpasa ng conversion callback function |

## Related

- [Errors](/errors): Kumpletong listahan ng 22 error codes.
- [Safety](/safety): Patakaran sa seguridad at defensive vector parsing.
- [CLI](/cli): Paggamit ng terminal CLI at mga flag nito.

## For agents

```json
{
  "stability": {
    "zeroStackTraces": true,
    "structuredErrors": true,
    "gracefulDegradation": true
  }
}
```

