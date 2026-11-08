# Privacy Policy

Covers: zero-telemetry commitment, kawalan ng remote file storage, memory-only execution, at proteksyon sa data ng gumagamit.

Does not cover: mga patakaran ng third-party storage providers. Tingnan ang [Storage Adapters](/plugins/storage).

Applies to: Lahat ng serbisyo at platform ng Zapwebp.

## Quick start

```bash
curl -I https://zapwebp.vercel.app/
```

I-verify na walang mga tracking cookie o analytics script na ibinabalik sa header.

## What it does

Mahigpit na ipinapatupad ng Zapwebp ang Zero-Telemetry Policy:
1. Walang analytics, telemetry, o tracking cookies.
2. Walang iniimbak na imahe sa mga server; lahat ng conversion sa web ay in-memory lamang.
3. Awtomatikong tinatanggal ang EXIF, GPS, at AI metadata sa Clean Mode.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_SSRF_BLOCKED` | Pagharang sa mga kahina-hinalang panloob na IP address | Magbigay lamang ng mga ligtas na pampublikong URL |

## For agents

```json
{
  "telemetry": false,
  "cookies": false,
  "localStorageUsage": "User preferences only (theme, language)",
  "compliance": "GDPR, CCPA, Enterprise Ready"
}
```

## Related

- [Clean](/clean): Paano tinatanggal ang metadata sa mga imahe.
- [Terms of Service](/terms): Mga legal na kondisyon ng paggamit.
