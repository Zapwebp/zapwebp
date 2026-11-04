'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convertBuffer, convertScalesBuffer, ZapError } = require('../src/core');
const { decodeToRgba } = require('@zapwebp/core');

const TRANSPARENT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="25" y="25" width="50" height="50" fill="#00ff00"/>
</svg>
`.trim();

const UNSAFE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <script>alert("xss")</script>
  <rect width="100" height="100" fill="red"/>
</svg>
`.trim();

test('core.convertBuffer converts transparent SVG to WebP while strictly preserving alpha', async () => {
  const bytes = Buffer.from(TRANSPARENT_SVG, 'utf8');
  const webpBuffer = await convertBuffer(bytes, 'webp', 100, 85, true);

  assert.ok(Buffer.isBuffer(webpBuffer));
  assert.ok(webpBuffer.byteLength > 0);

  // Decode corner pixel to verify transparency preservation
  const { data, width, height } = await decodeToRgba(webpBuffer, 'webp');
  assert.equal(width, 100);
  assert.equal(height, 100);

  // Top-left pixel (0, 0) should be transparent (alpha = 0)
  const alphaCorner = data[3];
  assert.equal(alphaCorner, 0, 'Top-left corner pixel must have alpha === 0');

  // Center pixel (50, 50) should be opaque green
  const centerIdx = (50 * width + 50) * 4;
  assert.equal(data[centerIdx + 1], 255, 'Center green channel should be 255');
  assert.equal(data[centerIdx + 3], 255, 'Center alpha channel should be 255');
});

test('core.convertBuffer rejects unsafe SVG containing scripts with E_UNSAFE_SVG', async () => {
  const bytes = Buffer.from(UNSAFE_SVG, 'utf8');
  await assert.rejects(
    async () => {
      await convertBuffer(bytes, 'webp', 100, 85, true);
    },
    (err) => {
      assert.ok(err instanceof ZapError);
      assert.equal(err.code, 'E_UNSAFE_SVG');
      return true;
    }
  );
});

test('core.convertScalesBuffer generates @1x, @2x, and @3x WebP variants with correct dimensions', async () => {
  const bytes = Buffer.from(TRANSPARENT_SVG, 'utf8');
  const variants = await convertScalesBuffer(bytes, 'icon.svg', 100, 90, true);

  assert.equal(variants.length, 3);
  assert.equal(variants[0].filename, 'icon.webp');
  assert.equal(variants[0].scale, 1);
  assert.equal(variants[1].filename, 'icon@2x.webp');
  assert.equal(variants[1].scale, 2);
  assert.equal(variants[2].filename, 'icon@3x.webp');
  assert.equal(variants[2].scale, 3);

  const dec1x = await decodeToRgba(variants[0].data, 'webp');
  const dec2x = await decodeToRgba(variants[1].data, 'webp');
  const dec3x = await decodeToRgba(variants[2].data, 'webp');

  assert.equal(dec1x.width, 100);
  assert.equal(dec2x.width, 200);
  assert.equal(dec3x.width, 300);
});
