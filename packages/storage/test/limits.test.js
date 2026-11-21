'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { withZapwebp } = require('../src');

function createMockAdapter() {
  const files = new Map();
  return {
    name: 'mock',
    async write(bucket, targetPath, data) {
      files.set(`${bucket}/${targetPath}`, data);
      return { path: targetPath, publicUrl: `https://storage.test/${bucket}/${targetPath}` };
    },
    async read(bucket, targetPath) {
      return files.get(`${bucket}/${targetPath}`);
    },
    async delete(bucket, targetPath) {
      files.delete(`${bucket}/${targetPath}`);
    },
    async exists(bucket, targetPath) {
      return files.has(`${bucket}/${targetPath}`);
    },
    async list(bucket, prefix) {
      return [];
    },
  };
}

const sampleSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#22c55e"/></svg>');

test('Storage Limits: uploadMany rejects batch exceeding maxFilesPerRequest with E_TOO_MANY_FILES', async () => {
  const zap = withZapwebp(createMockAdapter(), {
    limits: {
      maxFilesPerRequest: 2,
    },
  });

  const batch = [
    { path: 'icon1.svg', bytes: sampleSvg },
    { path: 'icon2.svg', bytes: sampleSvg },
    { path: 'icon3.svg', bytes: sampleSvg },
  ];

  await assert.rejects(
    async () => {
      await zap.uploadMany('icons', batch);
    },
    (err) => {
      assert.equal(err.code, 'E_TOO_MANY_FILES');
      assert.ok(err.message.includes('3 files'));
      assert.ok(err.message.includes('limit is 2'));
      assert.ok(err.fix.includes('Drop 2 or fewer files'));
      return true;
    }
  );
});

test('Storage Limits: uploadMany rejects batch exceeding maxBytesPerRequest with E_REQUEST_TOO_LARGE', async () => {
  const zap = withZapwebp(createMockAdapter(), {
    limits: {
      maxBytesPerRequest: 100, // 100 bytes limit
    },
  });

  const largeBytes = Buffer.alloc(200, 0x00);
  const batch = [
    { path: 'large.bin', bytes: largeBytes },
  ];

  await assert.rejects(
    async () => {
      await zap.uploadMany('icons', batch);
    },
    (err) => {
      assert.equal(err.code, 'E_REQUEST_TOO_LARGE');
      assert.ok(err.message.includes('200 B'));
      assert.ok(err.message.includes('100 B'));
      return true;
    }
  );
});

test('Storage Limits: uploadMany enforces maxFilesPerUser quota per user ID', async () => {
  const zap = withZapwebp(createMockAdapter(), {
    limits: {
      maxFilesPerUser: 2,
    },
  });

  // User 1: first upload 1 file (ok)
  await zap.uploadMany('icons', [{ path: 'user1_a.svg', bytes: sampleSvg }], { userId: 'user_1' });

  // User 1: upload 2 more files -> total 3 > limit 2 -> E_USER_LIMIT_EXCEEDED
  await assert.rejects(
    async () => {
      await zap.uploadMany(
        'icons',
        [
          { path: 'user1_b.svg', bytes: sampleSvg },
          { path: 'user1_c.svg', bytes: sampleSvg },
        ],
        { userId: 'user_1' }
      );
    },
    (err) => {
      assert.equal(err.code, 'E_USER_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('user limit is 2'));
      return true;
    }
  );

  // Different user is not blocked
  const resUser2 = await zap.uploadMany('icons', [{ path: 'user2_a.svg', bytes: sampleSvg }], { userId: 'user_2' });
  assert.equal(resUser2.summary.files, 1);
});

test('Storage Limits: uploadMany enforces rateLimit with E_RATE_LIMIT', async () => {
  const zap = withZapwebp(createMockAdapter(), {
    limits: {
      rateLimit: {
        maxRequests: 2,
        windowMs: 60000,
      },
    },
  });

  // 1st request
  await zap.uploadMany('icons', [{ path: 'rate_1.svg', bytes: sampleSvg }], { userId: 'rate_user' });
  // 2nd request
  await zap.uploadMany('icons', [{ path: 'rate_2.svg', bytes: sampleSvg }], { userId: 'rate_user' });

  // 3rd request should fail
  await assert.rejects(
    async () => {
      await zap.uploadMany('icons', [{ path: 'rate_3.svg', bytes: sampleSvg }], { userId: 'rate_user' });
    },
    (err) => {
      assert.equal(err.code, 'E_RATE_LIMIT');
      assert.ok(err.message.includes('Too many requests'));
      return true;
    }
  );
});

test('Storage Limits: upload and uploadMany responses include limits metadata block', async () => {
  const zap = withZapwebp(createMockAdapter(), {
    limits: {
      maxFilesPerRequest: 10,
      maxBytesPerRequest: 104857600,
      maxFilesPerSession: 100,
      maxConcurrent: 2,
    },
  });

  const resSingle = await zap.upload('icons', 'logo.svg', sampleSvg);
  assert.ok(resSingle.limits);
  assert.equal(resSingle.limits.maxFilesPerRequest, 10);
  assert.equal(resSingle.limits.usedFiles, 1);
  assert.equal(resSingle.limits.remainingFiles, 9);
  assert.equal(resSingle.limits.maxConcurrent, 2);

  const resBatch = await zap.uploadMany('icons', [
    { path: 'batch1.svg', bytes: sampleSvg },
    { path: 'batch2.svg', bytes: sampleSvg },
  ]);
  assert.ok(resBatch.limits);
  assert.equal(resBatch.limits.maxFilesPerRequest, 10);
  assert.equal(resBatch.limits.usedFiles, 2);
  assert.equal(resBatch.limits.remainingFiles, 8);
});
