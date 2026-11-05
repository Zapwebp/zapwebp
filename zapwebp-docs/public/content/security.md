# Security Policy

**Effective Date:** November 4, 2026  
**Last Updated:** November 4, 2026

Zapwebp takes software security and data integrity seriously. As an image processing engine deployed across developer terminals, AI agents, cloud storage adapters, and client browsers, maintaining defensive boundaries against malicious image payloads and untrusted inputs is fundamental to our architecture.

---

## 1. Supported Versions

We actively provide security patches and dependency updates for the following versions:

| Version Line |             Status             | Security Support Level                                            |
| :----------- | :----------------------------: | :---------------------------------------------------------------- |
| **2.x**      |   :white_check_mark: Active    | Full security patches, dependency updates, and feature backports. |
| **1.x**      | :white_check_mark: Maintenance | Critical security fixes and vulnerability patches only.           |
| **< 1.0**    |        :x: End of Life         | Unsupported. Users must upgrade to the latest stable release.     |

We recommend all production deployments, CI workflows, and AI agent installations pin to the latest `2.x` release (`^2.0.0`).

---

## 2. Reporting a Vulnerability

**Please do NOT disclose security vulnerabilities through public GitHub issues, discussions, or social media channels.**

To report a vulnerability or potential exploit, send an encrypted or private email directly to the maintainer:

- **Security Contact:** Eldrex Delos Reyes Bula
- **Email:** [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com)
- **Subject Line:** `[SECURITY VULNERABILITY] Zapwebp: <Brief Description>`

### What to Include in Your Report

To accelerate validation and patching, please include:

1. **Description & Impact:** A clear description of the vulnerability, the attack scenario, and potential real-world impact (e.g., arbitrary code execution, XML external entity leakage, SSRF, memory exhaustion DoS).
2. **Affected Components:** The package(s) or surface(s) affected (e.g., `@zapwebp/core`, `@zapwebp/mcp`, `packages/cli`, web app, or `@zapwebp/edge`).
3. **Proof of Concept (PoC):** A minimal reproducible test case, script, or sample malicious image file (e.g., crafted SVG or corrupt header payload).
4. **Environment Details:** Node.js version, operating system, and package manager version used during reproduction.
5. **Mitigation Ideas:** Any proposed fixes or workaround suggestions (optional).

---

## 3. Vulnerability Response Timeline

We commit to the following response and remediation schedule:

| Milestone                        | Target Timeline     | Action                                                                                                                             |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Initial Acknowledgment**       | **Within 48 hours** | We acknowledge receipt of your report and assign a tracking identifier.                                                            |
| **Triage & Severity Assessment** | **Within 72 hours** | We reproduce the issue, assess CVSS severity, and determine root cause.                                                            |
| **Patch Development & Testing**  | **Within 5–7 days** | We engineer a fix, run complete regression suites, and draft a security advisory.                                                  |
| **Release & Disclosure**         | **Coordinated**     | We publish the patched release on npm and GitHub, followed by a public GitHub Security Advisory crediting the finder (if desired). |

---

## 4. Security Scope & Architecture Boundaries

### 4.1 In-Scope Components

The following core security domains are strictly in scope for security vulnerability reports:

1. **SVG Sanitization & Vector Disinfection:**
   - Active script execution (e.g., `<script>`, `onload`, `javascript:` URI handlers in SVG).
   - XML External Entity (XXE) injection and recursive entity expansion (Billion Laughs attack).
   - Unsanitized remote resource fetches (`<image href="http://...">`, `<use xlink:href="...">`).
   - SVG parsing buffer overflows or bypasses in `@resvg/resvg-js`.
2. **Server-Side Request Forgery (SSRF) Defense:**
   - Validation and rejection of private, loopback, link-local, and intranet IP addresses (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 equivalents) in remote URL ingest pipelines.
3. **WASM & Memory Exhaustion Controls:**
   - Memory limits and bounds checks preventing pixel flood attacks (decompression bombs / zip bombs) from exceeding maximum resolution gates (4096 × 4096 max dimension by default).
   - In-browser WebAssembly heap bounds enforcement preventing tab crashes.
4. **Path Traversal & Sandboxing:**
   - File read/write bounds ensuring CLI operations do not write outside the intended project boundary or overwrite critical host system files unless `--allow-outside` is explicitly supplied.
5. **Alpha Channel & Loss Prevention:**
   - Unexpected dropping of alpha channels or silent data corruption resulting in corrupted output files.

### 4.2 Out-of-Scope Scenarios

The following scenarios are considered out of scope:

1. **Compromised User Environments:** Attacks requiring pre-existing root, administrative, or physical access to the target host machine.
2. **User-Configured Cloud Credentials:** Leaks of Supabase, Firebase, or AWS access keys caused by user repository misconfigurations or insecure environment files.
3. **Intentional Overrides:** Expected behavior when a user explicitly supplies bypass flags (e.g., `--allow-unsafe` or `--allow-outside`).
4. **Third-Party Upstream Binaries:** Unpatched zero-day vulnerabilities in upstream Linux distributions or OS-level `libvips` packages that have not yet been addressed upstream.
5. **Self-Inflicted Local Resource Exhaustion:** Running batch conversions on multi-gigabyte folders on low-memory machines without setting appropriate `--concurrency` limits.

---

## 5. Security Best Practices for Deployers

If you embed Zapwebp in server environments, CI/CD pipelines, or agentic frameworks:

- **Always Keep Dependencies Current:** Use `pnpm update` or `npm update` to ensure you are running the latest `@zapwebp/core` and `@zapwebp/shared` releases.
- **Enforce Conversion Policies:** Use `conversionPolicy` to define maximum byte sizes (`maxInputBytes`, `maxOutputBytes`) and format allowlists on untrusted uploads.
- **Never Pass Untrusted Input to Shells:** Invoke Zapwebp via the official SDK (`@zapwebp/sdk`) or MCP server rather than concatenating user input strings into raw terminal commands.
- **Run with Least Privilege:** In Docker or containerized environments, execute Zapwebp processes as a non-root user (`USER node`).

---

## 6. Coordinated Vulnerability Disclosure & Attribution

We believe in responsible, coordinated disclosure. If you discover and report a confirmed security vulnerability:

- We will work collaboratively with you throughout the remediation process.
- We will coordinate public disclosure dates to ensure users have sufficient time to update.
- We will publicly credit your contribution in the published GitHub Security Advisory and release notes, unless you request to remain anonymous.

---

## 7. Security Contact & Documentation

- **Security Lead:** Eldrex Delos Reyes Bula
- **Email:** [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com)
- **Documentation Portal:** [https://zapwebp-docs.vercel.app/security](https://zapwebp-docs.vercel.app/security)
- **Safety Documentation:** [https://zapwebp-docs.vercel.app/safety](https://zapwebp-docs.vercel.app/safety)

Thank you for helping keep Zapwebp and the open-source community safe and reliable.
