# Contributing to Zapwebp

Thank you for contributing to Zapwebp! Zapwebp is designed as production-grade enterprise architecture with zero tracking, memory-only execution, and guaranteed transparency safety.

> **Official Documentation Portal:** Detailed developer guides, architectural patterns, and SDK specifications are published on our core documentation platform at [https://zapwebp-docs.vercel.app/contributing](https://zapwebp-docs.vercel.app/contributing) and [https://zapwebp-docs.vercel.app/developers](https://zapwebp-docs.vercel.app/developers). Raw agent specifications are mirrored at [https://zapwebp-docs.vercel.app/content/contributing.md](https://zapwebp-docs.vercel.app/content/contributing.md).

---

## 🎯 Good First Issues

- Adding a new format handler to `@zapwebp/core` (see [`contributing/adding-a-format.md`](contributing/adding-a-format.md)).
- Adding unit tests for format edge cases (e.g. malformed chunks, extreme aspect ratios).
- Enhancing accessibility and ARIA states in `@zapwebp/ui`.
- Updating agentic documentation and error catalogs.

---

## 🚀 Development Workflow

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Run local web server with hot-reload (port 3000)
pnpm dev

# 3. Run all test suites across all packages
pnpm test

# 4. Build extension and LLMS documentation
pnpm build:vscode
pnpm build:llms
```

---

## 🏛️ The Two Core Architectural Rules

### Rule 1: Dependencies Point Down Only

```
apps/web (Presentation)
  ↓
@zapwebp/features (Application / Slices)
  ↓
@zapwebp/ui (Design System)
  ↓
@zapwebp/core (Pure Domain Engine)
  ↓
@zapwebp/shared (Contracts & Constants)
```

- `@zapwebp/core` must **never** import from `@zapwebp/ui` or `@zapwebp/features`.
- Presentation apps must **never** leak into packages.
- This rule is enforced by ESLint in `@zapwebp/config`.

### Rule 2: Never Hardcode a Hex Color

- Never use raw `#hex` codes in component or feature code.
- Always use semantic tokens from `@zapwebp/ui` (e.g. `--color-surface`, `--color-accent`, `--color-border`).
- Review [`contributing/palette-rules.md`](contributing/palette-rules.md) before styling components.

---

## ✅ Pull Request Checklist

Before submitting a PR, verify:

- [ ] All tests pass: `pnpm test`.
- [ ] No hardcoded `#hex` colors in UI or application code.
- [ ] JSDoc / TSDoc annotations exist on all exported functions with `@param`, `@returns`, and `@throws`.
- [ ] ADR added in `docs/adr/` if an architectural pattern or public contract was modified.
- [ ] Meaningful changes documented in `CHANGELOG.md` under `Keep a Changelog` format.

---

## 📚 Related Documentation

- [Contributing Guide (Docs)](https://zapwebp-docs.vercel.app/contributing)
- [Developers Overview](https://zapwebp-docs.vercel.app/developers)
- [Code of Conduct](https://zapwebp-docs.vercel.app/code-of-conduct)
- [Translators & Internationalization](https://zapwebp-docs.vercel.app/translators)
