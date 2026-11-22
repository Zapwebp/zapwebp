# Patakaran sa Privacy

**Petsa ng Pagpapatupad:** Nobyembre 1, 2025  
**Huling Binago:** Nobyembre 21, 2026  
**Jurisdiction:** Republika ng Pilipinas  
**Batas na Sumasaklaw:** Batas Republika Blg. 10173 (Data Privacy Act of 2012)  

Ang Zapwebp ay may mahigpit na pangako sa arkitektura: **Zero Tracking, Memory-Only Execution**. Naniniwala kami na ang mga tool sa pag-convert ng imahe ay walang lehitimong dahilan upang mangalap ng personal na data, mag-imbak ng mga file sa remote server, o magsubaybay sa kilos ng user.

---

## 1. Pangkalahatang Buod at Garantiyang Pang-arkitektura

1. **100% Client-Side In-Browser Execution**: Ang pag-convert sa web application (`https://zapwebp.vercel.app`) ay tumatakbo nang buo sa loob ng browser tab gamit ang WebAssembly (WASM) at HTML5 Canvas. **Ang iyong mga imahe ay hindi kailanman ipinapadala sa alinmang Zapwebp server.**
2. **Zero Telemetry at Walang Analytics**: Walang tracking scripts, web beacons, tracking pixels (tulad ng Google Analytics, Meta Pixel), at walang error beacons (tulad ng Sentry o LogRocket).
3. **Walang Remote Asset Storage**: Hindi nagpapatakbo ang Zapwebp ng cloud databases o storage caches. Pagkasara ng browser tab, agarang binubura ang mga memory buffer.
4. **Local-Only Terminal at Agent Workflows**: Ang CLI (`zapwebp`) at MCP server (`@zapwebp/mcp`) ay lokal na tumatakbo sa iyong workstation na walang palabas na network calls.

---

## 2. Pagsunod sa Batas Republika Blg. 10173 (Data Privacy Act of 2012)

Ang Zapwebp ay pinapanatili ni Eldrex Delos Reyes Bula sa ilalim ng hurisdiksyon ng **Republika ng Pilipinas**. Mahigpit naming sinusunod ang mga probisyon ng **Batas Republika Blg. 10173 (Data Privacy Act of 2012 o DPA)** sa pangangasiwa ng **National Privacy Commission (NPC)**:

- **Prinsipyo ng Transparency**: Malinaw na ipinapaalam sa mga gumagamit na ang pagpoproseso ay nagaganap 100% sa lokal na memorya. Walang personal na datos ang kinokolekta.
- **Prinsipyo ng Legitimate Purpose**: Kapag ginagamit ang `@zapwebp/storage`, ang pagpapadala ng file ay nagaganap lamang patungo sa sariling cloud storage bucket ng developer (tulad ng Supabase o Firebase).
- **Prinsipyo ng Proportionality (Data Minimization)**: Sa pamamagitan ng **Clean Mode**, awtomatikong inaalis ang GPS coordinates, camera serial numbers, at EXIF metadata bago i-save ang imahe.
- **Mga Karapatan ng Data Subject**: Kinikilala ng Zapwebp ang mga karapatan ng bawat indibidwal sa ilalim ng DPA, kabilang ang Karapatang Malaman (Right to be Informed) at Karapatang Magpabura (Right to Erasure).

---

## 3. Impormasyong Hindi Namin Kinokolekta

| Kategorya | Katayuan | Paliwanag |
|---|:---:|---|
| **Pagkakakilanlan ng User** | **Hindi Kinokolekta** | Walang pangalan, email address, telepono, o tirahan. |
| **Authentication Credentials** | **Hindi Kinokolekta** | Walang password, OAuth tokens, o login accounts. |
| **Nilalaman ng Imahe** | **Hindi Kinokolekta** | Ang mga pixel buffer ay nananatili lamang sa volatile RAM. |
| **Paggamit at Telemetry** | **Hindi Kinokolekta** | Walang click tracking o behavioral analysis. |
| **Device at Network IP** | **Hindi Kinokolekta** | Walang IP address logging o fingerprinting. |
| **Cookies** | **Hindi Kinokolekta** | Walang HTTP cookies o persistent tracking tokens. |

---

## 4. Cloud Storage Adapters at Shared Responsibility

Kapag ginagamit ang `@zapwebp/storage`, sumusunod ang developer at provider sa isang **Shared Responsibility Model**:
- **Tungkulin ng Zapwebp**: Ligtas na pag-convert sa memory, pag-alis ng sensitibong metadata (Clean Mode), at pagtiyak na walang path traversal (`..`).
- **Tungkulin ng Developer**: Ligtas na pamamahala ng sariling API keys at pagsasaayos ng storage bucket permissions (RLS policies).

---

## 5. Pakikipag-ugnayan at National Privacy Commission

Para sa mga katanungan tungkol sa patakarang ito, makipag-ugnayan sa maintainer:
- **Data Controller:** Eldrex Delos Reyes Bula
- **Email:** `eldrexdelosreyesbula@gmail.com`
- **Lokasyon:** Republika ng Pilipinas

Maaari ring sumangguni sa National Privacy Commission ng Pilipinas:
- **Website:** [https://privacy.gov.ph](https://privacy.gov.ph)
- **Email:** `complaints@privacy.gov.ph`
