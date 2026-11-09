# Privacy Policy

Covers: Data collection practices, telemetry policy, memory handling, statutory compliance under Philippine Republic Act No. 10173, and cloud storage adapter privacy boundaries for Zapwebp.

Does not cover: External hosting provider network infrastructure policies (e.g. Vercel edge network).

Applies to: `zapwebp.vercel.app`, CLI, MCP server, cloud storage adapters, and editor extensions.

## Quick start

```bash
# Verify offline mode in CLI
npx zapwebp check logo.svg
```

Maintainer contact: [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com) · Republic of the Philippines.

## What it does

Zapwebp is engineered with a strict **Zero-Tracking, Memory-Only** privacy posture:

- **100% Client-Side In-Browser Conversion**: Image processing in the web application executes inside your browser tab's local memory using HTML5 Canvas and WASM. Your images are never sent over the Internet to any Zapwebp server.
- **Zero Telemetry**: No Google Analytics, no Meta Pixel, no Mixpanel, no error beacons (Sentry/LogRocket), no cookies, and no browser fingerprinting scripts.
- **Zero Cloud Storage of User Assets**: Zapwebp operates no central cloud databases or asset archives. When you close the browser tab, in-memory image buffers are immediately reclaimed by garbage collection.
- **Local-Only CLI & MCP**: The CLI tool (`zapwebp`) and Model Context Protocol server (`@zapwebp/mcp`) operate entirely on your local workstation's filesystem with zero outgoing network telemetry.

## Statutory Jurisdiction & Philippine R.A. 10173 (DPA of 2012)

Zapwebp is developed and maintained by Eldrex Delos Reyes Bula under the jurisdiction of the **Republic of the Philippines**. The project strictly adheres to the provisions of **Republic Act No. 10173**, known as the **Data Privacy Act of 2012 (DPA)**, administered by the National Privacy Commission (NPC):

1. **Principle of Transparency**: Users are explicitly informed that image conversion occurs 100% in local memory. No personal data, image metadata, or telemetry is secretly extracted or harvested.
2. **Principle of Legitimate Purpose**: When using `@zapwebp/storage`, data transfer occurs solely to the storage provider explicitly configured and authorized by the developer (e.g., developer's own Supabase bucket).
3. **Principle of Proportionality (Data Minimization)**: Clean Mode strips EXIF, GPS location coordinates, camera serial numbers, and creator identifiers from image headers before conversion, guaranteeing that unnecessary sensitive personal information is purged prior to cloud storage writes.

## Cloud Storage Adapters & Third-Party Privacy

When using `@zapwebp/storage` to upload assets, developers interact with third-party cloud infrastructure under a **Shared Responsibility Model**:

| Provider | Data Boundary | Privacy & Retention Profile |
|---|---|---|
| **Supabase Storage** | Private or Public Bucket | Managed under developer's Supabase account. Access governed by Row Level Security (RLS) policies. |
| **Firebase Storage** | Google Cloud Storage Bucket | Managed under developer's Google Cloud project. Access governed by Firebase Storage Security Rules. |
| **Neocities** | **Public Static Web Host** | **Public by Default**: All files uploaded to Neocities are publicly discoverable and indexed. Neocities retains server access logs for up to 24 months. Never store private or regulated personal data on Neocities. |

## Privacy Commitments

| Item | Status | Guarantee |
|---|---|---|
| Image Uploads to Zapwebp | None | In-browser conversion runs completely in local memory |
| Telemetry / Analytics | None | Zero tracking scripts, beacons, or third-party pixels |
| User Accounts | None | No passwords, logins, or tracking cookies required |
| File Retention | 0 Seconds | Unsaved blobs are revoked immediately upon tab closure |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `privacy_telemetry_detected` | Third-party script injected by browser extension | Review active browser extensions |
| `E_RATE_LIMIT` | Neocities upload rate limit reached | Back off upload frequency to adhere to host policy |

## For agents

```json
{
  "policy": "zero-telemetry",
  "clientSideExecution": true,
  "remoteUploads": false,
  "analytics": false,
  "cookies": false,
  "jurisdiction": "Republic of the Philippines",
  "statute": "Republic Act No. 10173 (Data Privacy Act of 2012)",
  "contact": "eldrexdelosreyesbula@gmail.com"
}
```

## Related

- [Safety](/safety): Security rules and sandbox boundaries.
- [Security](/security): ISO/IEC 27001 & 27017 standards compliance and vulnerability disclosure.
- [Storage Adapters](/plugins/storage): Pre-upload conversion and cloud adapter security.
- [About](/about): Project background and architecture doctrine.
