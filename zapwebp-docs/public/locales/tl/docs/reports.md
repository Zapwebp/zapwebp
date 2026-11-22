# Mga Ulat sa Pagganap at Carbon (Performance & Carbon Reports)

Covers: Pagsasama-sama ng journal ng transaksyon, pag-uulat ng natipid na bandwidth sa buong proyekto, pagtatantya ng natipid na carbon (Green Code), CLI `zap report`, dashboard ng Web App sa `/reports`, REST API `/report`, at MCP `get_performance_report`.

Does not cover: Panlabas na telemetriya sa pagsubaybay, mga third-party analytics beacon, o malayuang imbakan ng log.

Applies to: Zapwebp v2.19.0 at mas bago.

## Quick start

Bumuo ng ulat sa pagganap at carbon offset mula sa journal ng proyekto:

```bash
# Ulat sa terminal para sa mga conversion sa nakaraang 30 araw
zap report ./public/images --since "30 days ago"

# Bumuo ng ulat sa format na JSON o Markdown
zap report ./public/images --format json
zap report ./public/images --format markdown > report.md
```

## What it does

Sinusubaybayan ng Zapwebp ang mga transaksyon sa `.zapwebp/journal/` sa lokal na storage nang walang ipinapadalang data sa labas. Pinagsasama-sama ng Performance Reports Engine ang mga log na ito upang maipakita ang kabuuang natipid na bandwidth, distribusyon ng format, at epekto sa kalikasan gamit ang pamantayang Green Software Foundation formula:

$$\text{Natipid na Enerhiya (kWh)} = \text{Natipid na Data (GB)} \times 0.06\text{ kWh/GB}$$
$$\text{Naiwasang }\text{CO}_2\text{e (kg)} = \text{Natipid na Enerhiya (kWh)} \times 0.4\text{ kg CO}_2\text{e/kWh}$$

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_REPORT_EMPTY` | Walang natagpuang conversion journal para sa naturang direktoryo o panahon | Magsagawa muna ng conversion o i-adjust ang `--since` filter |
| `E_INVALID_SINCE` | Hindi wastong format ng petsa o panahon | Magbigay ng wastong ISO petsa (`YYYY-MM-DD`) o panahon (hal. `30 days ago`) |
| `E_JOURNAL_CORRUPT` | May sirang JSON sa journal file | Patakbuhin ang `zap journal gc` upang linisin o suriin ang mga transaksyon |

## For agents

```json
{
  "capability": "performance-reports",
  "tool": "get_performance_report",
  "parameters": {
    "path": { "type": "string" },
    "since": { "type": "string" },
    "format": { "type": "string", "enum": ["table", "json", "csv", "markdown"] },
    "top": { "type": "number", "default": 10 }
  }
}
```

## Related

- [Patakaran ng Conversion (Policy Engine)](/policy) — Pamahalaan ang mga limitasyon at pinapayagang format.
- [Malinis (Clean Mode)](/clean) — Tanggalin ang sensitibong metadata at patunayan ang sertipiko.
- [Terminal (CLI)](/cli) — Kumpletong listahan ng mga flag sa terminal at utos sa journal.
