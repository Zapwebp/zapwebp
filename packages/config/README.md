<p align="center">
  <img src="/assets/packages-readme-icons/zapwebp-core.svg" alt="@zapwebp/config logo" width="64" height="64" />
</p>

# @zapwebp/config

Shared ESLint rules, formatting presets, and TypeScript base configurations across the Zapwebp monorepo.

Covers: Shared ESLint rules (strict hex color bans, downward dependency validation), Prettier configuration presets, and base TypeScript tsconfig compiler profiles.

Does not cover: Application runtime code, asset conversion, or deployment scripts.

Applies to: `@zapwebp/config` v1.0.0 and later, ESLint >=8.0.0, TypeScript >=5.0.0.

## Quick start

```bash
pnpm add -D @zapwebp/config
```

In `.eslintrc.js`:
```javascript
module.exports = {
  extends: ['@zapwebp/config/eslint'],
};
```

In `tsconfig.json`:
```json
{
  "extends": "@zapwebp/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

## What it does

`@zapwebp/config` guarantees architectural discipline and prevents architectural drift across the workspace:
1. **No Hardcoded Hex Colors**: Restricts literal hex strings in UI code (`/^#[0-9a-fA-F]{3,8}$/`), mandating the use of design tokens from `@zapwebp/ui`.
2. **Layered Monorepo Architecture**: Enforces that dependencies point down only (`apps` &rarr; `features` &rarr; `core` &rarr; `shared`). Core cannot import from UI or Features.
3. **Complexity Thresholds**: Flags excessive cyclomatic complexity (`complexity > 10`) and function length (`max-lines-per-function > 80`).
4. **Console Cleanliness**: Disallows stray `console.log` statements outside of `console.warn` and `console.error`.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `zapwebp/no-hardcoded-hex` | Hardcoded hex color literal found in source code | Use semantic CSS token from `@zapwebp/ui` |
| `zapwebp/downward-dependencies` | Upward or circular dependency imported across packages | Restructure imports to follow downward layer hierarchy |
| `zapwebp/no-console-log` | `console.log` used in production packages | Use structured logger or remove debugging statement |

## For agents

```json
{
  "tool": "@zapwebp/config",
  "configs": ["eslint", "tsconfig.base.json"],
  "rules": [
    "zapwebp/no-hardcoded-hex",
    "zapwebp/downward-dependencies",
    "zapwebp/no-console-log"
  ]
}
```

## Related

- [Design System Guide](https://zapwebp-docs.vercel.app/ui): Token architecture rules.
- [Contributing Guide](https://zapwebp-docs.vercel.app/contributing): Development standards and linting gates.
- [Palette Rules](PALETTE_RULES.md): Color tokens and forbidden raw hex values.

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
