'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveConfig } = require('../src/config');

test('resolveConfig applies standard production defaults', () => {
  const config = resolveConfig();
  assert.deepEqual(config.scale, [1]);
  assert.equal(config.baseWidth, 512);
  assert.equal(config.quality, 85);
  assert.equal(config.lossless, false);
  assert.equal(config.clean, true);
  assert.deepEqual(config.sourceDirs, ['public', 'src/assets', 'app']);
  assert.equal(config.outDir, 'public/icons');
  assert.equal(config.emitManifest, true);
  assert.equal(config.respectNextImage, true);
  assert.equal(config.onConflict, 'overwrite');
});

test('resolveConfig sorts and deduplicates multipliers', () => {
  const config = resolveConfig({ scale: [3, 1, 2, 2, 1] });
  assert.deepEqual(config.scale, [1, 2, 3]);
});

test('resolveConfig accepts valid custom options', () => {
  const config = resolveConfig({
    scale: [1, 2],
    baseWidth: 1024,
    quality: 90,
    lossless: true,
    clean: false,
    sourceDirs: ['assets', 'components'],
    outDir: 'public/custom',
    respectNextImage: false,
    onConflict: 'skip',
  });

  assert.deepEqual(config.scale, [1, 2]);
  assert.equal(config.baseWidth, 1024);
  assert.equal(config.quality, 90);
  assert.equal(config.lossless, true);
  assert.equal(config.clean, false);
  assert.deepEqual(config.sourceDirs, ['assets', 'components']);
  assert.equal(config.outDir, 'public/custom');
  assert.equal(config.respectNextImage, false);
  assert.equal(config.onConflict, 'skip');
});

test('resolveConfig rejects invalid scales', () => {
  assert.throws(() => resolveConfig({ scale: [] }), /non-empty array/);
  assert.throws(() => resolveConfig({ scale: [-1] }), /positive numbers/);
  assert.throws(() => resolveConfig({ scale: ['invalid'] }), /positive numbers/);
});

test('resolveConfig rejects invalid quality', () => {
  assert.throws(() => resolveConfig({ quality: 0 }), /between 1 and 100/);
  assert.throws(() => resolveConfig({ quality: 105 }), /between 1 and 100/);
});

test('resolveConfig rejects invalid sourceDirs', () => {
  assert.throws(() => resolveConfig({ sourceDirs: 'invalid' }), /array of non-empty directory/);
  assert.throws(() => resolveConfig({ sourceDirs: [''] }), /array of non-empty directory/);
});

test('resolveConfig rejects invalid conflict option', () => {
  assert.throws(() => resolveConfig({ onConflict: 'invalid' }), /one of: 'overwrite', 'skip', 'error'/);
});

