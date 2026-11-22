# Limitasyon ng File at Kontrol sa Bilis

Covers: `maxFilesPerRequest`, `maxFilesPerSession`, `maxFilesPerUser`, `maxBytesPerRequest`, `maxConcurrent`, `rateLimit`, session persistence sa `.zapwebp/session.json`, at standard na response metadata sa lahat ng Zapwebp surface.

Does not cover: Commercial telemetry o pagsubaybay sa remote database. Tingnan ang [Privacy](/privacy).

Applies to: Lahat ng Zapwebp surface (CLI, MCP Server, Web App, SDK, at Storage Adapters) v2.28.0 at mas bago.

## Quick start

I-configure ang iyong kontrata sa `.zapwebp/config.json`:

```json
{
  "limits": {
    "maxFilesPerRequest": 20,
    "maxFilesPerSession": 100,
    "maxFilesPerUser": null,
    "maxBytesPerRequest": 104857600,
    "maxConcurrent": 4,
    "rateLimit": {
      "maxRequests": 100,
      "windowMs": 60000
    }
  }
}
```

Maaari ding i-override direkta mula sa CLI:

```bash
zap "src/assets/*.svg" --max-files 10 --concurrency 2
```

O magpatakbo nang walang limitasyon:

```bash
zap "src/assets/*.svg" --unlimited
```

## What it does

Bawat Zapwebp surface ay nagbibigay ng pinag-isang limitasyon sa throughput upang maiwasan ang pagkaubos ng memorya at labis na paggamit ng API. Ang parehong config keys, error codes, at response metadata ay ipinapatupad sa terminal, AI agents, cloud storage adapters, web app, at Node.js/TypeScript SDK.

### Anim na Uri ng Limitasyon

| Limitasyon | Uri | Default | Deskripsyon | Surfaces |
|---|---|---|---|---|
| `maxFilesPerRequest` | `number \| null` | `20` | Pinakamaraming file sa isang conversion batch | Web, Storage, SDK, MCP, CLI |
| `maxFilesPerSession` | `number \| null` | `100` | Pinakamaraming file na naproseso sa isang session | Web, CLI |
| `maxFilesPerUser` | `number \| null` | `null` | Pinakamaraming file bawat authenticated user | Storage Adapters, SDK |
| `maxBytesPerRequest` | `number \| null` | `104857600` (100 MB) | Pinakamalaking kabuuang byte size ng batch | Lahat ng surface |
| `maxConcurrent` | `number` | `4` | Alias para sa `concurrency.perRequest` | Lahat ng surface |
| `concurrency.perRequest` | `number` | `4` | Sabay-sabay na conversion worker sa bawat batch | Lahat ng surface |
| `concurrency.perUser` | `number \| null` | `4` | Aktibong sabay-sabay na trabaho bawat user | Storage, SDK, Express API |
| `concurrency.global` | `number \| null` | `16` | Kabuuang hangganan ng concurrency sa buong server | Storage, SDK, Express API |
| `rateLimit` | `object \| null` | `{ maxRequests: 100, windowMs: 60000 }` | Sliding window rate limiter | Storage, MCP, SDK |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_TOO_MANY_FILES` | Lumampas ang bilang ng file sa `maxFilesPerRequest`. | Hatiin sa mas maliliit na batch o taasan ang `maxFilesPerRequest` sa config. |
| `E_REQUEST_TOO_LARGE` | Lumampas ang kabuuang byte size sa `maxBytesPerRequest`. | Bawasan ang laki ng file o taasan ang `maxBytesPerRequest`. |
| `E_SESSION_LIMIT_EXCEEDED` | Naabot ang limitasyon ng session sa `maxFilesPerSession`. | Patakbuhin ang `zap --reset-session` o buksan muli ang browser tab. |
| `E_USER_LIMIT_EXCEEDED` | Naubos ng user ang kanilang file quota. | Maghintay ng reset o taasan ang `maxFilesPerUser`. |
| `E_CONCURRENCY_LIMIT_EXCEEDED` | Lumampas ang sabay-sabay na conversion sa user o global na limit. | Maghintay na matapos ang kasalukuyang conversion o taasan ang concurrency settings. |
| `E_RATE_LIMIT` | Masyadong mabilis ang mga request sa rate limiter window. | Maghintay ayon sa `resetIn` segundo bago subukan muli. |

## For agents

```json
{
  "$schema": "https://zapwebp-docs.vercel.app/schemas/limits.json",
  "contract": "zapwebp/limits@1.0.0",
  "defaults": {
    "maxFilesPerRequest": 20,
    "maxFilesPerSession": 100,
    "maxFilesPerUser": null,
    "maxBytesPerRequest": 104857600,
    "maxConcurrent": 4,
    "rateLimit": {
      "maxRequests": 100,
      "windowMs": 60000
    }
  }
}
```

## Related

- [Command Line Interface (CLI)](/cli)
- [Model Context Protocol (MCP)](/mcp)
- [Target Locking](/lock-target)
- [Mga Error](/errors)
- [Storage Adapters](/plugins/storage)
