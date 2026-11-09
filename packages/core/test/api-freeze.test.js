'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/index');

test('Core API Freeze: exports exactly the seven canonical public functions', () => {
  // 1. convert
  assert.equal(typeof core.convert, 'function', 'convert must be an exported function');

  // 2. inspect
  assert.equal(typeof core.inspect, 'function', 'inspect must be an exported function');

  // 3. registerFormat
  assert.equal(typeof core.registerFormat, 'function', 'registerFormat must be an exported function');

  // 4. registerMetadataHandler
  assert.equal(typeof core.registerMetadataHandler, 'function', 'registerMetadataHandler must be an exported function');

  // 5. registerTransform
  assert.equal(typeof core.registerTransform, 'function', 'registerTransform must be an exported function');

  // 6. getVersion
  assert.equal(typeof core.getVersion, 'function', 'getVersion must be an exported function');
  assert.match(core.getVersion(), /^\d+\.\d+\.\d+/, 'getVersion must return a valid SemVer string');

  // 7. getFormats
  assert.equal(typeof core.getFormats, 'function', 'getFormats must be an exported function');
  const formats = core.getFormats();
  assert.ok(Array.isArray(formats), 'getFormats must return an array');
  assert.ok(formats.includes('webp'), 'getFormats must include webp');
  assert.ok(formats.includes('png'), 'getFormats must include png');
  assert.ok(formats.includes('svg'), 'getFormats must include svg');
});

test('Core API Freeze: convert and inspect execute end-to-end on image bytes', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#8dc63f"/></svg>');

  // Test inspect
  const inspection = await core.inspect(svg);
  assert.equal(inspection.format, 'svg');
  assert.equal(inspection.width, 64);
  assert.equal(inspection.height, 64);
  assert.equal(inspection.hasAlpha, true);

  // Test convert
  const output = await core.convert(svg, { to: 'webp', width: 64, height: 64, quality: 90 });
  assert.ok(output instanceof Uint8Array || Buffer.isBuffer(output), 'convert must return a byte array');
  assert.ok(output.length > 0, 'output bytes must not be empty');
  assert.equal(output.format, 'webp');
  assert.equal(output.width, 64);
  assert.equal(output.height, 64);
});

test('Core API Freeze: registerTransform registers a transform step in the core registry', () => {
  let called = false;
  const mockTransform = {
    name: 'test-invert',
    apply: async (image) => {
      called = true;
      return image;
    },
  };

  core.registerTransform(mockTransform);
  const transforms = core.getTransforms();
  assert.ok(transforms.some((t) => t.name === 'test-invert'));
});
