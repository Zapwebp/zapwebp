'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_LIMITS,
  resolveLimits,
  formatBytes,
  evaluateLimits,
  createLimitsMetadata,
  RateLimiter,
  RateLimitStore,
  MemoryRateLimitStore,
  FileRateLimitStore,
  ConcurrencyLimiter,
  ZapwebpError,
} = require('../src');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('Limits: DEFAULT_LIMITS has expected safe values', () => {
  assert.equal(DEFAULT_LIMITS.maxFilesPerRequest, 20);
  assert.equal(DEFAULT_LIMITS.maxFilesPerSession, 100);
  assert.equal(DEFAULT_LIMITS.maxFilesPerUser, null);
  assert.equal(DEFAULT_LIMITS.maxBytesPerRequest, 104857600); // 100 MB
  assert.equal(DEFAULT_LIMITS.maxConcurrent, 4);
  assert.equal(DEFAULT_LIMITS.rateLimit.maxRequests, 100);
  assert.equal(DEFAULT_LIMITS.rateLimit.windowMs, 60000);
});

test('Limits: resolveLimits correctly handles numbers, null, and "unlimited"', () => {
  const custom = resolveLimits({
    maxFilesPerRequest: 50,
    maxFilesPerSession: 'unlimited',
    maxFilesPerUser: 500,
    maxBytesPerRequest: null,
    maxConcurrent: 8,
    rateLimit: 'unlimited',
  });

  assert.equal(custom.maxFilesPerRequest, 50);
  assert.equal(custom.maxFilesPerSession, null);
  assert.equal(custom.maxFilesPerUser, 500);
  assert.equal(custom.maxBytesPerRequest, null);
  assert.equal(custom.maxConcurrent, 8);
  assert.equal(custom.rateLimit, null);
});

test('Limits: formatBytes formats accurately across ranges', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1048576), '1 MB');
  assert.equal(formatBytes(104857600), '100 MB');
});

test('Limits: evaluateLimits enforces maxFilesPerRequest with E_TOO_MANY_FILES', () => {
  assert.throws(
    () => {
      evaluateLimits({
        filesCount: 25,
        limits: { maxFilesPerRequest: 20 },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_TOO_MANY_FILES');
      assert.ok(err.message.includes('25 files'));
      assert.ok(err.message.includes('limit is 20'));
      assert.ok(err.fix.includes('Drop 20 or fewer files'));
      return true;
    }
  );
});

test('Limits: evaluateLimits enforces maxBytesPerRequest with E_REQUEST_TOO_LARGE', () => {
  assert.throws(
    () => {
      evaluateLimits({
        filesCount: 1,
        totalBytes: 150 * 1024 * 1024,
        limits: { maxBytesPerRequest: 100 * 1024 * 1024 },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_REQUEST_TOO_LARGE');
      assert.ok(err.message.includes('150 MB'));
      assert.ok(err.message.includes('100 MB'));
      return true;
    }
  );
});

test('Limits: evaluateLimits enforces maxFilesPerSession with E_SESSION_LIMIT_EXCEEDED', () => {
  assert.throws(
    () => {
      evaluateLimits({
        filesCount: 15,
        sessionCount: 90,
        limits: { maxFilesPerSession: 100 },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_SESSION_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('Processed 105 files'));
      assert.ok(err.message.includes('Session limit of 100 files reached'));
      assert.ok(err.fix.includes('zap --reset-session'));
      return true;
    }
  );
});

test('Limits: evaluateLimits enforces maxFilesPerUser with E_USER_LIMIT_EXCEEDED', () => {
  assert.throws(
    () => {
      evaluateLimits({
        filesCount: 10,
        userCount: 50,
        limits: { maxFilesPerUser: 50 },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_USER_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('Processed 60 files'));
      assert.ok(err.message.includes('user limit is 50'));
      return true;
    }
  );
});

test('Limits: createLimitsMetadata builds full headroom block', () => {
  const meta = createLimitsMetadata({
    filesCount: 15,
    totalBytes: 42000000,
    sessionCount: 32,
    limits: {
      maxFilesPerRequest: 20,
      maxBytesPerRequest: 104857600,
      maxFilesPerSession: 100,
      maxConcurrent: 4,
    },
  });

  assert.equal(meta.maxFilesPerRequest, 20);
  assert.equal(meta.usedFiles, 15);
  assert.equal(meta.remainingFiles, 5);
  assert.equal(meta.maxBytesPerRequest, 104857600);
  assert.equal(meta.usedBytes, 42000000);
  assert.equal(meta.remainingBytes, 62857600);
  assert.equal(meta.maxConcurrent, 4);
  assert.equal(meta.session.maxFilesPerSession, 100);
  assert.equal(meta.session.usedFiles, 47);
  assert.equal(meta.session.remainingFiles, 53);
});

test('Limits: RateLimiter tracks and enforces request rates', () => {
  const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

  assert.equal(limiter.check('user_1'), true);
  limiter.record('user_1');
  limiter.record('user_1');
  limiter.record('user_1');

  assert.equal(limiter.check('user_1'), false);

  assert.throws(
    () => limiter.record('user_1'),
    (err) => {
      assert.equal(err.code, 'E_RATE_LIMIT');
      assert.ok(err.message.includes('Too many requests'));
      return true;
    }
  );

  // Different user is independent
  assert.equal(limiter.check('user_2'), true);
});

test('Limits: FileRateLimitStore coordinates rate limits across instances atomically', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-ratelimit-test-'));
  const filePath = path.join(tmpDir, 'ratelimit.json');

  try {
    const store1 = new FileRateLimitStore({ filePath });
    const store2 = new FileRateLimitStore({ filePath });

    const limiter1 = new RateLimiter({ maxRequests: 2, windowMs: 10000, store: store1 });
    const limiter2 = new RateLimiter({ maxRequests: 2, windowMs: 10000, store: store2 });

    // Instance 1 records 1 request
    limiter1.record('tenant-a');
    assert.equal(limiter2.remaining('tenant-a'), 1);

    // Instance 2 records 1 request
    await limiter2.recordAsync('tenant-a');
    assert.equal(await limiter1.remainingAsync('tenant-a'), 0);

    // Instance 1 exceeds limit
    assert.throws(
      () => limiter1.record('tenant-a'),
      (err) => err.code === 'E_RATE_LIMIT'
    );

    // Clear works across instances
    limiter1.clear('tenant-a');
    assert.equal(limiter2.remaining('tenant-a'), 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Limits: ConcurrencyLimiter tracks perUser and global capacity', async () => {
  const limiter = new ConcurrencyLimiter({
    perRequest: 2,
    perUser: 2,
    global: 3,
  });

  const token1 = limiter.acquire({ userId: 'alice' });
  const token2 = limiter.acquire({ userId: 'alice' });

  assert.equal(limiter.getStatus({ userId: 'alice' }).activeUser, 2);
  assert.equal(limiter.getStatus().activeGlobal, 2);

  // Alice cannot exceed perUser limit
  assert.throws(
    () => limiter.acquire({ userId: 'alice' }),
    (err) => {
      assert.equal(err.code, 'E_CONCURRENCY_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('User concurrency limit of 2 reached'));
      return true;
    }
  );

  // Bob can acquire up to global limit
  const token3 = limiter.acquire({ userId: 'bob' });
  assert.equal(limiter.getStatus().activeGlobal, 3);

  // Global ceiling reached
  assert.throws(
    () => limiter.acquire({ userId: 'carol' }),
    (err) => {
      assert.equal(err.code, 'E_CONCURRENCY_LIMIT_EXCEEDED');
      assert.ok(err.message.includes('Global concurrency limit of 3 reached'));
      return true;
    }
  );

  // Release alice token
  token1.release();
  assert.equal(limiter.getStatus({ userId: 'alice' }).activeUser, 1);
  assert.equal(limiter.getStatus().activeGlobal, 2);

  // Now carol can acquire
  const token4 = limiter.acquire({ userId: 'carol' });
  assert.equal(limiter.getStatus().activeGlobal, 3);

  token2.release();
  token3.release();
  token4.release();
  assert.equal(limiter.getStatus().activeGlobal, 0);
});

test('Limits: ConcurrencyLimiter run() executes and releases automatically', async () => {
  const limiter = new ConcurrencyLimiter({ perUser: 1, global: 2 });
  let ran = false;

  await limiter.run(async () => {
    assert.equal(limiter.getStatus({ userId: 'u1' }).activeUser, 1);
    ran = true;
  }, { userId: 'u1' });

  assert.equal(ran, true);
  assert.equal(limiter.getStatus({ userId: 'u1' }).activeUser, 0);
});
