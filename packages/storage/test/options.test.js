'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveOptions, DEFAULT_OPTIONS } = require('../src/options');

test('Storage options: resolveOptions applies standard defaults', () => {
  const resolved = resolveOptions();
  assert.deepEqual(resolved.scale, [1]);
  assert.equal(resolved.baseWidth, 512);
  assert.equal(resolved.quality, 85);
  assert.equal(resolved.lossless, false);
  assert.equal(resolved.clean, true);
  assert.equal(resolved.maxBytes, 5 * 1024 * 1024);
  assert.equal(resolved.keepOriginal, false);
  assert.equal(resolved.outPrefix, '');
  assert.equal(resolved.onConflict, 'skip');
  assert.equal(resolved.emitManifest, true);
  assert.equal(resolved.background, undefined);
});

test('Storage options: normalizes and validates custom options', () => {
  const resolved = resolveOptions({
    scale: [1, 2, 3],
    baseWidth: 256,
    quality: 90,
    lossless: true,
    clean: false,
    maxBytes: 10 * 1024 * 1024,
    keepOriginal: true,
    outPrefix: '/cdn/icons/',
    onConflict: 'overwrite',
    emitManifest: false,
    background: '#ffffff',
  });

  assert.deepEqual(resolved.scale, [1, 2, 3]);
  assert.equal(resolved.baseWidth, 256);
  assert.equal(resolved.quality, 90);
  assert.equal(resolved.lossless, true);
  assert.equal(resolved.clean, false);
  assert.equal(resolved.maxBytes, 10 * 1024 * 1024);
  assert.equal(resolved.keepOriginal, true);
  assert.equal(resolved.outPrefix, 'cdn/icons');
  assert.equal(resolved.onConflict, 'overwrite');
  assert.equal(resolved.emitManifest, false);
  assert.equal(resolved.background, '#ffffff');
});

test('Storage options: parse comma-separated string scales and deduplicates', () => {
  const resolved = resolveOptions({ scale: '3, 1, 2, 2' });
  assert.deepEqual(resolved.scale, [1, 2, 3]);
});

test('Storage options: rejects invalid scale multiplier', () => {
  assert.throws(() => resolveOptions({ scale: [0] }), /positive number/);
  assert.throws(() => resolveOptions({ scale: [-1, 2] }), /positive number/);
});

test('Storage options: rejects invalid baseWidth', () => {
  assert.throws(() => resolveOptions({ baseWidth: 0 }), /baseWidth/);
  assert.throws(() => resolveOptions({ baseWidth: 5000 }), /baseWidth/);
  assert.throws(() => resolveOptions({ baseWidth: 'not-a-number' }), /baseWidth/);
});

test('Storage options: rejects invalid quality', () => {
  assert.throws(() => resolveOptions({ quality: 0 }), /quality/);
  assert.throws(() => resolveOptions({ quality: 101 }), /quality/);
});

test('Storage options: rejects invalid maxBytes', () => {
  assert.throws(() => resolveOptions({ maxBytes: -10 }), /maxBytes/);
  assert.throws(() => resolveOptions({ maxBytes: 0 }), /maxBytes/);
});

test('Storage options: rejects invalid onConflict', () => {
  assert.throws(() => resolveOptions({ onConflict: 'invalid' }), /onConflict/);
});

test('Storage options: rejects invalid outPrefix type', () => {
  assert.throws(() => resolveOptions({ outPrefix: 1234 }), /outPrefix/);
});

test('Storage options: rejects non-object options', () => {
  assert.throws(() => resolveOptions('invalid'), /plain object/);
});
