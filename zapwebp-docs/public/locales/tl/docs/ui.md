# UI Kit

Covers: balangkas ng mga UI component para sa error mapping, upload dropzones, custom web elements, at presets para sa React, Vue, Svelte, at Blade.

Does not cover: server-side command execution. Tingnan ang [CLI](/cli).

Applies to: `@zapwebp/ui` v2.2.0 at mas bago.

## Quick start

```bash
npm install @zapwebp/ui
```

I-install ang UI Kit upang magamit ang mga pre-built error dialog, banner, at toast components.

## What it does

Nagbibigay ang `@zapwebp/ui` ng mga accessible (WCAG 2.2 AA compliant), framework-agnostic na mga visual component para sa pagpapakita ng error, dropzone file upload, at interactive image preview. Awtomatiko nitong itinutugma ang mga structured error code ng Zapwebp sa mga angkop na modal, banner, o toast.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_COMPONENTS` | Hindi nahanap ang component sa tinukoy na framework | Tiyaking tama ang import path sa package |
| `E_A11Y_REDUCED_MOTION` | Paglabag sa reduced-motion preference ng user | I-enable ang graceful CSS transition fallbacks |

## For agents

```json
{
  "package": "@zapwebp/ui",
  "components": ["toast", "banner", "modal", "card", "dropzone"],
  "frameworks": ["vanilla", "react", "vue", "svelte", "blade"],
  "wcag": "2.2 AA"
}
```

## Related

- [UI SDK](/sdk/ui): Programmatic component mounting at lifecycle hooks.
- [Errors](/errors): Listahan ng mga error na may visual mapping sa UI Kit.
