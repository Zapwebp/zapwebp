# Security Policy

At Zapwebp, security and data confidentiality are core architectural invariants rather than secondary considerations. Because Zapwebp operates across critical developer environments—including terminal pipelines, CI/CD actions, AI agent protocols, code editors, and client-side browsers—we enforce rigorous defensive controls to protect systems from malicious inputs, unauthorized network calls, and data exfiltration.

This document details our security boundaries, standards alignment, supported release lines, and coordinated vulnerability disclosure procedures.

---

## 1. Architectural Security Controls

Zapwebp enforces defensive engineering practices across all conversion pipelines:

### Defensive Vector Ingestion (SVG Hardening)
Scalable Vector Graphics (SVG) are XML documents capable of executing malicious payloads. Zapwebp inspects all vector input before rasterization:
- **Executable Code Rejection**: Any SVG containing `<script>`, inline event handlers (`onload`, `onclick`, `onerror`), `<foreignObject>`, or dangerous XML constructs is immediately rejected with `E_UNSAFE_SVG`.
- **Entity Expansion Defense (XXE)**: Custom entity declarations (`<!ENTITY>`) and external DOCTYPE declarations (`<!DOCTYPE>`) are prohibited, mitigating XML Entity Expansion and Billion Laughs vulnerabilities.

### SSRF & Private Network Protection
For ingestion pipelines that fetch remote images (`convert_url`), Zapwebp employs autonomous Server-Side Request Forgery (SSRF) defenses:
- **Private Subnet Blocking**: Requests resolving to loopback (`127.0.0.1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or link-local cloud metadata endpoints (`169.254.169.254` and IPv6 equivalents) are blocked prior to connection.
- **Protocol Enforcement**: Only verified `https://` schemes are permitted. Plain `http://`, `file://`, and custom protocols are strictly rejected.

### Filesystem & Storage Sandboxing
- **Directory Traversal Defense**: All local file operations verify that source and destination paths reside strictly within the authorized project directory root (`resolveInside`). Paths attempting to escape via `..` or unverified symlinks trigger `E_PATH_TRAVERSAL`.
- **Path Length Boundaries**: Path arguments are strictly capped at 1024 bytes to mitigate buffer and heap anomalies.

### Memory & Execution Bounds
- **Dimension Ceilings**: Raster and vector inputs are constrained to 4096 × 4096 pixels (16 Megapixels) unless explicitly overridden by configuration.
- **WASM Heap Isolation**: Browser-side WebAssembly heaps are restricted to 256MB to prevent client-side denial-of-service.

### Zero Telemetry & Credential Redaction
- **No In-Code Telemetry**: Zero analytics trackers, tracking cookies, or diagnostic beacons are compiled into Zapwebp.
- **Credential Masking**: Storage adapter credentials, API keys, and authorization headers are sanitized and masked before error generation or log emission.

---

## 2. Standards Alignment (ISO/IEC 27001 & ISO/IEC 27017)

Zapwebp aligns its engineering discipline and cloud storage adapter boundaries with recognized international cybersecurity standards:

| Control Domain | Standard | Implementation in Zapwebp |
|---|:---:|---|
| **A.8.1 Asset Management** | ISO 27001 | Cryptographic SHA-256 digests generated for scaled outputs; deterministic multi-scale naming. |
| **A.9 Access Control** | ISO 27001 | Strict path sandboxing (`resolveInside`), 1024-byte path bounds, and Row Level Security templates. |
| **A.10 Cryptography** | ISO 27001 | Enforced TLS 1.3 for cloud adapter communication; zero credential persistence in code or logs. |
| **A.12 Operations Security** | ISO 27001 | Memory-only execution; 16MP dimension and 256MB WASM bounds; input sanitization prior to libvips rasterization. |
| **A.13 Communications Security** | ISO 27001 | SSRF defense (`validateSafeUrl`) blocking internal subnets and cloud metadata endpoints (`169.254.169.254`). |
| **A.18 Compliance** | ISO 27001 | Full alignment with Philippine Republic Act No. 10173 (Data Privacy Act of 2012); zero unauthorized telemetry. |
| **CLD.8.1.5 Cascading Deletion** | ISO 27017 | Deterministic removal of derived variants (@1x/@2x/@3x), manifests, and originals during asset deletion. |
| **CLD.6.3.1 Shared Responsibility** | ISO 27017 | Explicit division between adapter client responsibilities and cloud provider infrastructure. |

---

## 3. Supported Versions & Security Lifecycle

Security patches and vulnerability updates are applied to the following release lines:

| Version Line | Status | Security Maintenance Level |
|:---:|:---:|---|
| **2.x** | **Active** | Full security patches, dependency updates, and feature backports. |
| **1.x** | **Maintenance** | Critical vulnerability fixes and high-severity CVE remediation only. |
| **< 1.0** | **End of Life** | Unsupported. Users must upgrade to the latest stable release. |

---

## 4. Threat Model & Security Boundaries

### In-Scope Vulnerabilities
- Bypasses of SVG sanitization allowing script execution or XML entity expansion.
- Server-Side Request Forgery (SSRF) bypasses allowing access to private IP spaces or cloud metadata.
- Directory traversal vulnerabilities in the CLI, SDK, or MCP server.
- Memory exhaustion or Denial-of-Service vulnerabilities triggered by malformed image headers.
- Unintended alpha channel loss or silent asset corruption in production conversion pipelines.

### Out-of-Scope Vulnerabilities
- Vulnerabilities requiring physical access to a compromised developer workstation.
- Attacks relying on unauthorized local modification of `.zapwebp/config.json` on a developer's local machine.
- Downtime, service disruptions, or vulnerabilities in third-party hosting providers (e.g., Vercel, Supabase, Firebase, Neocities).
- Issues reported by automated scanners based solely on package registry age or generic heuristics rather than demonstrable exploits.

---

## 5. Coordinated Vulnerability Disclosure

We welcome responsible security research and vulnerability disclosures from the community. If you discover a potential vulnerability in Zapwebp, please report it to us privately.

### Reporting Procedure
Send an encrypted or private email to:
- **Contact:** `eldrexdelosreyesbula@gmail.com`
- **Subject:** `[SECURITY VULNERABILITY] <Brief Description>`

Please include in your report:
1. Package and version affected (e.g. `@zapwebp/core@1.1.2`, `zapwebp@1.1.1`).
2. Type of vulnerability (e.g. SVG sanitization bypass, path traversal, SSRF).
3. Step-by-step reproduction instructions and a minimal proof-of-concept image or script.
4. An assessment of potential impact.

### Response Milestones & Commitments
We are committed to coordinated, responsible remediation and adhere to the following target response windows:

| Milestone | Target Window | Commitment |
|---|:---:|---|
| **Initial Acknowledgment** | **Within 48 hours** | We confirm receipt of your report and assign a tracking identifier. |
| **Triage & Reproduction** | **Within 72 hours** | We reproduce the issue and determine CVSS severity rating. |
| **Remediation & Testing** | **Within 5–7 business days** | We engineer a fix, run regression tests, and prepare release packages. |
| **Coordinated Disclosure** | **Coordinated with reporter** | We publish the patched release to npm and issue a GitHub Security Advisory. |

We request that you maintain confidentiality and refrain from public disclosure until an official fix has been published.
