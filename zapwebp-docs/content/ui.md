# UI Kit

Covers: framework-agnostic error mapping, notifications, file uploads, theming presets, and framework adapters for React, Vue, Svelte, Blade, and Vanilla Web Components.

Does not cover: low-level C libvips compilation flags, backend filesystem permissions, or CLI process exit signals. See [Core](/sdk/core) and [CLI](/cli).

Applies to: Zapwebp v2.2.0 and later.

## Quick start

```bash
pnpm add @zapwebp/ui
```

```javascript
import { showError, ZapDropzone } from '@zapwebp/ui';

// Show a localized, accessible error modal, banner, or toast
showError('E_UNSAFE_SVG');

// Mount an accessible drag-and-drop zone
const dropzone = new ZapDropzone({
  accept: 'image/*',
  maxBytes: 5242880,
  onFilesSelected: (files) => console.log('Selected files:', files),
});
dropzone.mount(document.getElementById('upload-area'));
```

## What it does

Zapwebp handles the conversion; `@zapwebp/ui` handles the communication. When an upload fails, users never see raw machine error codes. They receive clean, branded, WCAG 2.1 AA accessible feedback with one-click self-correcting retries.

The kit provides a zero-dependency vanilla DOM core with thin adapters (<100 lines each) for React, Vue, Svelte, and Laravel Blade.

### Primitives & Components

| Primitive | Tag / Class | Purpose | Accessibility |
|---|---|---|---|
| `<ZapToast />` | `<zap-toast>` | Ephemeral notification that auto-dismisses | `role="status"` or `role="alert"` |
| `<ZapBanner />` | `<zap-banner>` | Persistent inline or sticky message for non-blocking issues | `role="region"`, action buttons |
| `<ZapModal />` | `<zap-modal>` | Blocking dialog requiring user resolution | `role="dialog"`, `aria-modal="true"`, focus trap |
| `<ZapErrorCard />` | `<zap-error-card>` | Detailed error report with code, cause, fix, and doc link | `role="alert"`, copyable error code |
| `<ZapDropzone />` | `<zap-dropzone>` | Drag & drop, Ctrl+V clipboard paste, and file picker | Keyboard activatable (Enter/Space) |
| `<ZapUploadButton />` | `<zap-upload-button>` | Minimal button triggering file picker | Standard `<button>` with hidden file input |
| `<ZapUploadProgress />` | `<zap-upload-progress>` | Progress bar tracking total, completed, and failed counts | `role="progressbar"`, `aria-valuenow` |

## Theming & Presets

Every component is styled via CSS custom properties. Overrides apply instantly without rebuilds:

```css
:root {
  --zap-primary: #8dc63f;
  --zap-ink: #20211f;
  --zap-bg: #f7f7f4;
  --zap-surface: #ffffff;
  --zap-border: #e7e8e1;
  --zap-radius: 10px;
}
```

### Presets

1. **Default**: Zapwebp brand green styling.
2. **Minimal** (`data-zap-theme="minimal"`): Crisp black and white, zero shadows, square borders.
3. **Glass** (`data-zap-theme="glass"`): Translucent panels with background blur (`backdrop-filter: blur(14px)`).
4. **Dark** (`data-zap-theme="dark"`): High-contrast obsidian surface (`#151813`) with subtle borders.

## Framework Integration

### React & Next.js

```tsx
import { ZapDropzone, ZapToast, ZapModal, useZapError } from '@zapwebp/ui/react';

export function MediaUpload() {
  const { showError } = useZapError();

  const handleFiles = async (files: File[]) => {
    try {
      await uploadMedia(files);
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div>
      <ZapDropzone accept="image/*" onFilesSelected={handleFiles} />
      <ZapToast position="bottom-right" />
      <ZapModal />
    </div>
  );
}
```

### Vue 3

```vue
<template>
  <ZapDropzone accept="image/*" @files="handleFiles" />
  <ZapToast position="bottom-right" />
</template>

<script setup>
import { ZapDropzone, ZapToast, useZapError } from '@zapwebp/ui/vue';

const { showError } = useZapError();

async function handleFiles(files) {
  try {
    await uploadMedia(files);
  } catch (err) {
    showError(err);
  }
}
</script>
```

### Laravel Blade

```blade
<x-zap-dropzone accept="image/*" max-bytes="5242880" />
<x-zap-toast position="bottom-right" />

<script>
  window.addEventListener('zap:error', (e) => {
    console.error('Zapwebp error:', e.detail);
  });
</script>
```

## Errors

| Code | Severity | Target Component | Default Resolution |
|---|---|---|---|
| `E_UNSAFE_SVG` | Error | `<ZapModal />` | Remove script tags, remote references, or pass allowUnsafe |
| `E_TOO_LARGE` | Warning | `<ZapBanner />` | Compress file or increase maxBytes allocation |
| `E_UNSUPPORTED_FORMAT` | Error | `<ZapToast />` | Supply SVG, PNG, JPEG, WebP, AVIF, GIF, or TIFF |
| `E_OUTPUT_TOO_LARGE` | Warning | `<ZapBanner />` | One-click auto-retry with quality 70 |
| `E_ALPHA_NOT_REPRESENTABLE` | Error | `<ZapModal />` | One-click auto-retry with background `#ffffff` |
| `E_CORRUPT_HEADER` | Error | `<ZapErrorCard />` | Re-download file or inspect headers |
| `E_CROP_EMPTY` | Error | `<ZapToast />` | Adjust bounding coordinates |
| `E_TARGET_LOCKED` | Warning | `<ZapBanner />` | Proceed with locked format or request override |

## For agents

```json
{
  "package": "@zapwebp/ui",
  "version": "1.1.0",
  "primitives": ["ZapToast", "ZapBanner", "ZapModal", "ZapErrorCard"],
  "upload": ["ZapDropzone", "ZapUploadButton", "ZapUploadProgress"],
  "frameworks": ["react", "vue", "svelte", "blade", "vanilla"],
  "theming": {
    "presets": ["default", "minimal", "glass", "dark"],
    "tokenPrefix": "--zap-"
  },
  "accessibility": {
    "standard": "WCAG 2.1 AA",
    "focusManagement": true,
    "reducedMotion": true
  }
}
```

## Related

- [Core Engine](/sdk/core): In-memory image processing and RGBA buffer pipelines.
- [SDK Overview](/sdk/cli): Client-side and server-side JS/TS SDK.
- [Errors Catalog](/errors): Comprehensive root cause analysis and resolution manual.
- [Formats Matrix](/formats): Input and output format support matrices.

