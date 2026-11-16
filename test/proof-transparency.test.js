'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convertImage, decodeToRgba } = require('@zapwebp/core');

const TRANSPARENT_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
    '<circle cx="32" cy="32" r="16" fill="#3b82f6"/>' +
  '</svg>'
);

test('Proof 1: Transparency Preservation - Output pixel (0,0) retains alpha transparency', async () => {
  // 1. Convert SVG to WebP
  const resWebp = await convertImage(TRANSPARENT_SVG, { to: 'webp' });
  assert.equal(resWebp.alphaPreserved, true, 'WebP result must report alphaPreserved: true');

  // Decode raw RGBA pixels and inspect origin (0,0)
  const webpDecoded = await decodeToRgba(resWebp.data);
  assert.equal(webpDecoded.data.length, webpDecoded.width * webpDecoded.height * 4, 'WebP buffer must be 4 channels (RGBA)');
  
  // Pixel at (0,0): channel 3 is Alpha
  const webpAlphaAtOrigin = webpDecoded.data[3];
  assert.equal(webpAlphaAtOrigin, 0, `Pixel at (0,0) in WebP must be fully transparent (alpha=0), got ${webpAlphaAtOrigin}`);

  // 2. Convert SVG to PNG
  const resPng = await convertImage(TRANSPARENT_SVG, { to: 'png' });
  assert.equal(resPng.alphaPreserved, true, 'PNG result must report alphaPreserved: true');
  const pngDecoded = await decodeToRgba(resPng.data);
  assert.equal(pngDecoded.data.length, pngDecoded.width * pngDecoded.height * 4, 'PNG buffer must be 4 channels (RGBA)');
  assert.equal(pngDecoded.data[3], 0, `Pixel at (0,0) in PNG must be fully transparent (alpha=0), got ${pngDecoded.data[3]}`);

  // 3. Convert SVG to AVIF
  const resAvif = await convertImage(TRANSPARENT_SVG, { to: 'avif' });
  assert.equal(resAvif.alphaPreserved, true, 'AVIF result must report alphaPreserved: true');
  const avifDecoded = await decodeToRgba(resAvif.data);
  assert.equal(avifDecoded.data.length, avifDecoded.width * avifDecoded.height * 4, 'AVIF buffer must be 4 channels (RGBA)');
  assert.equal(avifDecoded.data[3], 0, `Pixel at (0,0) in AVIF must be fully transparent (alpha=0), got ${avifDecoded.data[3]}`);

  // 4. Converting transparent input to JPEG without background MUST fail loudly with E_ALPHA_NOT_REPRESENTABLE
  await assert.rejects(
    async () => {
      await convertImage(TRANSPARENT_SVG, { to: 'jpeg' });
    },
    (err) => {
      assert.equal(err.code, 'E_ALPHA_NOT_REPRESENTABLE');
      return true;
    },
    'Converting transparent SVG to JPEG without explicit background must reject with E_ALPHA_NOT_REPRESENTABLE'
  );
});
