# @zapwebp/ui Reference

Covers: User interface design tokens, accessible components, checkerboard viewports, and progress states.
Does not cover: Terminal ANSI styling or headless Node.js processing.
Applies to: `@zapwebp/ui` v1.0.0+.

## Quick start

```html
<link rel="stylesheet" href="@zapwebp/ui/tokens.css">
<div class="zap-checkerboard">
  <img src="logo.webp" alt="Transparency preserved">
</div>
```

## What it does

`@zapwebp/ui` exports standard CSS custom properties, WCAG 2.2 AA accessible design primitives, and interactive preview components used across the official Web App, documentation site, and Lens visual inspector. It enforces consistent color palettes, motion gates, and transparency verification styles.

## Options

| Variable / Class | Type | Default | Description |
|---|---|---|---|
| `--green-primary` | CSS Color | `#8dc63f` | Accent brand green |
| `--bg-dropzone` | CSS Color | `#ffffff` | Elevated surface background |
| `.zap-checkerboard` | CSS Class | - | 10px / 14px alpha transparency pattern |
| `.preview-modal` | CSS Component | - | Full-featured accessible modal dialog |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TOKEN_MISSING` | Required root variables not found | Import `tokens.css` before component styling |
| `E_CONTRAST_VIOLATION` | Foreground text contrast below 4.5:1 | Use provided semantic tokens (`--color-text`, `--color-text-muted`) |
| `E_A11Y_REDUCED_MOTION` | Animation triggers vestibular distress | Ensure `@media (prefers-reduced-motion)` overrides are present |

## For agents

```json
{
  "library": "@zapwebp/ui",
  "tokens": [
    "--green-primary",
    "--bg",
    "--bg-dropzone",
    "--border-mid",
    "--text-primary",
    "--gray-600"
  ],
  "components": [
    "zap-checkerboard",
    "preview-modal",
    "cockpit-bar",
    "result-card"
  ]
}
```

## Related

- [Clean Mode](/clean): How metadata removal operates in UI components.
- [Backgrounds](/backgrounds): Transparency and visual verification guidelines.
