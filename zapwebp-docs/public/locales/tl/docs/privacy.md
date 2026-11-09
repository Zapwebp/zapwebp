# Privacy Policy

Covers: zero-telemetry commitment, kawalan ng remote file storage, memory-only execution, pagsunod sa Batas Republika Blg. 10173 ng Pilipinas, at proteksyon sa cloud storage adapters.

Does not cover: mga panloob na patakaran ng network provider ng third-party. Tingnan ang [Storage Adapters](/plugins/storage).

Applies to: Lahat ng serbisyo at platform ng Zapwebp, web converter, CLI, MCP server, at storage adapters.

## Quick start

```bash
curl -I https://zapwebp.vercel.app/
```

Maintainer contact: [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com) · Republika ng Pilipinas.

## What it does

Mahigpit na ipinapatupad ng Zapwebp ang Zero-Telemetry Policy:
1. **100% In-Browser Conversion**: Ang pagproseso ng imahe sa web ay tumatakbo lamang sa memorya ng browser gamit ang HTML5 Canvas at WASM. Hindi ipinapadala ang iyong imahe sa anumang Zapwebp server.
2. **Zero Telemetry**: Walang Google Analytics, Meta Pixel, cookies, tracking beacons, o browser fingerprinting.
3. **Zero Asset Storage**: Walang gitnang database o imbakan ng mga imahe. Nabubura agad ang memory buffer sa pagsasara ng tab.
4. **Pagsunod sa R.A. 10173 (Data Privacy Act ng 2012)**: Binuo at pinapanatili sa ilalim ng hurisdiksyon ng Republika ng Pilipinas alinsunod sa mga panuntunan ng National Privacy Commission (NPC) ukol sa Transparency, Legitimate Purpose, at Proportionality (data minimization).

## Cloud Storage Adapters at Privacy

Sa paggamit ng `@zapwebp/storage`, sumusunod ang system sa Shared Responsibility Model:
- **Supabase Storage**: Pribado o pampublikong bucket na pinamamahalaan ng developer gamit ang Row Level Security (RLS).
- **Firebase Storage**: Google Cloud Storage bucket na pinamamahalaan sa ilalim ng Firebase Security Rules.
- **Neocities**: Pampublikong static web host. Lahat ng file sa Neocities ay pampubliko at naitatala sa access logs nang hanggang 24 buwan. Huwag mag-upload ng pribado o kumpidensyal na personal data sa Neocities.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_RATE_LIMIT` | Naabot ang limitasyon sa pag-upload sa Neocities | Pabagalin ang bilis ng pag-upload ayon sa patakaran |
| `privacy_telemetry_detected` | Na-inject na third-party script ng extension | Suriin ang mga naka-install na browser extension |

## For agents

```json
{
  "telemetry": false,
  "cookies": false,
  "jurisdiction": "Republic of the Philippines",
  "statute": "Republic Act No. 10173 (Data Privacy Act of 2012)",
  "compliance": "NPC, GDPR, Enterprise Architecture Ready",
  "contact": "eldrexdelosreyesbula@gmail.com"
}
```

## Related

- [Clean](/clean): Paano tinatanggal ang metadata sa mga imahe.
- [Security](/security): Pagsunod sa ISO 27001 at 27017.
- [Terms of Service](/terms): Mga legal na kondisyon ng paggamit.
- [Storage Adapters](/plugins/storage): Pre-upload conversion at cloud adapter security.
