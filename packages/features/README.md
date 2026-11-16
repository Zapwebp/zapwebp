<p align="center">
  <img src="/assets/packages-readme-icons/zapwebp-core.svg" alt="@zapwebp/features logo" width="64" height="64" />
</p>

# @zapwebp/features

Vertical feature slices and state machines powering Zapwebp's conversion, batch processing, clean mode, and multiplier scaling capabilities.

Covers: Vertical feature slices: conversion state machine, Web Worker message dispatching, batch manager queue, clean mode inspection service, and retina multiplier planning.

Does not cover: Low-level libvips image decoders, raw canvas manipulation, or HTTP REST route definitions.

Applies to: `@zapwebp/features` v1.0.0 and later, Node.js >=22.0.0, browser Web Workers.

## Quick start

```bash
pnpm add @zapwebp/features
```

```javascript
const { reduce, initialState, BatchManager, MultiplierService } = require('@zapwebp/features');

// 1. State machine reducer
let state = reduce(initialState, { type: 'ADD_FILES', files: [file1] });
state = reduce(state, { type: 'START' });

// 2. Multiplier planning
const plan = MultiplierService.plan({
  filename: 'icon.svg',
  baseWidth: 32,
  scales: [1, 2, 3],
  format: 'webp',
});
```

## What it does

`@zapwebp/features` houses isolated, testable business logic and state reducers that decouple UI from backend execution:
- **Convert State Machine**: Pure, deterministic state reducer (`idle` &rarr; `queued` &rarr; `converting` &rarr; `done` / `error`) eliminating race conditions.
- **Worker Message Dispatcher**: Off-main-thread Web Worker message handler with transferable array buffer support.
- **Batch Manager**: Concurrency-controlled async queue processor with progress events and failure isolation.
- **Clean Service**: AI provenance detection, metadata removal auditing, and cryptographic certificate verification.
- **Multiplier Service**: Responsive image planning (@1x, @2x, @3x) with `srcset` generation.

### Architecture Boundary

Dependencies point **down only**:
```
apps/web -> @zapwebp/features -> @zapwebp/core -> @zapwebp/shared
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_QUEUE_OVERFLOW` | Batch size exceeds maximum allowable queue length | Process assets in smaller batches |
| `E_WORKER_UNAVAILABLE` | Web Worker initialization failed or unsupported | Fall back to synchronous main-thread execution |
| `E_INVALID_ACTION` | Action dispatched to reducer is not recognized | Verify action type and payload contract |

## For agents

```json
{
  "tool": "@zapwebp/features",
  "modules": ["reduce", "initialState", "BatchManager", "MultiplierService", "CleanService"],
  "usage": "reduce(state, action) | new BatchManager(options).process(files)"
}
```

## Related

- [Core Engine](https://zapwebp-docs.vercel.app/sdk/core): Underlying format conversion engine.
- [UI Kit](https://zapwebp-docs.vercel.app/ui): Visual components consuming feature state.
- [Stability Masterplan](https://zapwebp-docs.vercel.app/stability): State machine reliability and failure isolation.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
