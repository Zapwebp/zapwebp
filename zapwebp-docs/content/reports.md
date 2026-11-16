# Performance & Carbon Reports

Covers: Transaction journal aggregation, project-wide bandwidth reporting, Green Code carbon offset estimation, CLI `zap report`, Web App `/reports` dashboard, REST API `/report`, and MCP `get_performance_report`.

Does not cover: Remote tracking telemetry, third-party analytics beacons, or persistent external log storage.

Applies to: Zapwebp v2.19.0 and later.

## Quick start

Generate a performance and carbon offset report from the project journal:

```bash
# Terminal report of conversions over the past 30 days
zap report ./public/images --since "30 days ago"

# Generate structured JSON or Markdown report
zap report ./public/images --format json
zap report ./public/images --format markdown > report.md
```

Or invoke the report via Model Context Protocol (MCP):

```json
{
  "name": "get_performance_report",
  "arguments": {
    "path": "./public/images",
    "since": "30 days ago",
    "format": "markdown"
  }
}
```

## What it does

Zapwebp tracks transactional operations locally within `.zapwebp/journal/` without phoning home or transmitting user metrics to external servers. The **Performance Reports Engine** aggregates these logs into actionable bandwidth, format, and environmental metrics.

### 1. Key Metrics & Carbon Accounting

- **Total Data Processed:** Sum of all input bytes before conversion.
- **Optimized Data Size:** Sum of all resulting output bytes across all targets.
- **Bandwidth Saved:** Absolute bytes saved and reduction percentage.
- **Green Code Carbon Offset:** Computes energy consumption avoided using the industry-standard Green Software Foundation equation:
  $$\text{Energy Saved (kWh)} = \text{Data Saved (GB)} \times 0.06\text{ kWh/GB}$$
  $$\text{CO}_2\text{e Avoided (kg)} = \text{Energy Saved (kWh)} \times 0.4\text{ kg CO}_2\text{e/kWh}$$

### 2. Multi-Surface Availability

- **Developer CLI (`zap report`):** Generates ASCII tables, CSV, Markdown, or JSON summaries directly in the terminal or CI/CD logs.
- **GitHub Action Comments:** Injects aggregate bytes saved and carbon offset numbers into Pull Request summaries.
- **Browser Web App (`/reports`):** In-browser dashboard computing metrics directly from client-side IndexedDB storage.
- **REST API (`POST /report`):** Analyzes journals or records programmatically for automated build pipelines.
- **AI Agent Tool (`get_performance_report`):** Returns complete performance breakdowns to autonomous LLM agents.

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_REPORT_EMPTY` | No conversion journals found for the specified directory or time period | Execute conversions first or adjust the `--since` filter |
| `E_INVALID_SINCE` | The `--since` date string cannot be parsed | Provide standard ISO date (`YYYY-MM-DD`) or duration (e.g., `30 days ago`) |
| `E_JOURNAL_CORRUPT` | Journal entry file contains invalid JSON | Run `zap journal gc` to prune or inspect corrupted transaction records |

## For agents

```json
{
  "capability": "performance-reports",
  "tool": "get_performance_report",
  "parameters": {
    "path": { "type": "string", "description": "Target folder containing .zapwebp journal" },
    "since": { "type": "string", "description": "Filter window: ISO date or relative duration" },
    "format": { "type": "string", "enum": ["table", "json", "csv", "markdown"], "default": "markdown" },
    "top": { "type": "number", "default": 10 }
  },
  "metrics": [
    "totalFiles",
    "originalBytes",
    "optimizedBytes",
    "savedBytes",
    "savedPercent",
    "kwhSaved",
    "co2KgSaved",
    "byFormat",
    "bySource",
    "topSavings"
  ]
}
```

## Related

- [Conversion Policy](/policy.md) — Set corporate size limits and accepted formats.
- [Clean Mode](/clean.md) — Strip sensitive metadata and verify certificates.
- [CLI Reference](/cli.md) — Complete command-line flags and journal subcommands.
- [Model Context Protocol](/mcp.md) — Automate reports through AI agents.
