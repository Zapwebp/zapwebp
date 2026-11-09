# Stability & Error Boundaries

Covers: error boundaries across all runtime surfaces (CLI, Web App, MCP server, VS Code extension, Vite and Next.js plugins, GitHub Action, cloud storage adapters, and Laravel middleware), graceful degradation policies, and the zero stack trace guarantee.

Does not cover: operating system kernel crashes or third-party cloud infrastructure downtime.

Applies to: all Zapwebp surfaces v1.1.0 and later.

## Quick start

```bash
# Verify environment health and error recovery diagnostics
npx zapwebp doctor
```

Displays active runtime diagnostics, file system write permissions, and dependency health.

## What it does

Zapwebp enforces a strict "Never Breaks" stability guarantee across all interfaces. Unhandled exceptions are intercepted at the perimeter boundary of every surface, wrapped into structured `ZapwebpError` instances, and surfaced to users and AI agents with actionable remediation advice. Users never see raw runtime stack traces, and AI agents never receive unstructured error messages.

---

## Surface error boundaries

| Surface | Boundary Layer | Runtime Behavior |
|---|---|---|
| **CLI** | `main()` top-level `try/catch` wrapper | Formatted error banner, actionable fix, docs URL, clean exit code, zero stack trace. |
| **Web App** | Component error boundary + Web Worker onerror | Inline contextual error card with auto-retry; avoids full-screen whiteout crashes. |
| **MCP Server** | Tool handler execution boundary | JSON-RPC error response carrying `suggestedFix`; never crashes stdio/SSE server. |
| **VS Code** | Extension command dispatch wrapper | VS Code toast notification with error explanation; prevents extension host termination. |
| **Vite & Next.js** | Build hook and asset loader `try/catch` | Emits descriptive compiler warning, falls back to source image, prevents build abortion. |
| **GitHub Action** | Action step runner wrapper | GitHub Workflow `::error::` annotation with line reference; fails cleanly without crashing runner. |
| **Storage Adapters** | Operation wrapper with 3-attempt backoff | Retries transient network/rate-limit failures; fails fast with `E_AUTH` on permanent errors. |
| **Laravel** | Upload middleware `try/catch` + `Log::warning` | Fail-open logging error while preserving original upload; prevents HTTP 500 crashes. |

---

## Graceful degradation policies

When environment constraints or runtime dependencies encounter limitations, Zapwebp transitions into predictable fallback modes:

| Failure Mode | Fallback Strategy | User & Agent Experience |
|---|---|---|
| **WASM Engine Failure** | Native CLI / local worker fallback | Clean error message explaining environment requirements without UI freeze. |
| **AI Model Failure (Crop)** | Smart-Subject attention analysis | Instantly falls back to algorithmic saliency (`mode: 'subject'`) with 0 KB download. |
| **Body Detection Failure** | Smart-Subject attention analysis | Crops visually interesting region; reports `fallback: 'subject'` in metadata. |
| **Face Detection Failure** | Center gravity anchor | Anchors crop rectangle at image center without throwing `E_CROP_EMPTY`. |
| **IndexedDB Unavailable** | In-memory session store | App operates smoothly in private browsing tabs without local persistence. |
| **Reduced Motion Preference** | Instant DOM transitions | Respects `prefers-reduced-motion: reduce` by disabling all CSS animations. |

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_WASM_FAILED` | WebAssembly runtime cannot initialize | Ensure browser or environment supports WebAssembly |
| `E_MODEL_FAILED` | AI keypoint model failed to load | Automatically falls back to Smart-Subject saliency |
| `E_UPLOADER_REQUIRED` | Store instantiated without an upload handler | Pass an active conversion handler callback |

## Related

- [Errors](/errors): Comprehensive catalog of all 22 structured error codes.
- [Safety](/safety): Security model, SSRF defense, and vector sanitization.
- [CLI](/cli): Terminal command execution and doctor diagnostics.

## For agents

```json
{
  "boundaryGuarantees": {
    "stackTracesVisible": false,
    "structuredErrors": true,
    "suggestedFixProvided": true,
    "gracefulDegradation": true
  },
  "surfaces": ["cli", "web", "mcp", "vscode", "vite", "next", "github-action", "storage", "laravel"]
}
```
