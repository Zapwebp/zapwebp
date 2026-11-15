# Lossless sa Zapwebp

Covers: Ang kahulugan ng "lossless" sa Zapwebp, pagpapatunay ng pixel identity sa matematika, pagsusuri sa kalidad ng pinagmulang imahe, ratio ng epekto sa laki ng file, pagtuklas ng degraded na source, at ang error code na E_LOSSLESS_MISMATCH.
Does not cover: Mga profile ng pag-compress sa lossy quality (tingnan ang [Convert](/convert.md)), pag-aalis ng container metadata (tingnan ang [Clean](/clean.md)), o matrix ng mga format (tingnan ang [Formats](/formats.md)).
Applies to: `@zapwebp/core` (`convert`, `convertImage`), `@zapwebp/cli` (`--lossless`), `@zapwebp/mcp` (`convert_image`), `@zapwebp/sdk`, at cockpit ng web app.

## Quick start

```javascript
import { convert, inspect } from '@zapwebp/core';

// 1. Suriin ang imahe upang malaman ang kalidad ng source bago mag-convert
const info = await inspect(imageBytes);
console.log(info.format); // hal. 'png'

// 2. I-convert na may napatunayang lossless pixel preservation
const result = await convert(imageBytes, {
  to: 'webp',
  lossless: true,
});

console.log(result.lossless);         // true
console.log(result.losslessVerified); // true (kumpirmadong magkatugma ang bawat pixel)
console.log(result.sourceQuality);    // { estimated: 'high', reason: 'PNG input with no prior lossy compression detected.' }
console.log(result.sizeImpact);       // { lossyEstimate: 45000, losslessActual: 112000, ratio: 2.5, note: '...' }
```

Paggamit sa CLI:

```bash
# Mag-convert nang lossless na may awtomatikong pagsusuri ng pixel at ulat sa laki
zap input.png -o output.webp --lossless
```

## What it does

### Ang Katotohanan Tungkol sa Lossless

Isang karaniwang maling akala ng mga gumagamit at developer ay ang pagpili ng "lossless" ay magpapataas diumano sa kalidad ng imahe, magpapalinaw sa malabong litrato, o mag-aayos sa mga compression artifact.

**Ang totoo:**
- **Ang lossless ay garantiya sa proseso ng pipeline, hindi pampaganda ng imahe.** Ginagarantiya nito na ang partikular na conversion na ito ay hindi magbabawas ng anumang impormasyon ng pixel ($0\text{ dB}$ generational loss).
- **Pinapanatili ng lossless ang input nang buo at eksakto.** Kung malabo, maingay, o may 8×8 block compression artifacts na mula sa lumang JPEG ang iyong imahe, kokopyahin at pananatilihin ng lossless encoder ang bawat depekto nang eksakto sa pixel space.
- **Kadalasan ay mas malaki ang lossless files.** Ang lossy encoder ay nagtatapon ng hindi nakikitang ingay at banayad na pagkakaiba ng kulay. Ang lossless encoder naman ay kailangang mag-imbak ng bawat kulay at ingay. Kung may compression noise ang imahe, kailangang i-compress ng lossless ang ingay na iyon, kaya kadalasang $2\times$ hanggang $4\times$ na mas malaki ang output kaysa sa lossy.

| Inaakala ng marami | Ang totoong ginagawa ng lossless |
|---|---|
| "Lossless = pinakamataas na visual quality" | Lossless = walang impormasyong nawawala sa *hakbang na ito* |
| "Aayusin ng lossless ang malabong larawan" | Pananatilihing malabo ng lossless ang larawan nang eksakto |
| "Mas magiging malinis ang file sa lossless" | Pananatilihin ng lossless ang lumang compression artifacts at ingay |
| "Palaging pinakamainam ang lossless" | Mainam lamang ang lossless kung malinis ang orihinal at kailangan ang eksaktong pixels |

### Kailan Gagamitin ang Lossless vs. Lossy

| Uri ng Imahe | Inirerekomendang Mode | Target Format | Dahilan |
|---|---|---|---|
| Vector graphics (SVG) | Lossless | WebP / PNG / AVIF | Matatalas na linya, teksto, at patag na kulay ay mabilis ma-compress at mananatiling matalas. |
| Icons, logos, UI assets | Lossless | WebP / PNG | Mataas na contrast at transparency na kailangan ng pixel-perfect precision. |
| Pixel art at screenshots | Lossless | WebP / PNG | Ang matatalas na hangganan ng kulay ay nagiging malabo kapag ginamitan ng lossy encoding. |
| Litrato (Photographic PNG) | Lossy (quality: 80–85) | AVIF / WebP | Milyun-milyong banayad na gradients ay $60–80\%$ na mas maliit nang walang kapansin-pansing bawas sa kalidad. |
| Umiiral na JPEG imahe | Lossy (quality: 80–85) | WebP / AVIF | Bawas na ang impormasyon ng JPEG; palalakihin lamang ng lossless ang file nang walang benepisyo. |

### Pagpapatunay ng Pixel Identity (`losslessVerified`)

Kapag `lossless: true` ang hiniling para sa mga format na sumusuporta sa alpha (WebP, PNG, AVIF), nagsasagawa ang `@zapwebp/core` ng awtomatikong pagsusuri pagkatapos mag-encode:
1. Kinukuha ang uncompressed RGBA pixel buffer ng orihinal o na-transform na imahe.
2. Dini-decode muli ang na-encode na output pabalik sa uncompressed RGBA pixel buffer.
3. Inihahambing ang bawat indibidwal na channel ($R, G, B, A$) sa bawat pixel coordinate.
4. Kung may magkaibang pixel, hihinto ang engine at maglalabas ng error na `E_LOSSLESS_MISMATCH`.
5. Kapag napatunayang magkatugma, ibinabalik ang `losslessVerified: true`.

### Pagsusuri sa Kalidad ng Source (`sourceQuality`)

Sinusuri ng Zapwebp ang mga pinagmulang file bago at habang nagko-convert:
- **`'high'`**: Vector graphics (SVG) at orihinal na PNG na walang lumang compression loss.
- **`'medium'`**: WebP o AVIF inputs na maaaring dumaan sa lossy compression dati, o maingay na PNG.
- **`'low'`**: JPEG inputs (`.jpg`, `.jpeg`). Ang lossless conversion sa JPEG ay nagpapanatili ng compression blocks at naglalabas ng babala sa CLI, MCP, at Web UI.

### Pagsusuri sa Epekto sa Sukat (`sizeImpact`)

Bawat lossless conversion ay nagbibigay ng paghahambing laban sa tinantyang lossy size:
- `lossyEstimate`: Tinantyang byte size kung standard lossy compression ang gagamitin.
- `losslessActual`: Eksaktong byte size ng lossless output.
- `ratio`: Multiplier (hal. `2.5` ibig sabihin ay $2.5\times$ na mas malaki ang lossless).
- `note`: Gabay at paliwanag ukol sa trade-off ng laki at pixel fidelity.

## Errors

| Error Code | Sanhi | Lunas |
|---|---|---|
| `E_LOSSLESS_MISMATCH` | Magkaiba ang na-decode na pixels ng output sa pixels ng input sa lossless mode. | Tiyaking sumusuporta sa buong lossless encoding ang target format at walang ginamit na background flattening. |
| `E_ALPHA_NOT_REPRESENTABLE` | Humiling ng lossless conversion sa JPEG nang walang ibinigay na background color. | Hindi kayang mag-imbak ng transparency o lossless data ng JPEG. Piliin ang WebP, PNG, o AVIF. |
| `E_INVALID_CONFIG` | Humiling ng `lossless: true` kasama ng target na `to: 'jpeg'`. | Walang lossless encoding sa JPEG. Alisin ang `lossless` o pumili ng WebP, PNG, o AVIF. |

## For agents

```json
{
  "topic": "Lossless Conversion & Pixel Verification",
  "truth": "Lossless guarantees zero generational quality loss during conversion; it does NOT improve low-quality or degraded input images.",
  "rules": [
    "Never recommend lossless for JPEG inputs. Lossless encoding on JPEG preserves 8x8 block artifacts and produces files 2x-4x larger than lossy re-encoding.",
    "Always check sourceQuality in inspect() or convert() results before recommending lossless to users.",
    "When target is JPEG, lossless is technically impossible and throws E_INVALID_CONFIG.",
    "For icons, logos, SVGs, and pixel art, lossless is recommended (lossless: true with to: 'webp' or to: 'png').",
    "For photographic content, recommend lossy (quality: 80 to 85, to: 'webp' or to: 'avif') unless the user explicitly demands archival pixel perfection."
  ],
  "resultFields": {
    "lossless": "boolean indicating if lossless encoding was applied",
    "losslessVerified": "boolean indicating whether decoded RGBA pixels matched source RGBA pixels with 100% identity",
    "sourceQuality": {
      "estimated": "high | medium | low",
      "reason": "Human-readable explanation of source asset quality"
    },
    "sizeImpact": {
      "lossyEstimate": "Projected byte size under lossy encoding",
      "losslessActual": "Actual output byte size",
      "ratio": "Multiplier (losslessActual / lossyEstimate)",
      "note": "Recommendation regarding size versus fidelity tradeoff"
    }
  }
}
```

## Related

- [Convert Dokumentasyon](/convert.md)
- [Matrix ng mga Format](/formats.md)
- [Clean Mode Pag-alis ng Metadata](/clean.md)
- [Core SDK Reference](/sdk/core.md)
- [Talaan ng mga Error](/errors.md)
