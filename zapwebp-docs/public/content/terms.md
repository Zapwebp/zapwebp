# Terms of Service

Covers: Permitted usage, intellectual property, warranty disclaimer, and liability limits for the Zapwebp service.

Does not cover: Commercial custom licensing or enterprise SLA agreements.

Applies to: All public Zapwebp surfaces (`zapwebp.vercel.app`, CLI, MCP, API).

## Quick start

```bash
# View license in terminal
npx zapwebp --version
```

## What it does

By accessing or using Zapwebp (via web application, CLI binary, MCP server, or REST API), you agree to standard open-source and fair use terms:

- **Intellectual Property**: You retain 100% full ownership, rights, and copyright to all source images you convert using Zapwebp. Zapwebp asserts zero claim over user assets.
- **Permitted Use**: You are permitted to use Zapwebp for personal, commercial, educational, and automated workflows.
- **Prohibited Conduct**: You may not use the public API endpoints to conduct denial-of-service attacks or distribute malicious payloads.
- **Open-Source License**: Core software libraries are distributed under the permissive MIT License.

## Terms Matrix

| Section | Term | Description |
|---|---|---|
| License | MIT | Free to use, modify, distribute, and integrate |
| User Content | Retained by User | Converted outputs belong entirely to the user |
| Service Level | "As Is" | No express or implied warranty of uptime |
| Data Storage | None | Server does not maintain persistent backups of user data |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `terms_rate_limited` | Excessive automated abuse of public API | Run conversions locally via `@zapwebp/cli` |

## For agents

```json
{
  "service": "Zapwebp",
  "termsType": "MIT Open Source",
  "userOwnership": "100%",
  "liability": "AS-IS without warranty"
}
```

## Related

- [Privacy](/privacy): Zero-telemetry policy and data handling.
- [About](/about): Project background and mission.

