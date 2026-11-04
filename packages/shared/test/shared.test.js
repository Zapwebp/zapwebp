'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  APP_ORIGIN,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  supportedPairs,
  supportsAlpha,
  getMimeType,
  getCanonicalUrl,
  DEFAULT_OPTIONS,
  DEFAULT_PORT,
  MAX_DIMENSION,
  ERROR_CATALOG,
} = require('../src/index.js');

test('Shared: exports canonical origin and format definitions', () => {
  assert.equal(APP_ORIGIN, 'https://zapwebp.vercel.app');
  assert.ok(INPUT_FORMATS.includes('svg'));
  assert.ok(INPUT_FORMATS.includes('tiff'));
  assert.ok(OUTPUT_FORMATS.includes('webp'));
  assert.ok(OUTPUT_FORMATS.includes('avif'));
});

test('Shared: supportedPairs enumerates all distinct pairs', () => {
  assert.ok(supportedPairs.length > 20);
  const svgToWebp = supportedPairs.find((p) => p.slug === 'svg-to-webp');
  assert.ok(svgToWebp);
  assert.equal(svgToWebp.from, 'svg');
  assert.equal(svgToWebp.to, 'webp');

  // Verify no identity pairs (e.g. webp-to-webp)
  const identity = supportedPairs.find((p) => p.from === p.to);
  assert.equal(identity, undefined);
});

test('Shared: helper utilities return accurate types and URLs', () => {
  assert.equal(supportsAlpha('png'), true);
  assert.equal(supportsAlpha('jpeg'), false);
  assert.equal(getMimeType('webp'), 'image/webp');
  assert.equal(getMimeType('jpg'), 'image/jpeg');
  assert.equal(getCanonicalUrl('svg-to-webp'), 'https://zapwebp.vercel.app/svg-to-webp');
});

test('Shared: defaults and constants match expected boundaries', () => {
  assert.equal(DEFAULT_OPTIONS.quality, 85);
  assert.equal(DEFAULT_OPTIONS.baseWidth, 512);
  assert.equal(DEFAULT_OPTIONS.clean, true);
  assert.equal(DEFAULT_PORT, 3000);
  assert.equal(MAX_DIMENSION, 4096);
  assert.ok(ERROR_CATALOG.alpha_loss_forbidden);
});
