# `@zapwebp/config`

<p align="center">
  <img src="/assets/packages-readme-icons/zapwebp-core.svg" alt="@zapwebp/config logo" width="64" height="64" />
</p>

Shared ESLint rules, formatting presets, and TypeScript base configurations across the Zapwebp monorepo.

## Rules Enforced

1. **No Hardcoded Hex Colors**: Restricts literal hex strings in UI code (`/^#[0-9a-fA-F]{3,8}$/`), mandating the use of design tokens from `@zapwebp/ui`.
2. **Layered Monorepo Architecture**: Enforces that dependencies point down only (`apps` &rarr; `features` &rarr; `core` &rarr; `shared`). Core cannot import from UI or Features.
3. **Complexity Thresholds**: Flags excessive cyclomatic complexity (`complexity > 10`) and function length (`max-lines-per-function > 80`).
4. **Console Cleanliness**: Disallows stray `console.log` statements outside of `console.warn` and `console.error`.

## License

MIT © Zapwebp Team
