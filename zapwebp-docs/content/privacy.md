# Privacy Policy

**Effective Date:** November 1, 2025  
**Last Revised:** November 21, 2026  
**Jurisdiction:** Republic of the Philippines  
**Statutory Authority:** Republic Act No. 10173 (Data Privacy Act of 2012)  

Zapwebp operates under an uncompromising, zero-compromise architectural commitment: **Zero Tracking, Memory-Only Execution**. We believe that image conversion and optimization tools have no legitimate technical or commercial reason to harvest personal information, inspect private asset content, retain uploaded files on remote servers, or monitor user behavior.

This Privacy Policy formally outlines our data processing architecture, statutory compliance under Philippine law, boundaries with third-party cloud integrations, and your rights as a data subject.

---

## 1. Executive Summary & Architectural Guarantees

Zapwebp enforces four fundamental privacy guarantees across every platform surface:

1. **100% Client-Side In-Browser Execution**: Image conversions initiated on the web application (`https://zapwebp.vercel.app`) execute entirely within your local browser tab's volatile memory using client-side WebAssembly (WASM) and HTML5 Canvas APIs. **Your images are never transmitted over the internet to any Zapwebp server.**
2. **Zero Telemetry & Zero Analytics**: Zapwebp contains zero tracking scripts, zero web beacons, zero third-party tracking pixels (e.g., Google Analytics, Meta Pixel, Mixpanel), zero error-monitoring phone-home agents (e.g., Sentry, LogRocket, Datadog), and zero browser fingerprinting scripts.
3. **Zero Remote Asset Storage**: Zapwebp operates no central cloud databases, asset staging buckets, or file retention caches. Once an image conversion completes or the browser tab is closed, memory buffers are immediately purged by garbage collection.
4. **Local-Only Terminal & Agent Workflows**: The developer CLI (`zapwebp` / `zap`) and Model Context Protocol server (`@zapwebp/mcp`) execute 100% locally on your workstation's filesystem. They make zero outbound telemetry calls and require no internet connectivity for local file operations.

---

## 2. Statutory Compliance with Philippine R.A. 10173 (Data Privacy Act of 2012)

Zapwebp is developed, hosted, and operated by Eldrex Delos Reyes Bula under the exclusive legal jurisdiction of the **Republic of the Philippines**. The platform strictly adheres to the provisions of **Republic Act No. 10173**, known as the **Data Privacy Act of 2012 (DPA)**, its Implementing Rules and Regulations (IRR), and the regulatory issuances of the **National Privacy Commission (NPC)**.

Zapwebp implements the three core principles of the DPA:

### Principle of Transparency
Users are explicitly and unambiguously informed that image conversions run locally in volatile memory. No personal data, hardware identifiers, or image contents are harvested, profiled, or aggregated.

### Principle of Legitimate Purpose
When developers integrate first-party cloud adapters (`@zapwebp/storage`), data transfer occurs strictly and solely to the third-party storage infrastructure explicitly configured and authorized by the developer (e.g., the developer's private Supabase or Firebase bucket). Zapwebp acts strictly as a client-side utility and never proxies, inspects, or copies user credentials or payloads.

### Principle of Proportionality (Data Minimization)
Zapwebp's default conversion pipeline and **Clean Mode** actively scrub sensitive metadata from image headers prior to export:
- GPS latitude, longitude, and altitude coordinates
- Camera serial numbers and hardware identifiers
- EXIF capture timestamps and personal author metadata
- C2PA Content Credentials and AI provenance fingerprints

By purging extraneous metadata, Zapwebp enforces data minimization before images are committed to public storage or web deployment.

### Data Subject Rights
Under Chapter VI of the Philippine Data Privacy Act of 2012, individuals possess enforceable rights regarding their personal data:
- **Right to be Informed**: You have the right to know how your data is handled. As stated herein, Zapwebp collects zero personal data.
- **Right to Access**: Because Zapwebp does not maintain user accounts or databases, no personal data records exist to access.
- **Right to Erasure or Blocking**: Browser memory buffers are ephemeral and deleted automatically upon tab closure (retention time: 0 seconds).
- **Right to Damages**: You are entitled to indemnification for damages sustained due to inaccurate, incomplete, or unlawful processing of personal data.

---

## 3. Information We Do Not Collect

To ensure complete transparency, Zapwebp explicitly disclaims the collection of:

| Category | Status | Details |
|---|:---:|---|
| **User Identification** | **Not Collected** | No names, email addresses, phone numbers, usernames, or physical addresses. |
| **Authentication Credentials** | **Not Collected** | No passwords, OAuth tokens, or session cookies are requested, accepted, or stored. |
| **Image & Asset Content** | **Not Collected** | File contents, pixel buffers, and vector paths remain in local memory only. |
| **Browsing & Usage Behavior** | **Not Collected** | No click tracking, conversion frequency counters, or behavioral analytics. |
| **Device & Network Telemetry** | **Not Collected** | No IP address logging, MAC address sniffing, or canvas fingerprinting. |
| **Cookies & Persistent Storage** | **Not Collected** | No HTTP cookies, local storage tracking tokens, or persistent tracking beacons. |

> [!NOTE]
> Local browser `sessionStorage` is utilized strictly within the active tab to maintain temporary file limits and dropzone counts (e.g., tracking the 20-file batch ceiling). This data is purely local to your device, is never transmitted across the network, and is completely cleared when the browser session terminates.

---

## 4. Cloud Storage Adapters & Shared Responsibility Model

Developers utilizing the `@zapwebp/storage` package to upload converted images to third-party providers interact with external cloud platforms under a **Shared Responsibility Model**:

```
+--------------------------------------------------------------------------+
|                      SHARED RESPONSIBILITY BOUNDARY                      |
+--------------------------------------------------------------------------+
|  ZAPWEBP RESPONSIBILITY:                                                 |
|  - In-memory rasterization and conversion                                 |
|  - Alpha channel verification and metadata scrubbing (Clean Mode)        |
|  - Safe path sanitization (rejection of directory traversal ".." paths)  |
|  - Zero storage of developer API keys or storage tokens                  |
+--------------------------------------------------------------------------+
|  DEVELOPER & PROVIDER RESPONSIBILITY:                                    |
|  - Secure configuration of storage bucket permissions & RLS policies      |
|  - Secure management of API keys, Service Account JSONs, and secrets     |
|  - Compliance with target cloud provider terms (Supabase, Firebase)      |
|  - Adherence to public disclosure warnings when uploading to Neocities   |
+--------------------------------------------------------------------------+
```

### Specific Provider Considerations
- **Supabase Storage**: Assets are stored in the developer's designated project bucket. Data access and retention are governed entirely by the developer's Row Level Security (RLS) policies.
- **Firebase Storage**: Assets are written to Google Cloud Storage under Firebase Security Rules defined by the developer.
- **Neocities Static Hosting**: **Public by Default.** All files uploaded to Neocities are publicly discoverable on the web. Neocities maintains standard server access logs for up to 24 months. Developers must never upload confidential, regulated, or sensitive personal data to Neocities.

---

## 5. Security of Processing & Ephemeral Storage

Zapwebp maintains state-of-the-art technical security boundaries to protect data processed in memory:
- **Memory Sandboxing**: Browser conversions run within standard browser security sandboxes. WASM heaps are capped at 256MB, and processing dimensions are bounded at 4096 × 4096 pixels (16 Megapixels) to prevent Denial-of-Service and memory overflow.
- **Vector Sanitization**: Any SVG containing executable code (`<script>`, inline `on*` event handlers, or `<foreignObject>`) or XML External Entities (XXE) is immediately rejected with `E_UNSAFE_SVG` prior to parsing.
- **Zero Disk Caching**: On web surfaces, no temporary files or swap buffers are written to the host filesystem.

---

## 6. Updates to This Policy

We may update this Privacy Policy periodically to reflect statutory updates or architectural enhancements. Any changes will be published directly to this page with an updated "Last Revised" date. Because Zapwebp does not collect contact information, users are encouraged to review this page periodically.

---

## 7. Contact Information & Regulatory Recourse

If you have questions, inquiries, or concerns regarding this Privacy Policy or Zapwebp's privacy posture, contact the maintainer directly:

- **Data Controller:** Eldrex Delos Reyes Bula  
- **Email:** `eldrexdelosreyesbula@gmail.com`  
- **Mailing Address:** Republic of the Philippines  
- **Official Repository:** [https://github.com/Zapwebp](https://github.com/Zapwebp)  

If you believe your privacy rights under Philippine Republic Act No. 10173 have been compromised, you have the right to lodge a formal complaint with the National Privacy Commission:

- **Regulatory Body:** National Privacy Commission (NPC)  
- **Website:** [https://privacy.gov.ph](https://privacy.gov.ph)  
- **Email:** `complaints@privacy.gov.ph`  
- **Address:** 5th Floor Delegation Building, PICC Complex, Roxas Boulevard, Pasay City, Metro Manila 1307, Philippines  
