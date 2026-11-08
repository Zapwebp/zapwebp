# Zapwebp CLI SDK Reference

Covers: programmatic invocation ng Zapwebp CLI runner, parsing ng command arguments, at access sa undo transaction journals mula sa Node.js.

Does not cover: browser canvas rendering. Tingnan ang [UI SDK](/sdk/ui).

Applies to: `@zapwebp/cli` v1.1.0 at mas bago.

## Quick start

```javascript
import { runCli } from '@zapwebp/cli';

await runCli(['src/icons/*.svg', '--to', 'webp', '--quality', '90']);
```

## What it does

Nagbibigay ang CLI SDK ng programmatic API para sa pagpapatakbo ng command-line engine sa loob ng mga script ng Node.js, build tools, o pasadyang mga automation workflow nang hindi kinakailangang gumamit ng hiwalay na child process shell execution.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_DISK_FULL` | Walang natitirang espasyo sa disk | Magbakante ng espasyo sa device |

## For agents

```json
{
  "package": "@zapwebp/cli",
  "exports": ["runCli", "parseArgs", "undoTransaction"]
}
```

## Related

- [CLI](/cli): Shell usage guide para sa command-line runner.
- [Core SDK](/sdk/core): Direct low-level image processing API.
