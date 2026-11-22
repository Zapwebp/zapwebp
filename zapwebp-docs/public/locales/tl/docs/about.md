# Tungkol sa Zapwebp

Ang Zapwebp ay isang enterprise-grade at transparency-safe na engine para sa pag-convert at pag-optimize ng imahe na idinisenyo upang permanenteng lutasin ang problema ng aksidenteng pagkawala ng aninag (transparency) sa digital media. Sa ilalim ng doktrinang **"Drop. Convert. Done."**, nagbibigay ang platform ng bit-for-bit alpha preservation, deterministic format encoding, zero telemetry, at memory-only execution sa web browsers, terminal, AI agents, code editors, at cloud pipelines.

Pinapanatili ang Zapwebp ni **Eldrex Delos Reyes Bula** sa Republika ng Pilipinas at ipinamamahagi sa ilalim ng **MIT License**.

---

## Pinagmulan at Ebolusyon ng Proyekto

### Ang Simula: Ang "Black Background Bug" (Huling Bahagi ng 2025)

Nagsimula ang Zapwebp dahil sa isang matagal nang depekto sa mga image conversion tool: ang tahimik na pagkawala ng aninag (alpha transparency). Madalas mapansin ng mga developer at designer na kapag nag-convert ng mga transparent na SVG icon o PNG logo gamit ang karaniwang command-line tools (tulad ng lumang ImageMagick scripts o payak na Canvas implementations), ang mga transparent na bahagi ay nagiging itim na kahon (RGB 0, 0, 0).

Nasira nito ang mga UI icon at lumikha ng mga visual regression lalo na sa dark mode.

Upang permanenteng malutas ito, nilikha ang Zapwebp bilang isang magaan at nakatuong SVG-to-WebP converter na 100% tumatakbo sa memory ng browser. Sa pamamagitan ng direktang pagsusuri sa alpha channel, tiniyak ng Zapwebp ang zero black backgrounds nang hindi nangangailangan ng cloud uploads o account registration.

### Ebolusyon Tungo sa Multi-Format Engine (v1.x)

Dahil sa mabilis na pagtanggap ng komunidad, inihiwalay ang conversion core bilang `@zapwebp/core`, pinagsama ang Rust SVG engine (`@resvg/resvg-js`) at native `libvips` (`sharp ^0.35.5`) kasama ang WebAssembly (WASM).

Lumalawak ang suporta sa iba't ibang format:
- **SVG**: Mahigpit na XML validation at sanitization.
- **PNG**: Kumpletong 8-bit at 16-bit alpha channel preservation.
- **WebP**: Suporta para sa lossy at lossless modes.
- **AVIF**: Mataas na compression na may ganap na alpha support.
- **JPEG**: Opaque format na nangangailangan ng malinaw na background color bago i-flatten.
- **GIF at TIFF**: Pag-decode ng multi-layer at animated formats.

Ipinatupad ang panuntunan: **ang transparent na imahe ay hindi kailanman tahimik na gagawing opaque**. Ang pag-convert ng transparent image sa JPEG ay agad humihinto sa `E_ALPHA_NOT_REPRESENTABLE` maliban kung nagbigay ng `--background` color.

### Paglawak sa Buong Developer Ecosystem

Mula sa simpleng web tool, naging kumpletong developer platform ang Zapwebp:
1. **Terminal CLI (`zap` / `zapwebp`)**: Single file, batch globbing, watch mode, multiplier scaling (`@1x`, `@2x`, `@3x`), at reversible transaction journals sa `.zapwebp/journal/`.
2. **AI Agent Protocol (`@zapwebp/mcp`)**: Model Context Protocol server na may 15 tools, 6 prompts, at 7 resources para sa mga AI coding assistant (Cursor, Windsurf, Claude, Antigravity).
3. **Editor Extension (`ebula.zapwebp-vscode`)**: Extension para sa VS Code at Open VSX na may context-aware QuickPick menus at magic byte sniffing.
4. **Cloud Storage Adapters (`@zapwebp/storage`)**: Mga adapter para sa Supabase, Firebase, at Neocities na may pre-upload conversion at cascading delete.
5. **Framework Plugins**: Mga build plugin para sa Vite, Next.js, at Laravel.

### Makabagong Enterprise Architecture (v2.x – v2.28.0)

Sa bersyong 2.x, umabot ang Zapwebp sa antas ng Enterprise Architecture alinsunod sa ISO/IEC 25010 at ISO/IEC 27001/27017:
- **Target Lock Architecture (`@zapwebp/lock`)**: Pagpapatupad ng canonical target formats na walang generational quality loss.
- **Clean Mode**: Pagtanggal ng EXIF, GPS, camera serials, at C2PA AI credentials na may cryptographic Clean Certificate.
- **Smart Optimization**: 10 automatic format at quality profiles batay sa pagsusuri ng pixel buffer at edge density.
- **Lossless Verification**: Matematikal na pagpapatunay ng bit-exact pixel identity.
- **Original File Deletion Opt-In**: Ligtas at boluntaryong pagbura ng orihinal na file na may SHA-256 pre-verification at 30-araw na backup sa `.zapwebp/backups/`.
- **Mga Format Plugin**: Multi-size ICO at favicon suite generator (`@zapwebp/format-ico`), at byte constraint compression (`@zapwebp/compressor`).
- **Universal Documentation Delivery Engine (`@zapwebp/docs`)**: Compiler para sa static HTML, bot-crawlable pages, at raw markdown mirrors para sa AI agents.

---

## Mga Simulain sa Arkitektura

| Simulain | Kahulugan at Pagpapatupad |
|---|---|
| **Drop. Convert. Done.** | Walang signup, walang bayad, walang patalastas, at walang telemetry. |
| **Fail Loudly** | Hindi kailanman itinatago ang mga error; agarang naglalabas ng malinaw na structured error code kapag may problema. |
| **Minimum Sufficient Architecture** | Walang labis na dependencies; gumagamit ng native Web APIs at standard CJS/ESM modules. |
| **Zero Telemetry at Local Memory** | 100% tumatakbo sa client RAM sa pamamagitan ng WASM; walang imaheng ipinapadala sa remote server ng Zapwebp. |
| **Isang Direksyong Daloy ng Dependency** | `apps/*` $\rightarrow$ `packages/features` $\rightarrow$ `packages/core` $\rightarrow$ `packages/shared`. |

---

## Pamunuan at Pamamahala

- **Tagapamahala:** Eldrex Delos Reyes Bula
- **Jurisdiction:** Republika ng Pilipinas
- **Opisyal na Website:** [https://zapwebp.vercel.app](https://zapwebp.vercel.app)
- **Documentation Portal:** [https://zapwebp-docs.vercel.app](https://zapwebp-docs.vercel.app)
- **Source Code:** [https://github.com/Zapwebp](https://github.com/Zapwebp)
- **Pakikipag-ugnayan:** `eldrexdelosreyesbula@gmail.com`
- **Lisensya:** MIT License ([LICENSE](https://github.com/Zapwebp/zapwebp/blob/main/LICENSE))
