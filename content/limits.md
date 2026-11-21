# Configurable Limits & Rate Controls

Covers: `maxFilesPerRequest`, `maxFilesPerSession`, `maxFilesPerUser`, `maxBytesPerRequest`, `maxConcurrent`, multi-tier concurrency (`perRequest`, `perUser`, `global`), multi-instance atomic rate limiting with `FileRateLimitStore`, universal session persistence in `.zapwebp/session.json`, and standardized response metadata across all Zapwebp surfaces.

Does not cover: Commercial telemetry, third-party analytics trackers, or remote cloud surveillance. See [Privacy](/privacy).

Applies to: All Zapwebp surfaces (CLI, MCP Server, Web App, SDK, and Storage Adapters) v2.28.0 and later.

## Quick start

Define your limits contract in `.zapwebp/config.json`:

```json
{
  "limits": {
    "maxFilesPerRequest": 20,
    "maxFilesPerSession": 100,
    "maxFilesPerUser": null,
    "maxBytesPerRequest": 104857600,
    "maxConcurrent": 4,
    "concurrency": {
      "perRequest": 4,
      "perUser": 4,
      "global": 16
    },
    "rateLimit": {
      "maxRequests": 100,
      "windowMs": 60000
    }
  }
}
```

Override directly from the CLI:

```bash
zap "src/assets/*.svg" --max-files 10 --concurrency 2
```

Or process without constraints:

```bash
zap "src/assets/*.svg" --unlimited
```

Reset active session:

```bash
zap --reset-session
```

## What it does

Every Zapwebp surface provides unified, configurable throughput boundaries to prevent memory exhaustion, API abuse, and runaway batch conversions. The same configuration keys, error codes, and response metadata are honored identically across the terminal, AI agents, cloud storage adapters, the browser app, and the Node.js/TypeScript SDK.

### The Limits Matrix

| Limit | Type | Default | Description | Surfaces |
|---|---|---|---|---|
| `maxFilesPerRequest` | `number \| null` | `20` | Maximum files in a single batch conversion | Web, Storage, SDK, MCP, CLI |
| `maxFilesPerSession` | `number \| null` | `100` | Maximum files processed across a rolling session | Web, CLI, MCP |
| `maxFilesPerUser` | `number \| null` | `null` | Maximum files processed per authenticated user identifier | Storage Adapters, SDK |
| `maxBytesPerRequest` | `number \| null` | `104857600` (100 MB) | Maximum total input byte size across a single batch | All surfaces |
| `maxConcurrent` | `number` | `4` | Alias for `concurrency.perRequest` (batch worker pool) | All surfaces |
| `concurrency.perRequest` | `number` | `4` | Parallel conversion worker pool size per request | All surfaces |
| `concurrency.perUser` | `number \| null` | `4` | Active concurrent conversion jobs per user ID | Storage, SDK, Express API |
| `concurrency.global` | `number \| null` | `16` | Server-wide concurrent conversion ceiling | Storage, SDK, Express API |
| `rateLimit` | `object \| null` | `{ maxRequests: 100, windowMs: 60000 }` | Sliding window rate limiter (requests per window) | Storage, MCP, SDK, Express API |

Values can be specified as a positive number, `null` (no limit), or `"unlimited"`.

### Multi-Instance Rate Limiting

Rate limiting is not restricted to local process memory:
- **`MemoryRateLimitStore`** (Default): Fast, in-memory Map for standalone CLI runs, desktop apps, and tests.
- **`FileRateLimitStore`**: Atomic file-backed store (`.zapwebp/ratelimit.json`) using temporary file renaming and lock retries. Coordinates rate limits across multiple Node.js worker threads, PM2 cluster processes, or separate container instances mounting a shared volume without requiring an external database.
- **Custom Distributed Adapters**: Implements the `RateLimitStore` interface (`get`, `increment`, `clear`, with both sync and async APIs: `checkAsync`, `recordAsync`, `remainingAsync`, `resetInAsync`) for external backends like Redis, Cloudflare KV, or DynamoDB.

```javascript
import { RateLimiter, FileRateLimitStore } from '@zapwebp/shared';

// Multi-process coordinated rate limiter
const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  store: new FileRateLimitStore({ filePath: '.zapwebp/ratelimit.json' }),
});
```

### Multi-Tier Concurrency

Concurrency is clearly separated across three distinct scopes:
1. **`concurrency.perRequest`**: How many workers process an individual batch simultaneously (defaults to 4).
2. **`concurrency.perUser`**: How many separate conversion jobs an individual user or tenant can run at the same time (defaults to 4).
3. **`concurrency.global`**: The absolute server-wide ceiling across all users combined (defaults to 16).

If either `perUser` or `global` capacity is exhausted, `ConcurrencyLimiter` raises structured error `E_CONCURRENCY_LIMIT_EXCEEDED` with immediate retry suggestions.

### Universal Session Model

Sessions follow an identical state schema across the browser (`sessionStorage`), CLI (`.zapwebp/session.json`), MCP server, and SDK:

```json
{
  "sessionId": "zap-sess-3f1a2b4c-9d8e-4a7b-8c6d-5e4f3a2b1c0d",
  "surface": "cli",
  "createdAt": "2026-11-21T07:00:00.000Z",
  "updatedAt": "2026-11-21T07:15:00.000Z",
  "expiresAt": "2026-11-22T07:00:00.000Z",
  "filesProcessed": 42,
  "bytesProcessed": 8452100,
  "requestsCount": 3
}
```

- **Web App**: Persisted in `sessionStorage` under `zapwebp_session_v1`.
- **CLI**: Persisted atomically in `.zapwebp/session.json`. Reset with `zap --reset-session`.
- **MCP & SDK**: Handled via `SessionManager` with configurable rolling TTL.

### Response Limits Metadata

Every conversion response emits standardized headroom metadata:

```json
{
  "file": "hero.webp",
  "limits": {
    "filesProcessed": 1,
    "filesRemaining": 19,
    "bytesProcessed": 245000,
    "bytesRemaining": 104612600,
    "maxConcurrent": 4,
    "concurrency": {
      "perRequest": 4,
      "perUser": 4,
      "global": 16
    },
    "rateLimit": {
      "remaining": 99,
      "resetIn": 58
    },
    "session": {
      "maxFilesPerSession": 100,
      "usedFiles": 43,
      "remainingFiles": 57
    }
  }
}
```

## Errors

| Code | Cause | Recommended Fix |
|---|---|---|
| `E_TOO_MANY_FILES` | Batch item count exceeds `maxFilesPerRequest`. | Split into smaller batches or raise `maxFilesPerRequest` in configuration. |
| `E_REQUEST_TOO_LARGE` | Total input byte size exceeds `maxBytesPerRequest`. | Reduce input file sizes or increase `maxBytesPerRequest`. |
| `E_SESSION_LIMIT_EXCEEDED` | Total files processed in session exceeds `maxFilesPerSession`. | Run `zap --reset-session` or reopen browser tab to start a fresh session. |
| `E_USER_LIMIT_EXCEEDED` | Authenticated user has exceeded their assigned file quota. | Wait for quota window reset or increase `maxFilesPerUser`. |
| `E_CONCURRENCY_LIMIT_EXCEEDED` | Active simultaneous conversions exceed user or global ceiling. | Wait for running conversions to complete or raise concurrency settings. |
| `E_RATE_LIMIT` | Request frequency exceeds sliding window threshold. | Wait until `resetIn` seconds elapse or raise `rateLimit.maxRequests`. |

## For agents

```json
{
  "$schema": "https://zapwebp-docs.vercel.app/schemas/limits.json",
  "contract": "zapwebp/limits@1.0.0",
  "parameters": {
    "maxFilesPerRequest": {
      "type": "integer | null",
      "default": 20,
      "description": "Hard limit on images per single conversion batch."
    },
    "maxFilesPerSession": {
      "type": "integer | null",
      "default": 100,
      "description": "Cumulative session limit tracked in .zapwebp/session.json."
    },
    "maxBytesPerRequest": {
      "type": "integer | null",
      "default": 104857600,
      "description": "Maximum combined input payload in bytes."
    },
    "maxConcurrent": {
      "type": "integer",
      "default": 4,
      "description": "Batch worker pool concurrency."
    },
    "concurrency": {
      "type": "object",
      "properties": {
        "perRequest": { "type": "integer", "default": 4 },
        "perUser": { "type": "integer | null", "default": 4 },
        "global": { "type": "integer | null", "default": 16 }
      }
    },
    "rateLimit": {
      "type": "object | null",
      "default": { "maxRequests": 100, "windowMs": 60000 }
    }
  },
  "errors": {
    "E_TOO_MANY_FILES": {
      "retryable": true,
      "strategy": "Partition file list into slices of length <= maxFilesPerRequest and invoke batch_convert sequentially."
    },
    "E_REQUEST_TOO_LARGE": {
      "retryable": true,
      "strategy": "Downscale high-resolution assets or process files individually."
    },
    "E_SESSION_LIMIT_EXCEEDED": {
      "retryable": false,
      "strategy": "Execute CLI with --reset-session or ask user for confirmation to raise maxFilesPerSession."
    },
    "E_CONCURRENCY_LIMIT_EXCEEDED": {
      "retryable": true,
      "strategy": "Wait for active tasks to complete or reduce batch worker concurrency."
    },
    "E_RATE_LIMIT": {
      "retryable": true,
      "strategy": "Delay execution for resetIn seconds indicated in the error payload."
    }
  }
}
```

## Related

- [Command Line Interface (CLI)](/cli)
- [Model Context Protocol (MCP)](/mcp)
- [Target Locking (Many-to-One)](/lock-target)
- [Error Catalog & Diagnostics](/errors)
- [Storage Adapters](/plugins/storage)
