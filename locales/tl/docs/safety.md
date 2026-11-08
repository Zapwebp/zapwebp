# Safety

Covers: mga garantiyang panseguridad ng Zapwebp: pag-iwas sa XML External Entity (XXE) sa SVG, pagharang sa scripts, pagpigil sa SSRF, at proteksyon sa alpha channel.

Does not cover: pag-deploy ng web servers. Tingnan ang [Edge SDK](/sdk/edge).

Applies to: Zapwebp v1.1.0 at mas bago.

## Quick start

```bash
npx zapwebp malicious.svg
```

Awtomatikong sinusuri at hinaharang ang mga mapanganib na tag tulad ng `<script>` o `<foreignObject>`.

## What it does

Ang mga SVG file ay maaaring maglaman ng JavaScript, panlabas na mga link, at mga XML entity na maaaring magamit sa pag-atake. Sinusuri at nililinis ng Zapwebp ang mga SVG bago ito i-convert. Bukod dito, pinipigilan nito ang Server-Side Request Forgery (SSRF) sa pamamagitan ng pagharang sa mga private IP address kapag nagko-convert mula sa mga URL.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_UNSAFE_SVG` | Naglalaman ang SVG ng scripts o mapanganib na tags | Alisin ang mga script bago mag-convert |
| `E_SSRF_BLOCKED` | Tinangkang mag-access ng pribadong network o localhost URL | Magbigay ng pampublikong HTTPS URL |

## For agents

```json
{
  "safetyGates": ["xxeDefense", "scriptStripping", "ssrfBlocker", "alphaAssertion"],
  "default": "strict"
}
```

## Related

- [Clean](/clean): Pagtanggal ng sensitibong metadata.
- [Errors](/errors): Mga structured error code at remedyo.
