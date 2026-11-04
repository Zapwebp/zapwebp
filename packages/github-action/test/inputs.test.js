'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseInputs, DEFAULT_GLOB } = require('../src/inputs');

test('parseInputs applies standard production defaults', () => {
  const inputs = parseInputs([]);
  assert.equal(inputs.glob, DEFAULT_GLOB);
  assert.equal(inputs.format, 'webp');
  assert.deepEqual(inputs.scale, [1]);
  assert.equal(inputs.baseWidth, 512);
  assert.equal(inputs.quality, 85);
  assert.equal(inputs.lossless, false);
  assert.equal(inputs.clean, true);
  assert.equal(inputs.outDir, '');
  assert.equal(inputs.mode, 'commit');
  assert.equal(inputs.commitMessage, 'chore: optimize images [zapwebp]');
});

test('parseInputs reads positional Docker arguments with format', () => {
  const args = [
    'src/**/*.{svg,png}',
    'avif',
    '1,2,3',
    '256',
    '90',
    'true',
    'false',
    'public/icons',
    'check',
    'custom commit message',
    'fake-token-123',
  ];

  const inputs = parseInputs(args);
  assert.equal(inputs.glob, 'src/**/*.{svg,png}');
  assert.equal(inputs.format, 'avif');
  assert.deepEqual(inputs.scale, [1, 2, 3]);
  assert.equal(inputs.baseWidth, 256);
  assert.equal(inputs.quality, 90);
  assert.equal(inputs.lossless, true);
  assert.equal(inputs.clean, false);
  assert.equal(inputs.outDir, 'public/icons');
  assert.equal(inputs.mode, 'check');
  assert.equal(inputs.commitMessage, 'custom commit message');
  assert.equal(inputs.token, 'fake-token-123');
});

test('parseInputs reads standard GitHub Actions INPUT_* env variables', () => {
  const env = {
    'INPUT_INPUT-GLOB': 'assets/**/*.{svg,png}',
    INPUT_FORMAT: 'png',
    INPUT_SCALE: '2, 1',
    'INPUT_BASE-WIDTH': '1024',
    INPUT_QUALITY: '95',
    INPUT_MODE: 'comment',
    INPUT_TOKEN: 'env-token-xyz',
  };

  const inputs = parseInputs([], env);
  assert.equal(inputs.glob, 'assets/**/*.{svg,png}');
  assert.equal(inputs.format, 'png');
  assert.deepEqual(inputs.scale, [1, 2]);
  assert.equal(inputs.baseWidth, 1024);
  assert.equal(inputs.quality, 95);
  assert.equal(inputs.mode, 'comment');
  assert.equal(inputs.token, 'env-token-xyz');
});

test('parseInputs rejects invalid inputs', () => {
  assert.throws(() => parseInputs(['', 'webp']), /non-empty string/);
  assert.throws(() => parseInputs(['**/*', 'invalid-format']), /Invalid target format/);
  assert.throws(() => parseInputs(['**/*', 'webp', '-1']), /between 0.1 and 10/);
  assert.throws(() => parseInputs(['**/*', 'webp', '1', '10']), /between 16 and 16384/);
  assert.throws(() => parseInputs(['**/*', 'webp', '1', '512', '120']), /between 1 and 100/);
  assert.throws(() => parseInputs(['**/*', 'webp', '1', '512', '85', 'false', 'true', '', 'invalid-mode']), /Must be 'commit', 'check', or 'comment'/);
});
