# @zapwebp/plugin-sdk Reference

Covers: standardized framework para sa pagbuo ng una at third-party na Zapwebp plugins, lifecycle hooks, at testing mocks.

Does not cover: end-user conversion commands.

Applies to: `@zapwebp/plugin-sdk` v1.0.0 at mas bago.

## Quick start

```javascript
import { definePlugin } from '@zapwebp/plugin-sdk';

export default definePlugin({
  name: 'my-custom-plugin',
  version: '1.0.0',
  hooks: {
    async transform(image) {
      return image;
    }
  }
});
```

## What it does

Nagbibigay ang `@zapwebp/plugin-sdk` ng mga contract, type definitions, at helper functions para sa paglikha ng mga plugin na maaaring magbago ng mga imahe, magdagdag ng suporta sa bagong format, o mag-upload sa mga bagong cloud storage bucket.

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_HOOK_FAILED` | Nabigo ang execution ng isang plugin lifecycle hook | Suriin ang logic sa loob ng hook handler |

## For agents

```json
{
  "package": "@zapwebp/plugin-sdk",
  "hooks": ["beforeConvert", "transform", "afterConvert", "beforeUpload"],
  "testing": "createMockRawImage"
}
```

## Related

- [Crop Plugin](/plugins/crop): Halimbawa ng tunay na transform plugin.
- [Storage Adapters](/plugins/storage): Halimbawa ng storage plugin integration.
