# @zapwebp/plugin-sdk Reference

Covers: The official plugin architecture, lifecycle hooks, and adapters for building Zapwebp integrations.
Does not cover: Low-level WASM compilation or binary bindings.
Applies to: `@zapwebp/plugin-sdk` v1.0.0+.

## Quick start

```typescript
import { definePlugin, PluginManager } from '@zapwebp/plugin-sdk';

const myPlugin = definePlugin({
  name: 'my-custom-plugin',
  version: '1.0.0',
  hooks: {
    async onBeforeConvert(context) {
      console.log('Converting image:', context.filename);
    },
  },
});
```

## What it does

`@zapwebp/plugin-sdk` provides an extensible, immutable plugin runtime. It allows bundlers, storage providers, CMS platforms, and custom workflow scripts to hook into pre-conversion analysis, post-conversion optimization, and manifest generation without modifying the core engine.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Unique name of the plugin |
| `version` | `string` | required | Semantic version string |
| `hooks` | `object` | `{}` | Lifecycle hooks (`onBeforeConvert`, `onAfterConvert`, `onError`) |
| `adapters` | `object` | `{}` | Storage or decoder adapters registered by this plugin |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_INVALID_PLUGIN` | Plugin definition fails shape validation | Ensure required fields `name` and `version` are provided |
| `E_HOOK_FAILED` | Lifecycle hook threw an uncaught error | Inspect hook execution logs and catch asynchronous rejections |
| `E_ADAPTER_CONFLICT` | Multiple plugins register the same adapter identifier | Namespace adapter IDs or disable conflicting plugin |

## For agents

```json
{
  "tool": "@zapwebp/plugin-sdk",
  "function": "definePlugin",
  "input": "PluginDefinition",
  "output": "ZapwebpPlugin",
  "schema": {
    "name": { "type": "string" },
    "version": { "type": "string" },
    "hooks": {
      "type": "object",
      "properties": {
        "onBeforeConvert": { "type": "function" },
        "onAfterConvert": { "type": "function" },
        "onError": { "type": "function" }
      }
    }
  }
}
```

## Related

- [Core SDK](/sdk/core): Engine specification and direct conversion methods.
- [Vite Plugin](/plugins/vite): First-party Vite integration using this SDK.
