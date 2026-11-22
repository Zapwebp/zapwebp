# Gabay sa Pag-aambag sa Zapwebp

Salamat sa iyong interes na mag-ambag sa Zapwebp. Ang Zapwebp ay isang open-source na platform para sa pagpoproseso ng imahe na nakatuon sa transparency safety, zero telemetry, mataas na performance, at malinis na software engineering.

Inaasahan ang lahat ng nag-aambag na sundin ang aming [Alituntunin sa Pag-uugali](/code-of-conduct).

---

## 1. Paghahanda ng Kapaligiran sa Pagbuo

### Mga Kinakailangan
- **Node.js**: Bersyon `>= 22.0.0` para sa lahat ng package.
- **Package Manager**: `pnpm 11.9.0` para sa pamamahala ng monorepo.
- **Git**: Para sa version control.

### Unang Pag-setup
```bash
git clone https://github.com/Zapwebp/zapwebp.git
cd zapwebp
pnpm install
```

### Mga Pangunahing Command

| Gawain | Command | Deskripsyon |
|---|---|---|
| **Dev Server** | `pnpm dev` | Simulan ang local dev server sa port 3000. |
| **Lahat ng Test** | `pnpm test` | Patakbuhin ang lahat ng unit at integration test suites. |
| **Docs Test** | `node --test test/docs.test.js` | Suriin ang pagsunod ng mga documentation page. |
| **Validate Locales** | `node scripts/validate-locales.js` | Suriin ang key parity sa mga translation catalog. |
| **I-build ang Docs** | `pnpm run build:docs` | I-bundle ang docs application sa `public/docs.js`. |
| **Gumawa ng Changeset** | `pnpm changeset` | I-dokumento ang mga pagbabago para sa release. |

---

## 2. Mga Pangunahing Simulain sa Arkitektura

1. **Pababang Daloy ng Dependency**:
   $$\text{apps/*} \longrightarrow \text{packages/features} \longrightarrow \text{packages/core} \longrightarrow \text{packages/shared}$$
   Hindi kailanman nag-iimport ang `@zapwebp/core` mula sa UI o feature layers.
2. **Design Tokens Lamang**: Lahat ng kulay ay dapat magmula sa `public/tokens.css`. Bawal ang hardcoded hex colors sa component styles.
3. **Zero Telemetry**: Bawal magdagdag ng analytics, tracking cookies, o phone-home network calls.
4. **Fail Loudly**: Huwag kailanman tahimik na ibasura ang alpha transparency channel.

---

## 3. Proseso ng Pull Request

1. Gumawa ng branch gamit ang tamang prefix (`feat/`, `fix/`, `docs/`).
2. Sumulat ng commit messages alinsunod sa Conventional Commits.
3. Magdagdag ng changeset gamit ang `pnpm changeset` kapag may pagbabago sa code.
4. Siguraduhing pumapasa ang lahat ng pagsusuri: `pnpm test`.

Para sa mga tanong, sumali sa talakayan sa [GitHub Discussions](https://github.com/Zapwebp/zapwebp/discussions).
