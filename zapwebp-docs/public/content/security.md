# Security

Covers: Security architecture, vulnerability reporting procedures, ISO/IEC 27001 and ISO/IEC 27017 standards alignment, storage adapter boundaries, and zero-telemetry boundary guarantees.

Does not cover: Standard user conversion errors or malformed assets. See [Errors](/errors) and [Safety](/safety).

Applies to: All Zapwebp packages, CLI, web application, MCP server, and cloud storage adapters.

## Quick start

```bash
# Verify zero network calls during local image conversion
npx zapwebp icon.svg --dry-run
```

To report a vulnerability privately, email [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com) with `[SECURITY VULNERABILITY]` in the subject line.

## What it does

Zapwebp enforces defensive boundaries against malicious image payloads, untrusted cloud storage paths, and network probing attacks:

- **SVG Sanitization**: Strips executable JavaScript, event handlers, `<foreignObject>`, and custom XML external entities (XXE).
- **SSRF Prevention**: Blocks internal network endpoints, private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`), link-local metadata endpoints (`169.254.169.254`), and IPv6 equivalents.
- **Filesystem & Storage Sandboxing**: Enforces 1024-byte path bounds, strictly rejects directory traversal (`..`), absolute filesystem paths, and `file://` schemes.
- **Zero-Credential Leakage**: All authentication tokens, basic auth credentials, and service keys are redacted from logs and error messages before propagation.
- **Zero Remote Retention**: Conversions in the browser execute in isolated memory; CLI conversions operate on local disk with zero telemetry.

## ISO/IEC 27001 & ISO/IEC 27017 Alignment

Zapwebp aligns its engineering practices and storage adapter boundaries with international cybersecurity and cloud security standards:

| Control Domain | Standard | Implementation in Zapwebp |
|:---|:---:|:---|
| **A.8.1 Asset Management** | ISO 27001 | SHA-256 cryptographic digests generated for every scaled output; deterministic multi-scale naming. |
| **A.9 Access Control** | ISO 27001 | Strict path sandboxing (`validateStoragePath`), 1024-byte path ceiling, and official Row Level Security (RLS) templates. |
| **A.10 Cryptography** | ISO 27001 | TLS 1.3 enforced for cloud adapters; zero plaintext credential persistence in code, configs, or error outputs. |
| **A.12 Operations Security** | ISO 27001 | Memory-only execution; 16 Megapixel (4096×4096) and 256MB WASM bounds; input sanitization prior to libvips rasterization. |
| **A.13 Communications Security** | ISO 27001 | Autonomous SSRF defense (`validateSafeUrl`); rejection of cloud metadata endpoints (`169.254.169.254`). |
| **A.18 Compliance** | ISO 27001 | Full alignment with Philippine Republic Act No. 10173 (Data Privacy Act of 2012) and zero unauthorized telemetry. |
| **CLD.8.1.5 Cascading Deletion** | ISO 27017 | Deterministic removal of all derived scales (@1x/@2x/@3x), manifests, and originals during asset deletion. |
| **CLD.6.3.1 Shared Responsibility** | ISO 27017 | Clear delineation between adapter client responsibilities and cloud provider infrastructure. |

## Supported Versions

| Version Line | Status | Security Support Level |
|:---|:---:|:---|
| **2.x** | Active | Full security patches, dependency updates, and feature backports |
| **1.x** | Maintenance | Critical security fixes and vulnerability patches only |
| **< 1.0** | End of Life | Unsupported; upgrade to the latest stable release |

## Response Timeline

| Milestone | Target Timeline | Action |
|---|---|---|
| **Initial Acknowledgment** | **Within 48 hours** | Acknowledge receipt and assign tracking identifier |
| **Triage & Severity Assessment** | **Within 72 hours** | Reproduce issue and determine CVSS severity |
| **Patch & Verification** | **Within 5–7 days** | Engineer fix, run regression tests, and prepare release |
| **Coordinated Disclosure** | **Coordinated** | Publish patched npm release and GitHub Security Advisory |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_UNSAFE_SVG` | SVG contains scripts, foreignObjects, or event handlers | Sanitize the SVG markup or use `--allow-unsafe` if trusted |
| `E_UNSAFE_URL` | Attempted fetch of private subnet, loopback, or cloud metadata endpoint | Provide a public HTTPS image URL |
| `E_PATH_TRAVERSAL` | Path exceeds 1024 bytes, contains `..`, or specifies absolute filesystem root | Specify a relative path within the authorized bucket root |
| `E_AUTH` | Missing or invalid cloud storage credentials | Provide valid environment variables or function arguments |

## For agents

```json
{
  "policy": "security",
  "contact": "eldrexdelosreyesbula@gmail.com",
  "disclosure": "coordinated",
  "supportedVersions": ["2.x", "1.x"],
  "standards": ["ISO/IEC 27001:2022", "ISO/IEC 27017:2015"],
  "protections": ["xxeDefense", "scriptSanitization", "ssrfBlocker", "pathTraversalGuard", "credentialRedaction"]
}
```

## Related

- [Safety](/safety): Strict asset verification guarantees.
- [Privacy Policy](/privacy): Zero-telemetry, statutory compliance, and data minimization.
- [Storage Adapters](/plugins/storage): Secure pre-upload conversion for Supabase, Firebase, and Neocities.
- [Errors](/errors): Complete machine-readable error catalog.
