# Patakaran sa Seguridad

Para sa Zapwebp, ang seguridad at pagiging kumpidensyal ng data ay pangunahing simulain sa arkitektura. Dahil ginagamit ang Zapwebp sa iba't ibang kapaligiran—kabilang ang mga terminal, CI/CD pipelines, AI agents, at web browsers—nagpapatupad kami ng mahigpit na mga panuntunan upang maprotektahan ang mga system mula sa mga malisyosong input at hindi awtorisadong access.

---

## 1. Mga Panuntunang Pangseguridad sa Arkitektura

### Pagsusuri sa SVG (Vector Hardening)
- **Pagtanggi sa Executable Code**: Anumang SVG na naglalaman ng `<script>`, inline event handlers (`onload`, `onclick`), o `<foreignObject>` ay agad tinatanggihan gamit ang error na `E_UNSAFE_SVG`.
- **Proteksyon Laban sa XXE**: Ipinagbabawal ang mga custom entity (`<!ENTITY>`) at external DOCTYPE declarations upang maiwasan ang XML Entity Expansion attacks.

### Proteksyon Laban sa SSRF
- **Paghaharang sa Pribadong Network**: Ang mga remote image request na tumuturo sa loopback (`127.0.0.1`), pribadong IP subnets (`10.0.0.0/8`, `192.168.0.0/16`), o cloud metadata endpoints (`169.254.169.254`) ay agarang hinaharang.
- **Ligtas na HTTPS Lamang**: Tanging mga secure na `https://` URL ang pinapayagang i-fetch.

### Sandboxing sa Filesystem
- **Paghahadlang sa Path Traversal**: Tinitiyak ng lahat ng lokal na operasyon na ang mga path ay nananatili sa loob ng authorized project directory (`resolveInside`). Ang mga path na nagtatangkang tumakas gamit ang `..` ay hinaharang gamit ang `E_PATH_TRAVERSAL`.

### Mga Limitasyon sa Memorya
- **Sukat ng Imahe**: Bounded ang mga input sa 4096 × 4096 pixels (16 Megapixels).
- **WASM Heap**: Limitado ang WebAssembly memory sa 256MB upang maiwasan ang client-side crash.

---

## 2. Pagsunod sa mga Pamantayan (ISO/IEC 27001 at 27017)

Sumusunod ang Zapwebp sa mga internasyonal na pamantayan sa cybersecurity:
- **A.8.1 Asset Management**: Paggamit ng SHA-256 cryptographic digests para sa bawat na-convert na variant.
- **A.9 Access Control**: Strict path sandboxing at Row Level Security templates para sa cloud storage.
- **A.10 Cryptography**: Sapilitang TLS 1.3 sa cloud adapters at walang plaintext credentials sa code.
- **A.12 Operations Security**: Memory-only execution nang walang disk swap sa web.
- **CLD.8.1.5 Cascading Deletion**: Maayos at tiyak na pagbura ng lahat ng derived scale (@1x/@2x/@3x) kapag nagbura ng asset.

---

## 3. Mga Sinusuportahang Bersyon

| Bersyon | Katayuan | Antas ng Suporta |
|:---:|:---:|---|
| **2.x** | **Aktibo** | Buong security patches, dependency updates, at feature fixes. |
| **1.x** | **Maintenance** | Mga kritikal na vulnerability patch lamang. |
| **< 1.0** | **End of Life** | Hindi na sinusuportahan; kailangang mag-upgrade. |

---

## 4. Pag-uulat ng Kahinaan (Vulnerability Disclosure)

Kung may natuklasan kang posibleng kahinaan o security issue sa Zapwebp, mangyaring ipagbigay-alam ito nang pribado:
- **Email:** `eldrexdelosreyesbula@gmail.com`
- **Subject:** `[SECURITY VULNERABILITY] <Maikling Deskripsyon>`

Nangangako kaming tutugon sa loob ng 48 oras upang kumpirmahin ang ulat, at makikipagtulungan para sa responsableng coordinated disclosure.
