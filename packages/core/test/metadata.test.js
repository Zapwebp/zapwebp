'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateImageBytes,
  MetadataRegistry,
  metadataRegistry,
  cleanBytes,
  registerMetadataHandler,
} = require('../src');

test('Core: validateImageBytes rejects empty and corrupt files with ZapwebpError', () => {
  assert.throws(() => validateImageBytes(Buffer.alloc(0)), {
    name: 'ZapwebpError',
    code: 'E_EMPTY_FILE',
  });

  assert.throws(() => validateImageBytes(Buffer.from([0x01, 0x02, 0x03])), {
    name: 'ZapwebpError',
    code: 'E_CORRUPT_HEADER',
  });

  // Valid small SVG does not throw
  assert.doesNotThrow(() => validateImageBytes(Buffer.from('<svg></svg>')));
});

test('Core: MetadataRegistry registers handlers and performs clean pass', async () => {
  const registry = new MetadataRegistry();

  let strippedCalled = false;
  const mockHandler = {
    name: 'custom-ai',
    async inspect(bytes) {
      const str = Buffer.from(bytes).toString('utf8');
      if (str.includes('AI_TAG')) {
        return [{ type: 'Custom-AI', key: 'Generator', value: 'MockAI' }];
      }
      return [];
    },
    async strip(bytes) {
      strippedCalled = true;
      const str = Buffer.from(bytes).toString('utf8').replace('AI_TAG', '');
      return Buffer.from(str, 'utf8');
    },
  };

  registry.register(mockHandler);
  assert.equal(registry.getAll().length, 1);
  assert.ok(registry.getByName('custom-ai'));

  const input = Buffer.from('<svg><text>AI_TAG</text></svg>');
  const result = await registry.clean(input);

  assert.equal(strippedCalled, true);
  assert.equal(result.removed.length, 1);
  assert.equal(result.removed[0].type, 'Custom-AI');
  assert.ok(!result.output.toString('utf8').includes('AI_TAG'));
});

test('Core: MetadataRegistry clean throws E_CLEAN_FAILED if metadata survives strip', async () => {
  const registry = new MetadataRegistry();

  const buggyHandler = {
    name: 'buggy',
    async inspect(bytes) {
      const str = Buffer.from(bytes).toString('utf8');
      if (str.includes('SECRET')) return [{ type: 'LEAK', key: 'Secret', value: '123' }];
      return [];
    },
    async strip(bytes) {
      // Intentionally fails to remove SECRET
      return bytes;
    },
  };

  registry.register(buggyHandler);
  const input = Buffer.from('<svg><text>SECRET</text></svg>');

  await assert.rejects(
    () => registry.clean(input),
    {
      name: 'ZapwebpError',
      code: 'E_CLEAN_FAILED',
    }
  );
});
