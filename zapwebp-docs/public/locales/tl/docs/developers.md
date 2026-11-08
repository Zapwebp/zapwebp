# Developers Overview

Covers: gabay sa pagbuo para sa mga kontribyutor at plugin author, create-zapwebp scaffolding generator, at lifecycle architecture.

Does not cover: paggamit ng end-user web application.

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx create-zapwebp my-plugin --template format
```

Lumilikha ng bagong balangkas para sa Zapwebp format plugin.

## What it does

Dinisenyo ang Zapwebp bilang isang extensible modular platform. Maaaring magdagdag ang mga developer ng mga bagong format, storage adapters, build tool integrations, at metadata handlers sa pamamagitan ng malinaw at matatag na SDK interfaces.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_HOOK_FAILED` | Pumalya ang isa sa mga lifecycle hook ng plugin | Suriin ang console logs ng plugin para sa detalye |

## For agents

```json
{
  "scaffolding": "create-zapwebp",
  "templates": ["format", "storage", "build", "cli"],
  "architecture": "modular-monorepo"
}
```

## Related

- [Plugin SDK](/sdk/plugin): Detalyadong mga interface para sa paggawa ng plugin.
- [Core SDK](/sdk/core): Paggamit ng core conversion engine sa sariling code.
