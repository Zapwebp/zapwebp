'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  convert,
  convertImage,
  evaluateSourceQuality,
  evaluateSizeImpact,
  verifyLosslessPixels,
} = require('../src');

const transparentSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#2563eb"/></svg>',
  'utf8'
);

test('Pristine SVG lossless conversion verifies pixel identity and attaches metrics', async () => {
  const result = await convert(transparentSvg, {
    to: 'webp',
    lossless: true,
  });

  assert.equal(result.lossless, true);
  assert.equal(result.losslessVerified, true);
  assert.equal(result.sourceQuality.estimated, 'high');
  assert.ok(result.sourceQuality.reason.includes('Vector (SVG)'));
  assert.ok(result.sizeImpact);
  assert.equal(typeof result.sizeImpact.lossyEstimate, 'number');
  assert.equal(typeof result.sizeImpact.losslessActual, 'number');
  assert.equal(typeof result.sizeImpact.ratio, 'number');
  assert.ok(result.sizeImpact.note);
});

test('Pristine PNG lossless conversion verifies pixel identity and confirms source quality', async () => {
  const pngBuffer = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 },
    },
  }).png().toBuffer();

  const result = await convert(pngBuffer, {
    to: 'webp',
    lossless: true,
  });

  assert.equal(result.lossless, true);
  assert.equal(result.losslessVerified, true);
  assert.equal(result.sourceQuality.estimated, 'high');
  assert.ok(result.sourceQuality.reason.includes('PNG input'));
  assert.equal(result.warnings.length, 0);
});

test('Degraded JPEG source emits warning and marks sourceQuality as low in lossless mode', async () => {
  const jpegBuffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  }).jpeg({ quality: 60 }).toBuffer();

  const result = await convertImage(jpegBuffer, {
    to: 'webp',
    lossless: true,
  });

  assert.equal(result.lossless, true);
  assert.equal(result.losslessVerified, true);
  assert.equal(result.sourceQuality.estimated, 'low');
  assert.ok(result.sourceQuality.reason.includes('Input is JPEG (already lossy)'));
  assert.ok(
    result.warnings.some((w) =>
      w.includes('Lossless conversion of a JPEG source preserves existing compression artifacts')
    ),
    'Must emit advisory warning for JPEG lossless'
  );
  assert.equal(typeof result.sizeImpact.ratio, 'number');
  assert.ok(result.sizeImpact.ratio > 0);
  assert.ok(result.sizeImpact.note.includes('Switch to lossy') || result.sizeImpact.note.includes('not recommended for JPEG'));
});

test('Rejects lossless flag when targeting JPEG output format', async () => {
  const pngBuffer = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 },
    },
  }).png().toBuffer();

  await assert.rejects(
    convertImage(pngBuffer, { to: 'jpeg', lossless: true }),
    (err) => {
      assert.equal(err.code, 'E_INVALID_CONFIG');
      assert.ok(err.message.includes('JPEG output does not support lossless encoding'));
      return true;
    }
  );
});

test('Pixel verification engine detects tampered or mismatched output pixels', async () => {
  const img1 = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 4,
      background: { r: 50, g: 100, b: 150, alpha: 1 },
    },
  }).png().toBuffer();

  const img2Identical = await sharp(img1).webp({ lossless: true }).toBuffer();
  const isMatch = await verifyLosslessPixels(img1, img2Identical, 'png', 'webp', () => sharp);
  assert.equal(isMatch, true, 'Identical lossless WebP should verify successfully');

  // Create an intentionally altered output image
  const img3Altered = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 4,
      background: { r: 99, g: 99, b: 99, alpha: 1 },
    },
  }).png().toBuffer();

  const isMismatch = await verifyLosslessPixels(img1, img3Altered, 'png', 'png', () => sharp);
  assert.equal(isMismatch, false, 'Altered image pixels should fail verification');
});

test('evaluateSourceQuality categorizes assets with rigorous criteria', () => {
  assert.equal(evaluateSourceQuality('svg', Buffer.from('<svg></svg>')).estimated, 'high');
  assert.equal(evaluateSourceQuality('png', Buffer.from([0x89, 0x50])).estimated, 'high');
  assert.equal(evaluateSourceQuality('jpeg', Buffer.from([0xff, 0xd8])).estimated, 'low');
  assert.equal(evaluateSourceQuality('jpg', Buffer.from([0xff, 0xd8])).estimated, 'low');
  assert.equal(evaluateSourceQuality('webp', Buffer.from('RIFF')).estimated, 'medium');
  assert.equal(evaluateSourceQuality('avif', Buffer.from([0x00, 0x00])).estimated, 'medium');
});

test('evaluateSizeImpact provides mathematical ratio and actionable notes', () => {
  // 1. Lossy mode
  const lossyImpact = evaluateSizeImpact(10000, 20000, 'png', 'webp', false);
  assert.equal(lossyImpact.ratio, 1.0);
  assert.equal(lossyImpact.lossyEstimate, 10000);
  assert.ok(lossyImpact.note.includes('Lossy compression applied'));

  // 2. Lossless mode on JPEG
  const jpegLosslessImpact = evaluateSizeImpact(35000, 20000, 'jpeg', 'webp', true);
  assert.ok(jpegLosslessImpact.ratio >= 1.0);
  assert.ok(jpegLosslessImpact.note.includes('Switch to lossy'));

  // 3. Lossless mode on PNG
  const pngLosslessImpact = evaluateSizeImpact(50000, 45000, 'png', 'webp', true);
  assert.equal(typeof pngLosslessImpact.ratio, 'number');
  assert.ok(pngLosslessImpact.note.length > 0);
});
