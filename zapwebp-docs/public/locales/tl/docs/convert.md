# Convert

Covers: pag-convert ng imahe sa web, daloy ng browser drag-and-drop, mga opsyon sa client-side, at mga format ng output.

Does not cover: mga operasyon sa command-line o integrasyon sa MCP. Tingnan ang [CLI](/cli) at [MCP](/mcp).

Applies to: Zapwebp web app v1.1.0 at mas bago.

## Quick start

```bash
open https://zapwebp.vercel.app/
```

I-drop ang SVG o raster na imahe sa dropzone upang agad mag-convert.

## What it does

Kino-convert ng web application ang mga imahe sa loob mismo ng browser window gamit ang in-memory na pagproseso. Pinoproseso ang mga file kapag hiniling nang walang intermediate disk caching, mga database, o pagsubaybay sa analytics, at awtomatikong pinapanatili ang aninag ng imahe.

## Options

| Kontrol | Uri | Default | Ano ang ginagawa nito |
|---|---|---|---|
| Dropzone | `file` | Walang laman | Tumatanggap ng isahan o maramihang mga imahe |
| Quality | `integer` | `85` | Antas ng compression mula 1 hanggang 100 |
| Width | `integer` | `2048` | Hangganan ng lapad ng raster (512, 1024, 2048, 4096) |
| Lossless | `boolean` | `false` | Pinapagana ang eksaktong pixel fidelity para sa WebP at AVIF |

## Examples

### Convert single SVG

```bash
$ curl -F "svg=@icon.svg" https://zapwebp.vercel.app/api/v1/convert -o icon.webp
✓ Napanatili ang aninag at na-save ang icon.webp
```

### Batch convert raster images

```bash
$ curl -F "files=@a.png" -F "files=@b.jpg" https://zapwebp.vercel.app/api/v1/batch -o bundle.zip
✓ Na-download ang bundle.zip na naglalaman ng mga na-convert na file
```

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `unsupported_format` | Hindi suportado ang format ng file sa browser canvas | Gumamit ng PNG, JPEG, WebP, AVIF, GIF, o SVG |
| `alpha_not_representable` | Pag-export sa JPEG habang may aninag ang imahe | Pumili ng WebP, PNG, o magtakda ng kulay ng background |
| `file_too_large` | Lumampas ang file sa limitasyon ng browser memory | I-resize ang imahe bago i-upload |

## For agents

```json
{
  "surface": "convert",
  "endpoint": "https://zapwebp.vercel.app/",
  "inputs": ["svg", "png", "jpeg", "webp", "avif", "gif", "tiff"],
  "outputs": ["webp", "png", "jpeg", "avif"],
  "browserOnly": true
}
```

## Related

- [Overview](/docs): Balangkas ng buong Zapwebp architecture.
- [Clean](/clean): Paano tinatanggal ang metadata sa web app bago i-export.
