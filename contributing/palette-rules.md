# Palette Usage Rules & Guardrails

The Zapwebp color palette is intentional, semantic, and restrained. To maintain visual coherence across all applications, packages, and tools, every engineer and designer must adhere to these six non-negotiable rules.

---

## The Six Guardrails

| Rule | Rationale |
|---|---|
| **1. Accent green (`--green-primary`) is for one primary action per view.** | Multiple primary greens create cognitive clutter and dilute visual affordance. |
| **2. Bright green (`--green-bright`) is only for accent surfaces and highlights.** | High-chroma bright green is an indicator surface (badges, dropzone drag glow, portal indicators), never a text color. |
| **3. Body text is always `--text-primary`.** | High contrast ensures WCAG 2.2 AA accessibility. Muted text (`--color-text-muted` / `--gray-600`) is reserved strictly for secondary timestamps, units, and file sizes. |
| **4. `--error` (`#cf222e`) is only for errors.** | Error signals must remain unmistakable. Never use red for warnings, badges, or decorative highlights. |
| **5. Never hardcode a hex color in UI code.** | Hardcoded hex strings bypass the design system. Lint rule `no-restricted-syntax` strictly bans literal `#hex` codes in application code. |
| **6. Borders are always `--color-border`, never random grays.** | Consistent border contrast preserves visual harmony across dropzones, cards, dialogs, and inputs. |

---

## Token Mapping Reference

When authoring components, always consume semantic aliases from `@zapwebp/ui`:

```css
/* Good: Semantic Token */
.my-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

/* Bad: Direct Primitive or Hex */
.my-card {
  background: #f7f7f4; /* BANNED */
  border: 1px solid var(--border-mid); /* Use semantic alias */
}
```

---

## 8px Dot System Semantics

The 8px status indicator dot communicates operational state without requiring textual labels:

- `--color-dot-idle` (`#73776b`): Idle / waiting.
- `--color-dot-active` (`#8dc63f`): Active / connected / transmitting.
- `--color-dot-done` (`#8dc63f`): Finished / verified.
- `--color-dot-error` (`#cf222e`): Failed / connection dropped.

