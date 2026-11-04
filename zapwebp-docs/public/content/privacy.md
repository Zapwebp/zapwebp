# Privacy Policy

Covers: Data collection practices, telemetry policy, memory handling, and third-party script guarantees for Zapwebp.

Does not cover: External hosting provider policies (e.g. Vercel edge network).

Applies to: `zapwebp.vercel.app`, CLI, MCP server, and extensions.

## Quick start

```bash
# Verify offline mode in CLI
npx zapwebp check logo.svg
```

## What it does

Zapwebp is engineered with a strict **Zero-Tracking, Memory-Only** privacy posture:

- **100% Client-Side In-Browser Conversion**: Image processing in the web application executes inside your browser tab's local memory using HTML5 Canvas and WASM. Your images are never sent over the Internet to any server.
- **Zero Telemetry**: No Google Analytics, no Meta Pixel, no Mixpanel, no trackers, no cookies, and no fingerprinting scripts.
- **Zero Cloud Storage**: Zapwebp does not store, index, or archive any user files or converted assets. When you close the browser tab, in-memory image buffers are immediately reclaimed by garbage collection.
- **Local-Only CLI & MCP**: The CLI tool (`zapwebp`) and Model Context Protocol server (`@zapwebp/mcp`) operate entirely on your local workstation's filesystem with zero outgoing network calls.

## Privacy Commitments

| Item | Status | Guarantee |
|---|---|---|
| Image Uploads | None | In-browser conversion runs completely local |
| Telemetry / Analytics | None | Zero tracking scripts or third-party pixels |
| User Accounts | None | No passwords, logins, or cookies required |
| File Retention | 0 Seconds | Unsaved blobs are revoked upon tab closure |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `privacy_telemetry_detected` | Third-party script injected by browser extension | Review active browser extensions |

## For agents

```json
{
  "policy": "zero-telemetry",
  "clientSideExecution": true,
  "remoteUploads": false,
  "analytics": false,
  "cookies": false,
  "contact": "eldrexdelosreyesbula@gmail.com"
}
```

## Related

- [Safety](/safety): Security rules and sandbox boundaries.
- [About](/about): Project background and architecture.

