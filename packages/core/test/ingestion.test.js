'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { convertImage } = require('../src/index');

test('Smart Ingestion: same-format pass-through when input matches target and within bounds', async () => {
  // Create a 100x100 WebP image
  const webpBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 100, g: 150, b: 200, alpha: 0.8 },
    },
  }).webp({ quality: 80 }).toBuffer();

  const res = await convertImage(webpBuffer, {
    to: 'webp',
    sameFormat: 'passthrough',
  });

  assert.equal(res.passedThrough, true);
  assert.equal(res.ingestion.stage, 'passthrough');
  assert.equal(res.ingestion.action, 'same_format_passthrough');
  assert.equal(res.format, 'webp');
  assert.equal(res.width, 100);
  assert.equal(res.height, 100);
  assert.equal(res.size, webpBuffer.length);
  assert.equal(res.data.equals(webpBuffer), true);
  assert.equal(res.alphaPreserved, true);
});

test('Smart Ingestion: same-format rejection when policy specifies reject', async () => {
  const webpBuffer = await sharp({
    create: {
      width: 50,
      height: 50,
      channels: 4,
      background: { r: 50, g: 50, b: 50, alpha: 1 },
    },
  }).webp().toBuffer();

  await assert.rejects(
    async () => {
      await convertImage(webpBuffer, {
        to: 'webp',
        sameFormat: 'reject',
      });
    },
    (err) => {
      assert.equal(err.code, 'E_SAME_FORMAT_REJECTED');
      assert.match(err.message, /matches target lock format/);
      return true;
    }
  );
});

test('Smart Ingestion: same-format re-encoding when policy specifies reencode', async () => {
  const pngBuffer = await sharp({
    create: {
      width: 80,
      height: 80,
      channels: 4,
      background: { r: 255, g: 120, b: 0, alpha: 1 },
    },
  }).png().toBuffer();

  const res = await convertImage(pngBuffer, {
    to: 'png',
    sameFormat: 'reencode',
  });

  assert.equal(res.passedThrough, undefined);
  assert.equal(res.ingestion.stage, 'converted');
  assert.equal(res.ingestion.action, 'same_format_reencoded');
  assert.equal(res.format, 'png');
  assert.equal(res.width, 80);
});

test('Smart Ingestion Size Bounds: minInputBytes rejects undersized inputs', async () => {
  const tinyBuffer = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).jpeg({ quality: 20 }).toBuffer();

  await assert.rejects(
    async () => {
      await convertImage(tinyBuffer, {
        to: 'webp',
        policy: {
          limits: {
            minInputBytes: 50000, // 50 KB minimum
          },
        },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_INPUT_TOO_SMALL');
      assert.match(err.message, /minimum required is 50000 bytes/i);
      return true;
    }
  );
});

test('Smart Ingestion Size Bounds: maxOutputBytes with binary search compression', async () => {
  // Create a high-detail noisy image that compresses larger
  const noisePixels = Buffer.alloc(300 * 300 * 3);
  for (let i = 0; i < noisePixels.length; i++) {
    noisePixels[i] = (i * 37) % 256;
  }
  const imgBuffer = await sharp(noisePixels, {
    raw: { width: 300, height: 300, channels: 3 },
  }).png().toBuffer();

  // Enforce maxOutputBytes of 30 KB in compress mode
  const targetMax = 30 * 1024;
  const res = await convertImage(imgBuffer, {
    to: 'webp',
    maxOutputBytes: targetMax,
    sizeMode: 'compress',
  });

  assert.ok(res.size <= targetMax, `Expected size <= ${targetMax}, got ${res.size}`);
  assert.equal(res.ingestion.sizeMode, 'compress');
  assert.ok(res.quality < 85, `Expected quality < 85, got ${res.quality}`);
  assert.ok(res.ingestion.iterations > 0, 'Expected binary search iterations');
});

test('Smart Ingestion Size Bounds: strict mode throws E_OUTPUT_TOO_LARGE without reducing quality', async () => {
  const imgBuffer = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  }).jpeg({ quality: 90 }).toBuffer();

  await assert.rejects(
    async () => {
      await convertImage(imgBuffer, {
        to: 'png',
        maxOutputBytes: 500, // Impossibly small for 400x400 PNG
        sizeMode: 'strict',
      });
    },
    (err) => {
      assert.equal(err.code, 'E_OUTPUT_TOO_LARGE');
      assert.match(err.message, /in strict mode/);
      return true;
    }
  );
});

test('Smart Ingestion Size Bounds: minOutputBytes validation in strict and flexible modes', async () => {
  const tinyBuffer = await sharp({
    create: {
      width: 20,
      height: 20,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  }).webp({ quality: 10 }).toBuffer();

  // Strict mode: throws E_OUTPUT_TOO_SMALL
  await assert.rejects(
    async () => {
      await convertImage(tinyBuffer, {
        to: 'webp',
        minOutputBytes: 10000, // 10 KB
        sizeMode: 'strict',
      });
    },
    (err) => {
      assert.equal(err.code, 'E_OUTPUT_TOO_SMALL');
      return true;
    }
  );

  // Flexible mode: does not throw, emits warning
  const res = await convertImage(tinyBuffer, {
    to: 'webp',
    minOutputBytes: 10000,
    sizeMode: 'flexible',
  });

  assert.ok(res.data);
  assert.ok(res.warnings.length > 0);
  assert.match(res.warnings[0], /below minimum threshold/);
});
