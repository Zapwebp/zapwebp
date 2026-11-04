'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { convertSvgAsset } = require('../src/convert');
const { resolveConfig } = require('../src/config');

const VALID_TRANSPARENT_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#8dc63f" />
</svg>
`.trim();

const UNSAFE_XSS_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <script>alert("xss")</script>
  <circle cx="50" cy="50" r="40" fill="#8dc63f" />
</svg>
`.trim();

test('convertSvgAsset converts transparent SVG to WebP with multipliers', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-vite-test-'));
  const svgPath = path.join(tmpDir, 'icon.svg');
  fs.writeFileSync(svgPath, VALID_TRANSPARENT_SVG, 'utf8');

  const config = resolveConfig({
    scale: [1, 2],
    baseWidth: 200,
  });

  const outputs = await convertSvgAsset(svgPath, config);
  assert.equal(outputs.length, 2);

  // 1x output
  const out1x = outputs.find((o) => o.scale === 1);
  assert.ok(out1x);
  assert.equal(out1x.name, 'icon.webp');
  assert.equal(out1x.width, 200);
  assert.equal(out1x.alphaPreserved, true);
  assert.ok(out1x.data.length > 0);

  // 2x output
  const out2x = outputs.find((o) => o.scale === 2);
  assert.ok(out2x);
  assert.equal(out2x.name, 'icon@2x.webp');
  assert.equal(out2x.width, 400);
  assert.equal(out2x.alphaPreserved, true);

  // Source SVG file is strictly immutable
  const sourceAfter = fs.readFileSync(svgPath, 'utf8');
  assert.equal(sourceAfter, VALID_TRANSPARENT_SVG);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convertSvgAsset fails loudly on unsafe SVG containing active script content', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-vite-test-'));
  const svgPath = path.join(tmpDir, 'malicious.svg');
  fs.writeFileSync(svgPath, UNSAFE_XSS_SVG, 'utf8');

  const config = resolveConfig();

  await assert.rejects(
    async () => {
      await convertSvgAsset(svgPath, config);
    },
    (err) => {
      assert.match(err.message, /SVG security validation failed/);
      return true;
    }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

