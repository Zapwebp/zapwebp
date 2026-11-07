# Contributing

Covers: Development workflow, environment setup, core architectural rules, pull request checklist, and testing guidelines for contributors.

Does not cover: Language localization and catalog translation. See [Translators](/translators).

Applies to: All contributors, issue reporters, and pull request authors across all `@zapwebp` packages.

## Quick start

```bash
# 1. Clone and install dependencies
git clone https://github.com/Zapwebp/zapwebp.git
cd zapwebp && pnpm install

# 2. Run test suites across all packages
pnpm test
```

## What it does

Zapwebp is governed by strict Enterprise Architecture principles to ensure high maintainability, zero bloat, and complete transparency preservation across all conversion pipelines.

### The Two Core Architectural Rules

1. **Dependencies Point Down Only**:
   - `apps/web` (Presentation) $\rightarrow$ `@zapwebp/features` $\rightarrow$ `@zapwebp/ui` $\rightarrow$ `@zapwebp/core` $\rightarrow$ `@zapwebp/shared` (Contracts).
   - `@zapwebp/core` must **never** import from UI or feature layers.
2. **Never Hardcode a Hex Color**:
   - Component styles must consume design tokens from `@zapwebp/ui` (`tokens.css`). Raw hex colors are prohibited in presentation code.

### Development Workflow

| Task | Command | Description |
|---|---|---|
| **Dev Server** | `pnpm dev` | Run local web server with hot-reload on port 3000 |
| **Workspace Tests** | `pnpm test` | Execute test suites across all 20 packages |
| **Docs Bundle** | `pnpm run build:docs` | Compile documentation SPA to `public/docs.js` |
| **LLMS Manifest** | `pnpm run build:llms` | Generate `public/llms.txt` mirrors |
| **Locale Validator** | `pnpm run validate-locales` | Validate catalog parity and placeholder alignment |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `test_failure` | Regression detected during `pnpm test` run | Fix unit test assertions before opening PR |
| `lint_failure` | ESLint or architecture rule violation detected | Ensure dependencies point down and token usage |

## For agents

```json
{
  "project": "Zapwebp",
  "packageManager": "pnpm",
  "monorepo": "pnpm-workspace",
  "scripts": ["pnpm dev", "pnpm test", "pnpm run build:docs"],
  "rules": ["dependencies-point-down", "tokenized-colors", "100-percent-tests"]
}
```

## Related

- [Developers Overview](/developers): Scaffolding and custom plugin authoring.
- [Code of Conduct](/code-of-conduct): Community interaction standards.
- [Translators](/translators): Internationalization contribution guide.
