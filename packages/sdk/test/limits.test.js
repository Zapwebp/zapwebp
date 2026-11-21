'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Zapwebp, ZapwebpError } = require('../src');

const sampleSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="#8dc63f"/></svg>',
  'utf8'
);

test('SDK Limits: initializes with resolved limits and enforces maxFilesPerRequest in convertBatch', async () => {
  const zap = new Zapwebp({
    limits: {
      maxFilesPerRequest: 2,
      maxBytesPerRequest: 50 * 1024 * 1024,
    },
  });

  assert.equal(zap.limits.maxFilesPerRequest, 2);
  assert.equal(zap.limits.maxBytesPerRequest, 52428800);

  // Exceeds batch limit: 3 files > 2
  await assert.rejects(
    async () => {
      await zap.convertBatch([sampleSvg, sampleSvg, sampleSvg], { to: 'webp' });
    },
    (err) => {
      assert.ok(err instanceof ZapwebpError);
      assert.equal(err.code, 'E_TOO_MANY_FILES');
      assert.ok(err.message.includes('3 files'));
      assert.ok(err.message.includes('limit is 2'));
      return true;
    }
  );
});

test('SDK Limits: convert single image returns limits metadata block', async () => {
  const zap = new Zapwebp({
    limits: {
      maxFilesPerRequest: 5,
      maxBytesPerRequest: 1048576, // 1 MB
    },
  });

  const res = await zap.convert(sampleSvg, { to: 'webp' });
  assert.ok(res.limits);
  assert.equal(res.limits.filesProcessed, 1);
  assert.equal(res.limits.filesRemaining, 4);
  assert.equal(res.limits.bytesProcessed, sampleSvg.length);
  assert.equal(res.limits.bytesRemaining, 1048576 - sampleSvg.length);
});

test('SDK Limits: convert enforces maxBytesPerRequest with E_REQUEST_TOO_LARGE', async () => {
  const zap = new Zapwebp({
    limits: {
      maxBytesPerRequest: 10, // 10 bytes is smaller than sampleSvg
    },
  });

  await assert.rejects(
    async () => {
      await zap.convert(sampleSvg, { to: 'webp' });
    },
    (err) => {
      assert.ok(err instanceof ZapwebpError);
      assert.equal(err.code, 'E_REQUEST_TOO_LARGE');
      assert.ok(err.message.includes('limit is 10 B'));
      return true;
    }
  );
});

test('SDK Limits: convertBatch under limit succeeds and returns limits metadata block', async () => {
  const zap = new Zapwebp({
    limits: {
      maxFilesPerRequest: 10,
    },
  });

  const res = await zap.convertBatch([sampleSvg, sampleSvg], { to: 'webp' });
  assert.equal(res.total, 2);
  assert.equal(res.success, 2);
  assert.ok(res.limits);
  assert.equal(res.limits.filesProcessed, 2);
  assert.equal(res.limits.filesRemaining, 8);
});
