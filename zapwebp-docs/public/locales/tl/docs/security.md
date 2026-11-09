# Security

Covers: Arkitektura ng seguridad, mga proseso sa pag-uulat ng kahinaan (vulnerabilities), ISO/IEC 27001 at ISO/IEC 27017 alignment, mga sinusuportahang bersyon, at mga garantiya sa zero-telemetry boundary.

Does not cover: Karaniwang mga error sa conversion ng gumagamit. Tingnan ang [Errors](/errors) at [Safety](/safety).

Applies to: Lahat ng mga package ng Zapwebp, CLI, web application, MCP server, at cloud storage adapters.

## Quick start

```bash
# I-verify ang offline mode habang nagko-convert
npx zapwebp icon.svg --dry-run
```

Upang mag-ulat ng kahinaan nang pribado, mag-email sa [eldrexdelosreyesbula@gmail.com](mailto:eldrexdelosreyesbula@gmail.com) na may `[SECURITY VULNERABILITY]` sa subject line.

## What it does

Ipinapatupad ng Zapwebp ang matatag na mga hangganang panseguridad laban sa mga mapanganib na imahe at hindi pinagkakatiwalaang input:

- **Paglilinis ng SVG**: Tinatanggal ang executable JavaScript, mga event handler, `<foreignObject>`, at mga pasadyang XML entity (XXE).
- **Pagpigil sa SSRF**: Hinaharang ang mga panloob na network endpoint, pribadong subnet (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`), link-local metadata (`169.254.169.254`), at IPv6 equivalents.
- **Pagpapatatag ng Filesystem at Storage**: Enforces 1024-byte path limit, mahigpit na tinatanggihan ang path traversal (`..`), mga absolute filesystem path, at `file://` schemes.
- **Zero Credential Leaks**: Awtomatikong tinatanggal at nire-redact ang mga bearer token, password, at secret key bago gumawa ng log o error message.
- **Zero Remote Retention**: Ang conversion sa browser ay tumatakbo sa nakahiwalay na memorya; ang CLI ay tumatakbo sa lokal na disk nang walang anumang telemetry.

## Pagsunod sa ISO/IEC 27001 at ISO/IEC 27017

Sumusunod ang Zapwebp sa mga pandaigdigang pamantayan sa cybersecurity at proteksyon sa cloud storage:
- **A.8.1 Pamamahala ng Asset**: Paggawa ng SHA-256 cryptographic digest para sa bawat nalikhang file.
- **A.9 Kontrol sa Pag-access**: Mahigpit na path sandboxing at mga opisyal na template para sa Supabase Row Level Security (RLS) at Firebase Rules.
- **A.10 Cryptography**: Sapilitang TLS 1.3 sa cloud adapters; zero-plaintext credentials sa source code.
- **A.12 Seguridad sa Operasyon**: Memory-only execution; 16MP (4096×4096) at 256MB WASM limits.
- **A.13 Seguridad sa Komunikasyon**: Autonomous SSRF prevention at pagharang sa cloud metadata endpoints.
- **A.18 Pagsunod sa Batas**: Pagsunod sa Republic Act No. 10173 (Data Privacy Act of 2012 ng Pilipinas).

## Supported Versions

| Linyang Bersyon | Katayuan | Antas ng Suporta sa Seguridad |
|:---|:---:|:---|
| **2.x** | Aktibo | Buong security patches, dependency updates, at feature backports |
| **1.x** | Maintenance | Kritikal na security fixes at vulnerability patches lamang |
| **< 1.0** | End of Life | Hindi na suportado; mag-upgrade sa pinakabagong stable release |

## Response Timeline

| Yugto | Target na Oras | Aksyon |
|---|---|---|
| **Paunang Pagkilala** | **Sa loob ng 48 oras** | Kilalanin ang ulat at magtalaga ng tracking identifier |
| **Triage at Pagsusuri** | **Sa loob ng 72 oras** | Subukan ang isyu at tukuyin ang kalubhaan ng CVSS |
| **Pagbuo ng Patch** | **Sa loob ng 5–7 araw** | Gumawa ng solusyon, magpatakbo ng regression tests, at maghanda ng release |
| **Koordinadong Pagpapalabas** | **Koordinado** | I-publish ang na-patch na npm release at GitHub Security Advisory |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | Naglalaman ang SVG ng scripts, foreignObjects, o event handlers | Linisin ang SVG markup o gamitin ang `--allow-unsafe` kung pinagkakatiwalaan |
| `E_UNSAFE_URL` | Tinangkang kunin ang private subnet o localhost URL | Magbigay ng pampublikong HTTPS URL ng imahe |
| `E_PATH_TRAVERSAL` | Lumabas ang path ng file sa hangganan ng working directory o lumampas sa 1024 bytes | Tukuyin ang path sa loob ng workspace o bucket root |

## For agents

```json
{
  "policy": "security",
  "contact": "eldrexdelosreyesbula@gmail.com",
  "disclosure": "coordinated",
  "supportedVersions": ["2.x", "1.x"],
  "standards": ["ISO/IEC 27001:2022", "ISO/IEC 27017:2015"],
  "protections": ["xxeDefense", "scriptSanitization", "ssrfBlocker", "pathTraversalGuard", "credentialRedaction"]
}
```

## Related

- [Safety](/safety): Mahigpit na mga garantiya sa pagpapatunay ng asset.
- [Privacy Policy](/privacy): Patakaran sa zero telemetry at pangangasiwa ng data.
- [Storage Adapters](/plugins/storage): Ligtas na pre-upload conversion para sa Supabase, Firebase, at Neocities.
- [Errors](/errors): Kumpletong listahan ng mga error code na nababasa ng makina.
