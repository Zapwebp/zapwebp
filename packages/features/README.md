# `@zapwebp/features`

<p align="center">
  <img src="/assets/packages-readme-icons/zapwebp-core.svg" alt="@zapwebp/features logo" width="64" height="64" />
</p>

Vertical feature slices and state machines powering Zapwebp's conversion, batch processing, clean mode, and multiplier scaling capabilities.

## Architecture

Dependencies point **down only**:
```
apps/web -> @zapwebp/features -> @zapwebp/core -> @zapwebp/shared
```

## Features

- **Convert State Machine**: Pure, deterministic state reducer (`idle` &rarr; `queued` &rarr; `converting` &rarr; `done` / `error`) eliminating race conditions.
- **Worker Message Dispatcher**: Off-main-thread Web Worker message handler with transferable array buffer support.
- **Batch Manager**: Concurrency-controlled async queue processor with progress events and failure isolation.
- **Clean Service**: AI provenance detection, metadata removal auditing, and cryptographic certificate verification.
- **Multiplier Service**: Responsive image planning (@1x, @2x, @3x) with `srcset` generation.

## Usage

```js
const { reduce, initialState, BatchManager, MultiplierService } = require('@zapwebp/features');

// State machine
let state = reduce(initialState, { type: 'ADD_FILES', files: [file1] });
state = reduce(state, { type: 'START' });

// Multiplier planning
const plan = MultiplierService.plan({
  filename: 'icon.svg',
  baseWidth: 32,
  scales: [1, 2, 3],
  format: 'webp',
});
```

## License

MIT © Zapwebp Team
