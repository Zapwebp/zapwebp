'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { loadConfig, deepMerge, DEFAULT_CONFIG } = require('../src/config');

test('Config: deepMerge correctly merges nested objects without clobbering', () => {
  const target = { a: 1, nested: { b: 2, c: 3 } };
  const source = { nested: { c: 4, d: 5 }, e: 6 };
  const res = deepMerge(target, source);

  assert.equal(res.a, 1);
  assert.equal(res.nested.b, 2);
  assert.equal(res.nested.c, 4);
  assert.equal(res.nested.d, 5);
  assert.equal(res.e, 6);
});

test('Config: loadConfig returns sane defaults when no file is present', () => {
  const conf = loadConfig(null, {}, os.tmpdir());
  assert.equal(conf.title, 'Documentation');
  assert.equal(conf.output.html, true);
  assert.equal(conf.output.markdown, true);
  assert.equal(conf.output.llmsTxt, true);
  assert.equal(conf.output.sitemap, true);
  assert.equal(conf.output.robots, true);
  assert.equal(conf.output.agentJson, true);
  assert.ok(path.isAbsolute(conf.content.resolvedDir));
  assert.ok(path.isAbsolute(conf.output.resolvedDir));
});

test('Config: loadConfig loads and normalizes JSON configuration file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-docs-config-'));
  const configPath = path.join(tmpDir, 'docs.config.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      title: 'Custom Title',
      url: 'https://docs.example.com/',
      content: { dir: 'my-content' },
      output: { dir: 'my-dist' },
    }),
    'utf8'
  );

  const conf = loadConfig(configPath, {}, tmpDir);
  assert.equal(conf.title, 'Custom Title');
  assert.equal(conf.url, 'https://docs.example.com'); // trailing slash stripped
  assert.equal(conf.content.resolvedDir, path.join(tmpDir, 'my-content'));
  assert.equal(conf.output.resolvedDir, path.join(tmpDir, 'my-dist'));
});
