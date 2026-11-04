# Security

Covers: Security architecture, vulnerability reporting procedures, response timelines, supported version lines, and zero-telemetry boundary guarantees.

Does not cover: Standard user conversion errors or malformed assets. See [Errors](/errors) and [Safety](/safety).

Applies to: All Zapwebp packages, CLI, web application, MCP server, and cloud storage adapters.

## Quick start

```bash
# Verify zero network calls during local image conversion
npx zapwebp icon.svg --dry-run
```

To report a vulnerability privately, email [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com) with `[SECURITY VULNERABILITY]` in the subject line.

## What it does

Zapwebp enforces defensive boundaries against malicious image payloads and untrusted inputs:

- **SVG Sanitization**: Strips executable JavaScript, event handlers, `<foreignObject>`, and custom XML entities (XXE).
- **SSRF Prevention**: Blocks internal network endpoints, private subnets (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`), and cloud metadata services.
- **Filesystem Hardening**: Restricts writes to working directories, resolves cross-platform paths safely, and prevents path traversal attacks (`..`).
- **Zero Remote Retention**: Conversions in the browser execute in isolated memory; CLI conversions operate on local disk with zero telemetry.

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
| `E_SSRF_BLOCKED` | Attempted fetch of private subnet or localhost URL | Provide a public HTTPS image URL |
| `E_PATH_TRAVERSAL` | File path escapes working directory boundary | Specify an input/output path within the workspace root |

## For agents

```json
{
  "policy": "security",
  "contact": "eldrexdelosreyesbula@gmail.com",
  "disclosure": "coordinated",
  "supportedVersions": ["2.x", "1.x"],
  "protections": ["xxeDefense", "scriptSanitization", "ssrfBlocker", "pathTraversalGuard"]
}
```

## Related

- [Safety](/safety): Strict asset verification guarantees.
- [Privacy Policy](/privacy): Zero-telemetry and data handling invariants.
- [Errors](/errors): Complete machine-readable error catalog.
