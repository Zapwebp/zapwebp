'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convert, convertImage } = require('../src/index');

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#8dc63f"/></svg>';

test('Core Lifecycle: default options retain keepOriginal: true and cleanupDelay: immediate', async () => {
  const result = await convert(SAMPLE_SVG, { to: 'webp' });
  assert.ok(result.lifecycle);
  assert.equal(result.lifecycle.keepOriginal, true);
  assert.equal(result.lifecycle.originalDeleted, false);
  assert.equal(result.lifecycle.cleanupDelay, 'immediate');
});

test('Core Lifecycle: explicit keepOriginal: false and metadata propagates through convertImage', async () => {
  const result = await convertImage(SAMPLE_SVG, {
    to: 'webp',
    keepOriginal: false,
    inputPath: 'src/assets/icon.svg',
    backupPath: '.zapwebp/backups/tx1/icon.svg',
    cleanupDelay: 'session',
  });
  assert.ok(result.lifecycle);
  assert.equal(result.lifecycle.keepOriginal, false);
  assert.equal(result.lifecycle.originalDeleted, true);
  assert.equal(result.lifecycle.originalPath, 'src/assets/icon.svg');
  assert.equal(result.lifecycle.backupPath, '.zapwebp/backups/tx1/icon.svg');
  assert.equal(result.lifecycle.cleanupDelay, 'session');
});

