# Privacy Policy

**Effective Date:** November 4, 2026  
**Last Updated:** November 4, 2026

Zapwebp ("we", "us", or "our"), maintained by **Eldrex Delos Reyes Bula**, provides an open-source, transparency-safe image conversion engine, web application, developer CLI, Model Context Protocol (MCP) server, and cloud storage adapters.

We believe privacy is an architectural property, not a policy disclaimer. Zapwebp is engineered from the ground up on a **Zero-Telemetry, Local-First Architecture**. This Privacy Policy explains our practices regarding user data, local processing, and third-party integrations.

---

## 1. Core Privacy Promise: Zero Server Uploads

**Your files are your own. Zapwebp never uploads your images, vectors, or graphics to our servers.**

- When you use the Web Application ([https://zapwebp.vercel.app](https://zapwebp.vercel.app)), all rasterization, compression, format transformation, and multiplier generation occur **100% locally inside your browser** using client-side WebAssembly (WASM) and HTML5 Canvas.
- When you execute the Command Line Interface (`zap`, `zapwebp`), VS Code extension, or Model Context Protocol (`@zapwebp/mcp`) server, image processing occurs **100% locally in-memory** on your host computer.
- We do not operate an asset-retaining cloud conversion farm, image caching database, or remote inspection pipeline.

---

## 2. What We Do NOT Collect

We do not collect, monetize, log, or sell your personal information or media assets. Specifically, we do **not**:

- Collect, intercept, or inspect the images you process;
- Collect facial, biometric, or personal identity data (our auto-crop heuristics evaluate local pixel clustering in ephemeral memory only and discard it immediately);
- Collect personal names, physical addresses, or phone numbers;
- Require user account creation, registration, passwords, or authentication to use the web app or open-source tools;
- Deploy tracking pixels, fingerprinting scripts, or third-party advertising SDKs (such as Google AdSense, Meta Pixel, or marketing beacons);
- Track cross-site browsing behavior across sessions.

---

## 3. What We Collect (And Why)

Because Zapwebp does not maintain user accounts or remote processing infrastructure, data collection is strictly minimal:

### 3.1 Direct Correspondence

If you voluntarily contact us via email ([eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com)) or submit a public pull request or issue on GitHub ([https://github.com/Zapwebp](https://github.com/Zapwebp)), we collect the information you choose to provide (such as your email address, GitHub username, bug reports, or feature discussions) strictly to respond to your inquiry, support technical troubleshooting, or collaborate on open-source code.

### 3.2 Web Hosting Infrastructure Logs

The public web application ([https://zapwebp.vercel.app](https://zapwebp.vercel.app)) and documentation portal ([https://zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)) are deployed on [Vercel](https://vercel.com). Like virtually all web hosts, Vercel may automatically collect standard HTTP access logs (such as requesting IP address, browser user-agent, referer, and timestamp) solely for network security, DDoS mitigation, and edge routing. These logs are governed by [Vercel's Privacy Policy](https://vercel.com/legal/privacy-policy) and are never cross-referenced with your image conversions.

---

## 4. Local Processing & Ephemeral Memory

### 4.1 In-Browser Processing

When you drag and drop images onto [zapwebp.vercel.app](https://zapwebp.vercel.app):

- Files are parsed directly from your file system into your browser's private memory heap (`ArrayBuffer`).
- Image processing (SVG rasterization via Rust-compiled WASM, pixel transformations, WebP/AVIF encoding) is executed within your browser's isolated JavaScript sandbox.
- When you click "Download" or export a batch ZIP, the archive is created entirely client-side using `fflate` in browser RAM.
- Closing the browser tab or reloading the page immediately frees the memory. No persistent copy remains.

### 4.2 Terminal CLI & Local Storage

- Conversions performed via `zap` or `zapwebp` operate directly on files on your local disk.
- Transaction histories generated for atomic undo/redo operations are stored strictly in a local directory (`.zapwebp/journal/`) inside your project directory.
- This directory is automatically appended to your project's `.gitignore` to prevent accidental commit of conversion journals to remote git hosts.

---

## 5. Cookies & Browser Local Storage

We do **not** use tracking cookies, marketing cookies, or third-party analytic identifiers.

The web application ([https://zapwebp.vercel.app](https://zapwebp.vercel.app)) uses standard browser `localStorage` solely to persist your local user interface preferences:

- **`zap_theme`**: Stores your chosen color palette (e.g., `dark`, `minimal`, `glass`, `default`).
- **`zap_quality`**: Stores your last-selected quality slider setting (e.g., `85`).
- **`zap_locale`**: Stores your preferred user interface language (e.g., `en`, `tl`).

These settings never leave your browser and are not transmitted to any server. You can clear this data at any time via your browser's "Clear Site Data" or "Clear Cookies and Local Storage" settings.

---

## 6. Third-Party Integrations & Storage Adapters

Zapwebp offers modular cloud storage adapters (`@zapwebp/storage`) for services including:

- **Supabase Storage**
- **Firebase Storage**
- **Neocities**
- **Amazon S3 / S3-compatible endpoints**

When you configure and invoke these adapters:

1. File transfers occur directly between your application runtime and the cloud provider's API endpoint.
2. Your authentication credentials (e.g., API keys, service role tokens, bucket names) remain on your server or build environment. Zapwebp never routes credentials or media assets through any intermediate proxy.
3. Your use of these third-party platforms is subject to their respective terms of service and privacy policies.

---

## 7. Metadata Sanitization (Clean Mode)

Digital images often contain embedded metadata that may reveal sensitive information, including:

- GPS coordinates (exact latitude, longitude, and elevation of where a photo was taken);
- Camera and phone serial numbers;
- Author names, copyright details, and software history;
- Generative AI provenance tags and C2PA Content Credentials.

Zapwebp's **Clean Mode** (`--clean` or web app toggle) actively strips EXIF, XMP, IPTC, and C2PA metadata chunks from converted output files by default, protecting you and your users from unintended metadata leakage.

---

## 8. Analytics & Telemetry

Zapwebp maintains a strict **Zero-Telemetry Invariant**:

- The core conversion engine (`@zapwebp/core`) contains zero telemetry calls.
- The CLI (`packages/cli`) contains zero telemetry calls.
- The web app (`public/`) contains zero telemetry calls.
- We do not use Sentry, Google Analytics, Mixpanel, LogRocket, or any equivalent remote monitoring beacons.

You can verify this at any time by inspecting the source code on GitHub ([https://github.com/Zapwebp](https://github.com/Zapwebp)) or monitoring outbound network activity in your browser's Developer Tools (`Network` tab) during conversions.

---

## 9. User Rights & Data Deletion

Because Zapwebp does not store, retain, or process your personal data or image files on remote servers, there is no remote personal data to delete, rectify, or export.

- You retain complete ownership and control of all local files on your machine.
- You may purge local browser preferences at any time by clearing your browser's `localStorage`.
- You may purge local CLI undo history by deleting the `.zapwebp/` directory from your workspace or running `zap gc`.

If you have submitted an inquiry or communication to us via email and wish to request deletion of your correspondence, you may contact us directly at [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com), and we will fulfill your request promptly in accordance with applicable data privacy regulations.

---

## 10. Jurisdiction & Governing Law

Zapwebp is maintained in and operated under the jurisdiction of the **Republic of the Philippines**. Any questions, disputes, or regulatory considerations arising under this Privacy Policy shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including Republic Act No. 10173, otherwise known as the **Data Privacy Act of 2012** (DPA).

---

## 11. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect modifications in our software, legal requirements, or architectural enhancements. When changes are made, the "Last Updated" date at the top of this document will be revised. Significant changes will be announced in [CHANGELOG.md](CHANGELOG.md).

---

## 12. Contact Information

For any questions, concerns, or requests regarding this Privacy Policy or our privacy architecture, please contact:

- **Maintainer:** Eldrex Delos Reyes Bula
- **Email:** [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com)
- **Organization:** Zapwebp
- **Repository:** [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **Web App:** [https://zapwebp.vercel.app](https://zapwebp.vercel.app)
- **Documentation:** [https://zapwebp-docs.vercel.app/privacy](https://zapwebp-docs.vercel.app/privacy)
