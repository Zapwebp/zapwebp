'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  definePlugin,
  PluginManager,
  safeDecode,
  createMockRawImage,
  validateStorageWrite,
} = require('../src');

test('Plugin SDK: definePlugin validates shape and enforces immutability', () => {
  assert.throws(() => definePlugin(null), /must be an object/);
  assert.throws(() => definePlugin({ version: '1.0.0' }), /name/);
  assert.throws(() => definePlugin({ name: 'test' }), /version/);

  const plugin = definePlugin({
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
  });
  assert.equal(plugin.name, 'test-plugin');
  assert.equal(Object.isFrozen(plugin), true);
});

test('Plugin SDK: PluginManager executes lifecycle hooks and retrieves adapters', async () => {
  const manager = new PluginManager();
  const hookLog = [];

  const auditPlugin = definePlugin({
    name: 'audit-plugin',
    version: '1.0.0',
    hooks: {
      beforeConvert(ctx) {
        hookLog.push(`before:${ctx.input}`);
        return { modifiedByPlugin: true };
      },
      afterConvert(ctx, outputs) {
        hookLog.push(`after:${outputs.length}`);
        return outputs.map((out) => ({ ...out, audited: true }));
      },
    },
    adapters: {
      mockS3: {
        write(dest, data) {
          hookLog.push(`write:${dest}:${data.length}`);
        },
      },
    },
  });

  manager.use(auditPlugin);
  assert.equal(manager.has('audit-plugin'), true);
  assert.equal(manager.getPlugins().length, 1);
  assert.throws(() => manager.use(auditPlugin), /already registered/);

  // Execute beforeConvert
  const ctx = await manager.executeBeforeConvert({ input: 'icon.svg', options: { to: 'webp' } });
  assert.equal(ctx.modifiedByPlugin, true);

  // Execute afterConvert
  const outputs = await manager.executeAfterConvert(ctx, [{ format: 'webp', size: 100 }]);
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].audited, true);

  // Retrieve adapter
  const adapter = manager.getAdapter('mockS3');
  assert.ok(adapter);
  adapter.write('s3://bucket/test.webp', Buffer.from('hello'));

  assert.deepEqual(hookLog, [
    'before:icon.svg',
    'after:1',
    'write:s3://bucket/test.webp:5',
  ]);
});

test('Plugin SDK: exposes first-party storage adapters under ./storage subpath', () => {
  const storage = require('../src/storage');
  assert.equal(typeof storage.withZapwebp, 'function');
  assert.equal(typeof storage.supabaseAdapter, 'function');
  assert.equal(typeof storage.firebaseAdapter, 'function');
  assert.equal(typeof storage.neocitiesAdapter, 'function');
});

test('Plugin SDK: safeDecode, createMockRawImage, and validateStorageWrite work as expected', async () => {
  const mockImage = createMockRawImage(20, 20);
  assert.equal(mockImage.width, 20);
  assert.equal(mockImage.height, 20);
  assert.equal(mockImage.data.length, 20 * 20 * 4);

  const mockHandler = {
    name: 'test',
    async decode(bytes) {
      return mockImage;
    },
  };

  const decoded = await safeDecode(mockHandler, Buffer.from([0x01, 0x02]));
  assert.equal(decoded.width, 20);

  // Rejects empty input
  await assert.rejects(() => safeDecode(mockHandler, Buffer.alloc(0)), /E_EMPTY_FILE/);

  // validateStorageWrite
  assert.doesNotThrow(() => validateStorageWrite('images/icon.webp', Buffer.from([1, 2, 3])));
  assert.throws(() => validateStorageWrite('', Buffer.from([1])), /non-empty string/);
  assert.throws(() => validateStorageWrite('path.webp', Buffer.alloc(0)), /empty or null data/);
});


