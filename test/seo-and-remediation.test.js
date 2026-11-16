'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

test('SEO Landing Routes and Metadata Injection', async (t) => {
  const app = require('../server.js');
  const server = http.createServer(app).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const base = `http://127.0.0.1:${server.address().port}`;

  // 1. Root route has primary brand title and canonical
  const rootRes = await fetch(`${base}/`);
  assert.equal(rootRes.status, 200);
  const rootHtml = await rootRes.text();
  assert.match(rootHtml, /<title>Zapwebp Converter — Fast (&amp;|&) Free Online WebP (&amp;|&) Image Converter<\/title>/i);
  assert.match(rootHtml, /<link\s+rel="canonical"\s+href="https:\/\/zapwebp\.vercel\.app\/"/);
  assert.match(rootHtml, /Zapwebp Converter — Free WebP &amp; Image Converter/);
  assert.match(rootHtml, /Zap Webp Converter/);

  // 2. /png-to-webp has dedicated canonical and title
  const pngRes = await fetch(`${base}/png-to-webp`);
  assert.equal(pngRes.status, 200);
  const pngHtml = await pngRes.text();
  assert.match(pngHtml, /<title>PNG to WebP Converter — Fast, Free (&amp;|&) Transparency-Safe \| Zapwebp<\/title>/i);
  assert.match(pngHtml, /<link\s+rel="canonical"\s+href="https:\/\/zapwebp\.vercel\.app\/png-to-webp"/);
  assert.match(pngHtml, /<h1[^>]*>PNG to WebP Converter<\/h1>/);

  // 3. /svg-to-webp has dedicated canonical and title
  const svgRes = await fetch(`${base}/svg-to-webp`);
  assert.equal(svgRes.status, 200);
  const svgHtml = await svgRes.text();
  assert.match(svgHtml, /<title>SVG to WebP Converter — Crisp Vector to WebP \| Zapwebp<\/title>/i);
  assert.match(svgHtml, /<link\s+rel="canonical"\s+href="https:\/\/zapwebp\.vercel\.app\/svg-to-webp"/);

  // 4. Footer includes Online Converters column with internal links
  assert.match(rootHtml, /href="\/png-to-webp"/);
  assert.match(rootHtml, /href="\/svg-to-webp"/);
  assert.match(rootHtml, /href="\/jpg-to-webp"/);
  assert.match(rootHtml, /href="\/reports"/);
});

test('Remediation: ParallelMap NaN concurrency resilience', async () => {
  const { parallelMap } = require('@zapwebp/core');
  const items = [1, 2, 3, 4];
  const results = await parallelMap(items, Number.NaN, async (x) => x * 2);
  assert.deepEqual(results, [2, 4, 6, 8]);
});

test('Remediation: Crop 1px boundary logic (Finding 1.2)', () => {
  const cropCode = fs.readFileSync(path.join(__dirname, '../packages/crop/src/index.js'), 'utf8');
  assert.ok(cropCode.includes('rawW < 1 && rawW > 0'), 'Should check rawW < 1 && rawW > 0 for percentage');
  assert.ok(cropCode.includes('rawH < 1 && rawH > 0'), 'Should check rawH < 1 && rawH > 0 for percentage');
  assert.ok(!cropCode.includes('rawW <= 1 && rawW > 0'), 'Must not treat rawW = 1 as percentage');
});

test('Remediation: No mock functions in production @zapwebp/core exports', () => {
  const core = require('@zapwebp/core');
  assert.equal(core.createMockSvg, undefined, 'createMockSvg must not be exported on core root');
  assert.equal(core.createMockImage, undefined, 'createMockImage must not be exported on core root');
  assert.equal(core.testing, undefined, 'testing namespace must not be exported on core root');
});

test('Remediation: Agent.json schema compliance (no empty key)', () => {
  const sdkAgentPath = path.join(__dirname, '../packages/sdk/agent.json');
  const raw = fs.readFileSync(sdkAgentPath, 'utf8');
  const parsed = JSON.parse(raw);
  assert.ok(parsed.$schema, 'Must have $schema');
  assert.equal(parsed.name, '@zapwebp/sdk');
  assert.equal(parsed.type, 'sdk');
  assert.equal(parsed[''], undefined, 'Must not have empty string key');
});

test('Remediation: VS Code publisher is zapwebp', () => {
  const vsCodePkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../apps/vscode/package.json'), 'utf8'));
  assert.equal(vsCodePkg.publisher, 'zapwebp');
});
