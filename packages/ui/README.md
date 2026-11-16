<p align="center">
  <img src="/assets/packages-readme-icons/zapwebp-core.svg" alt="@zapwebp/ui logo" width="64" height="64" />
</p>

# @zapwebp/ui

Zapwebp's official design system, token engine, motion vocabulary, and accessible UI primitives.

Covers: Universal CSS design tokens, accessible UI primitives (Dropzone, Modal, Card, Toast, Button), motion vocabulary, Tailwind preset, and framework adapters (React, Vue, Svelte, Blade, Vanilla).

Does not cover: Server-side rasterization, cloud storage adapters, or CLI command parsing.

Applies to: `@zapwebp/ui` v1.0.0 and later, modern evergreen browsers (WCAG 2.2 AA compliant).

## Quick start

```bash
pnpm add @zapwebp/ui
```

```javascript
import '@zapwebp/ui/tokens';
import { renderButton, renderBadge, renderSwitch } from '@zapwebp/ui';

const buttonHtml = renderButton({ label: 'Convert', variant: 'primary', size: 'md' });
const badgeHtml = renderBadge({ text: 'Alpha Safe', variant: 'success' });
const switchHtml = renderSwitch({ id: 'clean-switch', checked: true, label: 'Clean Mode' });
```

## What it does

`@zapwebp/ui` provides zero-dependency, framework-agnostic design system tokens and accessible web primitives:
- **Strict Token Layering**: Primitives (`primitives.css`) &rarr; Semantic tokens (`semantic.css`) &rarr; Component styles.
- **Fluid Typography**: Clamp-based scaling (`--step--1` through `--step-5`) for fluid responsive design without layout-shifting media queries.
- **Centralized Motion**: Single source of truth for duration (`instant`, `fast`, `base`, `slow`, `slower`), easing (`standard`, `spring`, `exit`, `smooth`), and `prefers-reduced-motion` compliance.
- **12 Accessible Primitives**: `Button`, `IconButton`, `Input`, `Switch`, `Badge`, `Card`, `Dropzone`, `Progress`, `Dialog`, `Toast`, `Skeleton`, and `Tooltip`.
- **Tailwind Preset**: Out-of-the-box Tailwind CSS preset (`tailwind.preset.js`) mapping semantic variables to Tailwind utility classes.

### Tailwind Configuration

```javascript
// tailwind.config.js
const { zapPreset } = require('@zapwebp/ui/preset');

module.exports = {
  presets: [zapPreset],
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
};
```

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_TOKEN_MISSING` | Required CSS design token variable is undefined | Ensure `@zapwebp/ui/tokens` is imported |
| `E_A11Y_LABEL_MISSING` | Interactive primitive lacks `aria-label` or visible text | Provide required `label` parameter |
| `E_CONTAINER_NOT_FOUND` | DOM mount node does not exist when mounting component | Verify target element ID in the DOM |

## For agents

```json
{
  "tool": "@zapwebp/ui",
  "components": [
    "renderButton",
    "renderBadge",
    "renderSwitch",
    "showError",
    "dismissAllErrors",
    "ZapDropzone",
    "ZapModal"
  ],
  "accessibility": "WCAG 2.2 AA compliant",
  "presets": ["default", "minimal", "glass", "dark"]
}
```

## Related

- [UI Kit Documentation](https://zapwebp-docs.vercel.app/ui): Visual component catalog and interactive previews.
- [UI SDK Reference](https://zapwebp-docs.vercel.app/sdk/ui): Programmatic JavaScript API and Web Components.
- [Palette Rules](PALETTE_RULES.md): Guardrails for color tokens and contrast.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
