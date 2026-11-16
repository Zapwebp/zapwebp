<p align="center">
  <img src="../../public/assets/packages-readme-icons/zapwebp-plugin-sdk.svg" width="120" height="120" alt="@zapwebp/plugin-sdk logo" />
</p>

# @zapwebp/plugin-sdk

Plugin SDK and lifecycle contracts for extending Zap conversion workflows, adapters, and asset pipelines. Enables developers ("Zap Devs") to hook into before/after conversion events, create custom storage adapters (S3, Cloudflare R2, memory), and build framework integrations (Next.js, Vite, Astro).

Covers: Plugin lifecycle hooks (`beforeConvert`, `afterConvert`), `PluginManager` orchestration, custom storage adapter interfaces (`StorageAdapter`), and `definePlugin` contracts.

Does not cover: Low-level rasterization codecs, HTTP network endpoints, or terminal CLI command routing.

Applies to: `@zapwebp/plugin-sdk` v1.0.0 and later, Node.js >=22.0.0, TypeScript >=5.0.0.

Documentation: [https://zapwebp.vercel.app/docs](https://zapwebp.vercel.app/docs)

---

## Quick start

```bash
pnpm add @zapwebp/plugin-sdk
```

```typescript
import { definePlugin, PluginManager } from '@zapwebp/plugin-sdk';

export const loggerPlugin = definePlugin({
  name: 'zap-plugin-logger',
  version: '1.0.0',
  hooks: {
    beforeConvert(ctx) {
      console.log('Converting image with options:', ctx.options);
    },
    afterConvert(ctx, outputs) {
      console.log(`Generated ${outputs.length} outputs`);
    },
  },
});
```

## What it does

`@zapwebp/plugin-sdk` provides an extensible, contract-based lifecycle system for building plugins and custom storage adapters:
- **Lifecycle Event Hooks:** Intercept and modify options in `beforeConvert` and process generated buffers in `afterConvert`.
- **Pluggable Storage Adapters:** Standardized `StorageAdapter` interface (`write`, `read`, `delete`, `exists`) for cloud and custom file backends.
- **Contract Immutability:** Enforces strict shape validation and immutability via `definePlugin()`.
- **Zero Overhead:** Plugin manager executes hooks with minimal latency and preserves core in-memory guarantees.

---

## Installation

```bash
pnpm add @zapwebp/plugin-sdk
```

---

## Creating a Plugin

Use `definePlugin()` to author a type-safe plugin:

```typescript
import { definePlugin } from '@zapwebp/plugin-sdk';

export const myVitePlugin = definePlugin({
  name: 'zap-plugin-vite',
  version: '1.0.0',
  description: 'Vite asset transform plugin for Zap',
  hooks: {
    beforeConvert(ctx) {
      console.log('Converting image with options:', ctx.options);
      // Optionally mutate or normalize options before conversion
    },
    afterConvert(ctx, outputs) {
      console.log(`Generated ${outputs.length} asset outputs`);
      // Perform post-processing, logging, or watermarking
    },
  },
  adapters: {
    memory: {
      async write(dest, data) {
        // Custom storage write logic
        return { path: dest, bytes: data.length };
      },
      async read(src) {
        // Custom storage read logic
        return Buffer.from('');
      },
      async delete(src) {
        return true;
      },
      async exists(src) {
        return true;
      },
    },
  },
});
```

---

## Using Plugins with the Plugin Manager

```typescript
import { PluginManager } from '@zapwebp/plugin-sdk';
import { myVitePlugin } from './my-vite-plugin';

const manager = new PluginManager();

// Register the plugin
manager.register(myVitePlugin);

// Execute lifecycle hooks
const context = { input: 'logo.svg', options: { to: 'webp' } };
await manager.executeBeforeConvert(context);

// Run core conversion...
const outputs = [{ format: 'webp', data: Buffer.from([]) }];

// Execute post-conversion hooks
await manager.executeAfterConvert(context, outputs);

// Retrieve custom storage adapter
const memoryAdapter = manager.getStorageAdapter('memory');
```

---

## Security, Capability Sandboxing & Permissions

Zapwebp enforces a zero-trust execution model for all third-party and community plugins:

> **Core Rule for Plugin Authors:**
> "Your plugin receives bytes, and returns bytes. It does not need file system access. If it requires network access, declare it in `zapwebp.permissions`."

### Execution Boundaries
1. **No Filesystem Access:** Plugins receive in-memory `Uint8Array` / `Buffer` data or uncompressed RGBA pixel buffers (`RawImage`). Direct imports of `node:fs` or `node:child_process` are blocked and immediately reject with `E_PLUGIN_SANDBOX_VIOLATION`.
2. **Offline by Default:** Format handlers, metadata handlers, and pixel transforms operate completely offline. Global `fetch()` and `node:net` / `node:http` are blocked.
3. **Storage Adapters & Network Permissions:** If your plugin is a remote storage adapter (e.g., uploading to S3 or a custom API), declare network permissions in your `package.json`:
   ```json
   {
     "name": "zapwebp-storage-custom",
     "version": "1.0.0",
     "zapwebp": {
       "permissions": ["network"]
     }
   }
   ```
   The runner will prompt the user for consent before loading the plugin.
4. **Actionable Errors:** When a sandbox boundary is violated, Zapwebp throws `E_PLUGIN_SANDBOX_VIOLATION` with actionable guidance:
   - What restricted resource was requested
   - How to refactor to pure byte buffers
   - Direct link to the troubleshooting documentation: [https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation](https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation)

---

## Plugin Contract Specification

```typescript
export interface ZapPlugin {
  name: string;
  version: string;
  description?: string;
  hooks?: {
    beforeConvert?: (context: ConvertContext) => void | Promise<void>;
    afterConvert?: (context: ConvertContext, outputs: OutputAsset[]) => void | Promise<void>;
  };
  adapters?: Record<string, StorageAdapter>;
}

export interface StorageAdapter {
  write(destination: string, data: Buffer): Promise<{ path: string; bytes: number }>;
  read(source: string): Promise<Buffer>;
  delete(source: string): Promise<boolean>;
  exists(source: string): Promise<boolean>;
}
```

---

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_PLUGIN_SANDBOX_VIOLATION` | Plugin attempted unauthorized filesystem or network I/O | Declare permissions in `package.json` or operate on pure in-memory buffers |
| `E_INVALID_PLUGIN_SHAPE` | Plugin missing required `name` or `version` | Ensure `definePlugin` receives valid manifest |
| `E_HOOK_EXECUTION_FAILED` | Uncaught exception in `beforeConvert` or `afterConvert` | Wrap lifecycle hook logic in error handling |

---

## For agents

```json
{
  "tool": "@zapwebp/plugin-sdk",
  "classes": ["PluginManager"],
  "functions": ["definePlugin"],
  "interfaces": ["ZapPlugin", "StorageAdapter", "ConvertContext", "OutputAsset"],
  "hooks": ["beforeConvert", "afterConvert"]
}
```

---

## Related

- [Plugin SDK Documentation](https://zapwebp-docs.vercel.app/sdk/plugin): In-depth guide to authoring plugins.
- [Custom Storage Adapters](https://zapwebp-docs.vercel.app/storage/supabase): Cloud storage adapter guide.
- [Scaffolding Guide](https://zapwebp-docs.vercel.app/scaffolding): Generating new plugins with `create-zapwebp`.

---

## License

MIT © [Zapwebp](https://zapwebp.vercel.app/)
