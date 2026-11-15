# Lossless in Zapwebp

Covers: What "lossless" means in Zapwebp, mathematical pixel identity verification, source quality evaluation, size impact ratios, degraded source detection, and the E_LOSSLESS_MISMATCH error.
Does not cover: Lossy quality optimization profiles (see [Convert](/convert.md)), container metadata stripping (see [Clean](/clean.md)), or format conversion matrix (see [Formats](/formats.md)).
Applies to: `@zapwebp/core` (`convert`, `convertImage`), `@zapwebp/cli` (`--lossless`), `@zapwebp/mcp` (`convert_image`), `@zapwebp/sdk`, and web app cockpit.

## Quick start

```javascript
import { convert, inspect } from '@zapwebp/core';

// 1. Inspect image to check source quality before conversion
const info = await inspect(imageBytes);
console.log(info.format); // e.g. 'png'

// 2. Convert with verified lossless pixel preservation
const result = await convert(imageBytes, {
  to: 'webp',
  lossless: true,
});

console.log(result.lossless);         // true
console.log(result.losslessVerified); // true (pixel identity confirmed)
console.log(result.sourceQuality);    // { estimated: 'high', reason: 'PNG input with no prior lossy compression detected.' }
console.log(result.sizeImpact);       // { lossyEstimate: 45000, losslessActual: 112000, ratio: 2.5, note: '...' }
```

CLI usage:

```bash
# Convert lossless with automatic pixel verification and size reporting
zap input.png -o output.webp --lossless
```

## What it does

### The Truth About Lossless

A widespread misconception among users and developers is that selecting "lossless" will somehow improve image quality, sharpen blurry details, or repair compression artifacts. 

**The truth is:**
- **Lossless is a pipeline guarantee, not a quality enhancement.** It guarantees that this specific conversion operation does not discard any pixel information ($0\text{ dB}$ generational loss).
- **Lossless preserves the input exactly as-is.** If the input is already blurry, noisy, or marred by 8×8 block artifacts from JPEG compression, lossless output will preserve those exact flaws byte-for-byte in pixel space.
- **Lossless images are often significantly larger.** A lossy encoder discards high-frequency noise and imperceptible color variations. A lossless encoder must preserve every variation. If the source contains compression noise, lossless must faithfully compress that noise, resulting in an output file that is often $2\times$ to $4\times$ larger than a lossy equivalent.

| What users think | What lossless actually does |
|---|---|
| "Lossless = highest quality" | Lossless = zero quality loss during *this* conversion step |
| "Lossless will fix my blurry image" | Lossless preserves the blurriness exactly as-is |
| "Lossless makes files cleaner" | Lossless preserves prior compression artifacts and noise |
| "Lossless is always the best choice" | Lossless is only optimal when the source is pristine and high fidelity is required |

### When to Use Lossless vs. Lossy

| Source Image | Recommended Mode | Target Format | Why |
|---|---|---|---|
| Vector graphics (SVG) | Lossless | WebP / PNG / AVIF | Crisp edges, text, and flat colors compress efficiently and stay sharp. |
| Icons, logos, UI assets | Lossless | WebP / PNG | High contrast and alpha transparency need pixel-perfect precision. |
| Pixel art & screenshots | Lossless | WebP / PNG | Distinct color boundaries look blurry or fringed with lossy encoding. |
| Photographic source (PNG) | Lossy (quality: 80–85) | AVIF / WebP | Millions of smooth gradients compress $60–80\%$ smaller with zero visible loss. |
| Existing JPEG image | Lossy (quality: 80–85) | WebP / AVIF | JPEG already lost information; lossless only inflates file size without benefit. |

### Pixel Identity Verification (`losslessVerified`)

When `lossless: true` is requested for alpha-capable targets (WebP, PNG, AVIF), `@zapwebp/core` performs an automated post-encoding pixel identity check:
1. The transformed source image RGBA pixel buffer is captured.
2. The encoded output buffer is decoded back into an uncompressed RGBA pixel buffer.
3. Every individual color channel ($R, G, B, A$) is compared across all coordinates.
4. If any pixel differs, the engine aborts and raises `E_LOSSLESS_MISMATCH`.
5. When verified successfully, `losslessVerified: true` is attached to the result.

### Degraded Source Detection (`sourceQuality`)

Zapwebp evaluates source assets before and during conversion:
- **`'high'`**: Vector graphics (SVG) and uncompressed/lossless PNG assets with high edge sharpness.
- **`'medium'`**: WebP or AVIF inputs that may have undergone prior lossy compression, or noisy PNGs.
- **`'low'`**: JPEG inputs (`.jpg`, `.jpeg`). Lossless conversion of JPEG inputs preserves compression block boundaries and produces advisory warnings across CLI, MCP, and Web UI.

### Size Impact Analysis (`sizeImpact`)

Every lossless conversion computes a mathematical comparison against the estimated lossy payload:
- `lossyEstimate`: Projected byte size if standard lossy compression were applied.
- `losslessActual`: Exact byte size of the lossless output.
- `ratio`: Payload multiplier (e.g. `2.5` means lossless is $2.5\times$ larger).
- `note`: Actionable advisory note explaining the size tradeoff.

## Errors

| Error Code | Cause | Fix |
|---|---|---|
| `E_LOSSLESS_MISMATCH` | Decoded output pixels differ from transformed input in lossless mode. | Ensure the target format supports full lossless encoding and no flattening background was applied. |
| `E_ALPHA_NOT_REPRESENTABLE` | Requested lossless conversion to JPEG format without providing a background. | JPEG cannot store transparency or lossless data. Switch target to WebP, PNG, or AVIF. |
| `E_INVALID_CONFIG` | Requested `lossless: true` with target `to: 'jpeg'`. | JPEG does not support lossless encoding. Remove `lossless` flag or choose WebP, PNG, or AVIF. |

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

- [Convert Documentation](/convert.md)
- [Formats Compatibility Matrix](/formats.md)
- [Clean Mode Metadata Stripping](/clean.md)
- [Core SDK Reference](/sdk/core.md)
- [Error Dictionary](/errors.md)
