# Contributing to Zapwebp

Thank you for your interest in contributing to Zapwebp. Zapwebp is an open-source, enterprise-grade image processing platform committed to transparency safety, zero telemetry, high performance, and robust software craftsmanship.

We welcome contributions from developers, technical writers, and translators. This guide outlines our architectural standards, local development setup, testing requirements, and pull request workflow.

All contributors are expected to uphold our [Code of Conduct](/code-of-conduct).

---

## 1. Development Environment Setup

### Prerequisites
- **Node.js**: Version `>= 22.0.0` is required across all packages.
- **Package Manager**: `pnpm 11.9.0` is required for monorepo workspace management.
- **Git**: For version control and branch management.

### Initial Setup
Clone the monorepo and install dependencies:

```bash
git clone https://github.com/Zapwebp/zapwebp.git
cd zapwebp
pnpm install
```

### Essential Commands

| Task | Command | Description |
|---|---|---|
| **Local Dev Server** | `pnpm dev` | Starts local development server on port 3000 (`node --watch server.js`). |
| **All Test Suites** | `pnpm test` | Runs all 20+ package test suites, documentation tests, and proof verification. |
| **Single Package Test** | `pnpm --filter @zapwebp/core test` | Runs tests for a specific workspace package. |
| **Documentation Test** | `node --test test/docs.test.js` | Validates documentation templates, routes, and links. |
| **Validate Locales** | `node scripts/validate-locales.js` | Asserts key parity and variable preservation across translation catalogs. |
| **Build Docs Client** | `pnpm run build:docs` | Bundles documentation application to `public/docs.js`. |
| **Build Standalone Docs** | `npm run build --prefix zapwebp-docs` | Builds the standalone documentation web application. |
| **Build llms.txt Catalog** | `pnpm build:llms` | Generates `public/llms.txt` and `zapwebp-docs/public/llms.txt`. |
| **CLI Direct Execution** | `node packages/cli/bin/zap.js <file>` | Runs the CLI binary directly from local source. |
| **Create Changeset** | `pnpm changeset` | Documents user-facing changes and version increments. |

---

## 2. Core Architectural Standards

Every contribution must adhere to the Zapwebp Operating Contract (`AGENTS.md`):

### Rule 1: Dependencies Point Down Only
Dependency flow is strictly one-directional:
$$\text{apps/*} \longrightarrow \text{packages/features} \longrightarrow \text{packages/core} \longrightarrow \text{packages/shared}$$
- Core engine packages (`@zapwebp/core`) must **never** import from UI or feature layers.
- Circular dependencies between packages are strictly blocked.

### Rule 2: Tokenized Design System (No Hardcoded Hex Colors)
All user interface components in `@zapwebp/ui` and the web application must consume tokens from `public/tokens.css`. Direct hardcoded hex color codes in application CSS or component code are prohibited.

### Rule 3: Zero Telemetry & Memory-Only Execution
Never add analytics trackers, telemetry scripts, or remote error beacons (e.g. Sentry, LogRocket, Google Analytics). Conversions must execute in local memory with zero unprompted outbound network requests.

### Rule 4: Fail Loudly & Transparently
Never silently discard an alpha transparency channel or paper over unhandled errors with masking defaults. If transparency cannot be preserved, throw a structured `ZapwebpError` with a clear cause and actionable fix.

### Rule 5: Production Code Only
Do not commit mocks, stubs, placeholders, or `TODO: implement later` blocks into shipped packages. Test doubles are permitted strictly inside test files.

---

## 3. Pull Request Guidelines

To ensure smooth review and release automation, follow these steps when preparing a pull request:

### 1. Branch Naming
Create a feature branch with a descriptive prefix:
- `feat/feature-name` (New features or capabilities)
- `fix/issue-description` (Bug fixes and remediations)
- `docs/page-updates` (Documentation additions or corrections)
- `perf/optimization` (Performance enhancements)

### 2. Commit Message Conventions
We follow the Conventional Commits specification:
```
feat(cli): add --concurrency flag for batch operations
fix(core): handle 16-bit transparent PNG palette correctly
docs(mcp): document batch_convert limits parameters
```

### 3. Changeset Documentation
If your pull request introduces a bug fix, new feature, deprecation, or breaking change, generate a changeset:
```bash
pnpm changeset
```
Follow the interactive prompt to select the affected packages and write a clear summary of the change.

### 4. Quality & Pre-Flight Verification
Before opening your PR, ensure all checks pass locally:
```bash
pnpm test
node scripts/validate-locales.js
node scripts/check-zero-telemetry.js
```

---

## 4. Code Style & Documentation Standards

- **Code Style**: Standard clean JavaScript and TypeScript, strict equality (`===`), early returns, and guard clauses.
- **In-Code Comments**: Explain *why* a particular decision was made, never *what* the code does. If the code requires an explanation of what it does, refactor it into self-documenting functions.
- **Docstrings**: JSDoc or TSDoc comments must accompany every public function, class, and method, documenting `@param`, `@returns`, and `@throws`.
- **Documentation Parity**: When adding or updating platform features, update the corresponding documentation in `content/` and ensure synchronization with `zapwebp-docs/content/`.

---

## 5. Getting Help & Support

If you have questions about architecture, need guidance on implementing a new format plugin, or want to discuss a proposed feature before writing code, open an issue or start a discussion on our official repository:

- **GitHub Discussions:** [https://github.com/Zapwebp/zapwebp/discussions](https://github.com/Zapwebp/zapwebp/discussions)
- **Maintainer Contact:** `eldrexdelosreyesbula@gmail.com`
