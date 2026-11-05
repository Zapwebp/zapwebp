# Terms of Use

**Effective Date:** November 4, 2026  
**Last Updated:** November 4, 2026

Welcome to **Zapwebp**. These Terms of Use ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and **Eldrex Delos Reyes Bula** / **Zapwebp** ("Maintainer", "we", "us", or "our") regarding your access to and use of the Zapwebp website ([https://zapwebp.vercel.app](https://zapwebp.vercel.app)), documentation ([https://zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)), source code repositories ([https://github.com/Zapwebp](https://github.com/Zapwebp)), npm packages under the `@zapwebp` organization, command-line interfaces (`zap`, `zapwebp`), Model Context Protocol (MCP) servers, VS Code extensions, and related software tools and APIs (collectively, the "Service" or "Software").

By accessing, downloading, installing, embedding, or using any part of the Software, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must immediately discontinue downloading, installing, and using the Software.

---

## 1. Open Source License (MIT)

Zapwebp is free and open-source software distributed under the terms of the **MIT License**.

```text
MIT License

Copyright (c) 2026 Eldrex Delos Reyes Bula / Zapwebp

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

In the event of any conflict between these Terms and the MIT License with respect to your rights to inspect, copy, modify, merge, publish, distribute, sublicense, or sell copies of the open-source code, the MIT License shall govern.

---

## 2. Description of Service

Zapwebp provides a high-performance, transparency-safe image conversion engine, file inspection utilities, terminal interfaces, AI assistant tool providers, and cloud storage adapters.

The Service is provided on an **"AS IS"** and **"AS AVAILABLE"** basis. While we strive for deterministic, lossless transparency preservation and robust image processing, the Maintainer does not guarantee that:

- The Service will be uninterrupted, error-free, or fully secure;
- Conversions will achieve any specific byte-reduction target or visual compression ratio;
- The Software will be compatible with all hardware configurations, file system drivers, or operating system environments.

---

## 3. User Responsibilities & Content Rights

When using Zapwebp, you agree to comply with all applicable local, national, and international laws, regulations, and industry standards.

### 3.1 Ownership and Licensing of Processed Media

You represent and warrant that:

1. You are the lawful owner of, or possess all necessary licenses, rights, consents, and permissions to process, convert, modify, and store any images, graphics, vector files (SVG), or assets you process through Zapwebp.
2. Your use of the Software to convert or optimize media does not infringe, misappropriate, or violate any patent, copyright, trademark, trade secret, moral right, or other proprietary or contractual right of any third party.

### 3.2 Acceptable Use

You agree not to use Zapwebp to:

1. Process, store, or transmit any image or material that is illegal, defamatory, obscene, harassing, threatening, invasive of privacy, or promotes hate speech or violence.
2. Construct or inject malicious payloads into images, including embedding XML External Entity (XXE) exploits, cross-site scripting (XSS) vectors, or recursive entity expansion bombs within SVG files destined for distribution to unsuspecting parties.
3. Attempt to reverse engineer, bypass, or defeat security controls provided by the Software, including SVG sanitization rules, SSRF private network filters, or WASM memory bounds.
4. Distribute unauthorized, uncredited, or pirated copyright-protected creative works in violation of applicable copyright legislation.

---

## 4. Privacy Summary

Zapwebp is engineered under a strict **Zero-Telemetry, Local-First Architecture**:

- All conversions performed in the web app ([https://zapwebp.vercel.app](https://zapwebp.vercel.app)) run **locally inside your browser** using WebAssembly (WASM) and client-side Canvas. Your files are **never uploaded to our servers**.
- The CLI, SDK, and MCP tools execute **entirely on your local machine** or private server runtime.
- We do not run user-tracking cookies, third-party analytics trackers, or phone-home telemetry in the core engine.

For complete details on data handling, browser storage, and third-party adapters, please review our full [Privacy Policy](PRIVACY.md).

---

## 5. Third-Party Services & Cloud Storage Adapters

Zapwebp provides optional first-party and community integration plugins (e.g., `@zapwebp/storage` supporting Supabase Storage, Firebase Storage, and Neocities, as well as deployment platforms like Vercel).

You acknowledge and agree that:

1. All network communication initiated by storage plugins connects directly between your local runtime and your chosen third-party service provider using credentials (API keys, service tokens) supplied by you.
2. The Maintainer has no custody over, access to, or visibility into your cloud storage buckets, uploaded assets, or API credentials.
3. You are solely responsible for compliance with the terms of service, billing policies, bandwidth caps, and security standards of any third-party provider you configure. The Maintainer is not responsible for cloud hosting bills, API rate limits, or accidental deletions executed through storage delete cascades.

---

## 6. Limitation of Liability

To the maximum extent permitted by applicable law, in no event shall **Eldrex Delos Reyes Bula**, **Zapwebp**, its contributors, maintainers, or affiliates be liable for any direct, indirect, incidental, special, consequential, exemplary, or punitive damages, including but not limited to:

- Loss of data, corrupted image files, or irreversible deletion of assets;
- Cloud storage expenses, network egress costs, or infrastructure billing overruns;
- Business interruption, loss of profits, goodwill, or commercial revenue;
- Security breaches, compromised API keys, or unauthorized access to your computer systems or cloud services;
- Inability to use or downtime of the web application or documentation portal;

whether based on warranty, contract, tort (including negligence), strict liability, or any other legal theory, even if the Maintainer has been advised of the possibility of such damages.

---

## 7. Indemnification

You agree to defend, indemnify, and hold harmless Eldrex Delos Reyes Bula, Zapwebp, and its contributors from and against any claims, liabilities, damages, judgments, losses, costs, expenses, or fees (including reasonable legal and attorneys' fees) arising out of or relating to:

1. Your violation of these Terms;
2. Your violation of any third-party right, including any intellectual property, privacy, or proprietary right, in connection with files processed using the Software;
3. Your deployment, distribution, or commercial offering of applications built with or incorporating the Software.

---

## 8. Governing Law and Jurisdiction

These Terms, and any dispute, controversy, or claim arising out of or in connection with them, their subject matter, or their formation, shall be governed by and construed in accordance with the laws of the **Republic of the Philippines**, without regard to its conflict of law provisions.

Any legal suit, action, or proceeding arising out of or related to these Terms or the Software shall be instituted exclusively in the competent courts located in the **Republic of the Philippines**. You waive any and all objections to the exercise of jurisdiction over you by such courts and to venue in such courts.

---

## 9. Modifications to Terms

We reserve the right to modify or replace these Terms at any time in our sole discretion. Any revisions will be reflected in this file ([TERMS.md](TERMS.md)) with an updated "Last Updated" date at the top of the document.

Significant revisions will be noted in our repository changelog ([CHANGELOG.md](CHANGELOG.md)). By continuing to access or use the Software following the posting of any revised Terms, you agree to be bound by the modified terms.

---

## 10. Contact Information

If you have any questions, legal notices, or inquiries regarding these Terms of Use, please contact:

- **Maintainer:** Eldrex Delos Reyes Bula
- **Email:** [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com)
- **Organization:** Zapwebp
- **Repository:** [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **Web App:** [https://zapwebp.vercel.app](https://zapwebp.vercel.app)
- **Documentation:** [https://zapwebp-docs.vercel.app/terms](https://zapwebp-docs.vercel.app/terms)
