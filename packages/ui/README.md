# `@zapwebp/ui`

<p align="center">
  <img src="/assets/packages-readme-icons/zapwebp-core.svg" alt="@zapwebp/ui logo" width="64" height="64" />
</p>

Zapwebp's official design system, token engine, motion vocabulary, and accessible UI primitives.

## Features

- **Strict Token Layering**: Primitives (`primitives.css`) &rarr; Semantic tokens (`semantic.css`) &rarr; Component styles.
- **Fluid Typography**: Clamp-based scaling (`--step--1` through `--step-5`) for fluid responsive design without layout-shifting media queries.
- **Centralized Motion**: Single source of truth for duration (`instant`, `fast`, `base`, `slow`, `slower`), easing (`standard`, `spring`, `exit`, `smooth`), and `prefers-reduced-motion` compliance.
- **12 Accessible Primitives**: `Button`, `IconButton`, `Input`, `Switch`, `Badge`, `Card`, `Dropzone`, `Progress`, `Dialog`, `Toast`, `Skeleton`, and `Tooltip`.
- **Tailwind Preset**: Out-of-the-box Tailwind CSS preset (`tailwind.preset.js`) mapping semantic variables to Tailwind utility classes.

## Installation

```bash
pnpm add @zapwebp/ui
```

## Usage

### CSS Tokens

```css
@import "@zapwebp/ui/tokens";
```

### Motion Tokens

```js
const { duration, easing, reducedMotion } = require('@zapwebp/ui/motion');

console.log(duration.base); // "220ms"
console.log(easing.standard); // "cubic-bezier(0.2, 0, 0, 1)"
```

### Tailwind Configuration

```js
// tailwind.config.js
const { zapPreset } = require('@zapwebp/ui/preset');

module.exports = {
  presets: [zapPreset],
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
};
```

### Primitives

```js
const { renderButton, renderBadge, renderSwitch } = require('@zapwebp/ui');

const buttonHtml = renderButton({ label: 'Convert', variant: 'primary', size: 'md' });
const badgeHtml = renderBadge({ text: 'Alpha Safe', variant: 'success' });
const switchHtml = renderSwitch({ id: 'clean-switch', checked: true, label: 'Clean Mode' });
```

---

## Design System Guardrails

To maintain visual harmony across the ecosystem, all components adhere to strict semantic token rules. See [Palette Usage Rules & Guardrails](PALETTE_RULES.md).

## License

MIT © Zapwebp Team
