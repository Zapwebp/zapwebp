'use strict';

require('./mock-vscode');
const test = require('node:test');
const assert = require('node:assert/strict');
const { readConfig } = require('../src/config');

test('config.readConfig applies default values when settings are omitted', () => {
  const mockConfig = {
    get: (key, defaultValue) => defaultValue,
  };

  const cfg = readConfig(mockConfig);
  assert.equal(cfg.convertOnSave, false);
  assert.equal(cfg.baseWidth, 512);
  assert.equal(cfg.quality, 85);
  assert.equal(cfg.clean, true);
  assert.equal(cfg.outputExtension, 'webp');
});

test('config.readConfig validates boundaries and sanitizes invalid values', () => {
  const store = {
    convertOnSave: true,
    baseWidth: -100, // Invalid -> should fallback to 512
    quality: 150, // Invalid -> should fallback to 85
    clean: false,
    outputExtension: 'unsupported-format', // Invalid -> should fallback to 'webp'
  };

  const mockConfig = {
    get: (key, defaultValue) => (key in store ? store[key] : defaultValue),
  };

  const cfg = readConfig(mockConfig);
  assert.equal(cfg.convertOnSave, true);
  assert.equal(cfg.baseWidth, 512);
  assert.equal(cfg.quality, 85);
  assert.equal(cfg.clean, false);
  assert.equal(cfg.outputExtension, 'webp');
});

test('config.readConfig accepts valid configured values', () => {
  const store = {
    convertOnSave: true,
    baseWidth: 1024,
    quality: 92,
    clean: true,
    outputExtension: 'avif',
  };

  const mockConfig = {
    get: (key, defaultValue) => (key in store ? store[key] : defaultValue),
  };

  const cfg = readConfig(mockConfig);
  assert.equal(cfg.convertOnSave, true);
  assert.equal(cfg.baseWidth, 1024);
  assert.equal(cfg.quality, 92);
  assert.equal(cfg.clean, true);
  assert.equal(cfg.outputExtension, 'avif');
});
