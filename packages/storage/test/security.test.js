'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateStoragePath,
  stripCredentials,
  validateAdapterContract,
  validateSafeUrl,
  withZapwebp,
  validateStorageConfig,
} = require('../src/index');

test('Security Baseline: validateStoragePath enforces boundary constraints', () => {
  // Safe relative paths
  assert.equal(validateStoragePath('avatar.png'), 'avatar.png');
  assert.equal(validateStoragePath('users/123/profile.jpg'), 'users/123/profile.jpg');
  assert.equal(validateStoragePath('/nested/folder/asset.webp'), 'nested/folder/asset.webp');
  assert.equal(validateStoragePath('nested\\windows\\asset.webp'), 'nested/windows/asset.webp');

  // Directory traversal rejection
  assert.throws(() => validateStoragePath('../etc/passwd'), {
    message: /E_PATH_TRAVERSAL/,
  });
  assert.throws(() => validateStoragePath('uploads/../../secret.txt'), {
    message: /E_PATH_TRAVERSAL/,
  });
  assert.throws(() => validateStoragePath('foo/bar/..'), {
    message: /E_PATH_TRAVERSAL/,
  });

  // Windows absolute drive paths rejection
  assert.throws(() => validateStoragePath('C:\\Windows\\System32\\cmd.exe'), {
    message: /E_PATH_TRAVERSAL/,
  });
  assert.throws(() => validateStoragePath('D:/assets/logo.png'), {
    message: /E_PATH_TRAVERSAL/,
  });

  // file:// URI scheme rejection
  assert.throws(() => validateStoragePath('file:///etc/hosts'), {
    message: /E_PATH_TRAVERSAL/,
  });

  // Null bytes rejection
  assert.throws(() => validateStoragePath('image.png\0.exe'), {
    message: /E_PATH_TRAVERSAL/,
  });

  // Length limit (>1024 bytes) rejection
  const longPath = 'a/'.repeat(513) + 'image.png';
  assert.throws(() => validateStoragePath(longPath), {
    message: /1024 bytes/,
  });
});

test('Security Baseline: stripCredentials redacts sensitive secrets in error outputs', () => {
  const secretBearer = 'Authorization failed for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature';
  const redactedBearer = stripCredentials(secretBearer);
  assert.ok(!redactedBearer.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
  assert.ok(redactedBearer.includes('[REDACTED]'));

  const secretApiKey = 'Failed with service_role key: secret_key_abcdef1234567890_test';
  const redactedApiKey = stripCredentials(secretApiKey);
  assert.ok(!redactedApiKey.includes('secret_key_abcdef1234567890_test'));
  assert.ok(redactedApiKey.includes('[REDACTED]'));

  const secretBasic = 'Basic dXNlcjpwYXNzd29yZDEyMw==';
  const redactedBasic = stripCredentials(secretBasic);
  assert.ok(!redactedBasic.includes('dXNlcjpwYXNzd29yZDEyMw=='));
  assert.ok(redactedBasic.includes('[REDACTED]'));
});

test('Security Baseline: SSRF prevention rejects private IP ranges and cloud metadata', () => {
  assert.throws(() => validateSafeUrl('http://127.0.0.1/metadata'), {
    code: 'E_UNSAFE_URL',
  });
  assert.throws(() => validateSafeUrl('http://169.254.169.254/latest/meta-data/'), {
    code: 'E_UNSAFE_URL',
  });
  assert.throws(() => validateSafeUrl('http://10.0.0.5/internal.png'), {
    code: 'E_UNSAFE_URL',
  });
  assert.throws(() => validateSafeUrl('http://192.168.1.100/router.png'), {
    code: 'E_UNSAFE_URL',
  });
  assert.throws(() => validateSafeUrl('http://[::1]/secret.png'), {
    code: 'E_UNSAFE_URL',
  });
});

test('Community Adapter Contract: validateAdapterContract checks conformance', () => {
  // Compliant adapter
  const goodAdapter = {
    name: 'custom-s3',
    write: async () => ({ path: 'test', bytes: 10 }),
    read: async () => new Uint8Array([1, 2, 3]),
    delete: async () => {},
  };
  const goodResult = validateAdapterContract(goodAdapter);
  assert.equal(goodResult.valid, true);
  assert.equal(goodResult.errors.length, 0);

  // Missing methods
  const brokenAdapter = {
    name: 'broken',
    write: async () => {},
  };
  const brokenResult = validateAdapterContract(brokenAdapter);
  assert.equal(brokenResult.valid, false);
  assert.ok(brokenResult.errors.some((e) => e.includes('read')));
  assert.ok(brokenResult.errors.some((e) => e.includes('delete')));
});

test('Unified Config: validateStorageConfig validates provider specifications', () => {
  const validSupabase = {
    provider: 'supabase',
    bucket: 'avatars',
    client: { storage: { from: () => {} } },
  };
  assert.equal(validateStorageConfig(validSupabase).valid, true);

  const invalidProvider = {
    provider: 'unsupported-cloud',
    bucket: 'test',
  };
  const res = validateStorageConfig(invalidProvider);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Invalid provider')));

  const missingBucket = {
    provider: 'neocities',
    bucket: '',
  };
  const res2 = validateStorageConfig(missingBucket);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('bucket')));
});

test('Wrapper Security: upload rejects path traversal before any processing', async () => {
  const dummyAdapter = {
    name: 'mock',
    write: async () => ({ path: 'ok', bytes: 10 }),
    read: async () => new Uint8Array([1]),
    delete: async () => {},
  };
  const instance = withZapwebp(dummyAdapter);
  const tinyBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');

  await assert.rejects(
    () => instance.upload('bucket', '../escape/image.svg', tinyBuffer),
    /E_PATH_TRAVERSAL/
  );

  await assert.rejects(
    () => instance.upload('bucket', 'C:\\Windows\\hack.png', tinyBuffer),
    /E_PATH_TRAVERSAL/
  );
});

test('Wrapper Performance: uploadMany executes with bounded concurrency', async () => {
  let activeConcurrent = 0;
  let maxConcurrentObserved = 0;

  const mockAdapter = {
    name: 'concurrency-mock',
    write: async (b, p, data) => {
      activeConcurrent++;
      if (activeConcurrent > maxConcurrentObserved) {
        maxConcurrentObserved = activeConcurrent;
      }
      await new Promise((r) => setTimeout(r, 20));
      activeConcurrent--;
      return { path: p, bytes: data.length };
    },
    read: async () => new Uint8Array([1]),
    delete: async () => {},
  };

  const instance = withZapwebp(mockAdapter, { scale: [1] });
  const svgData = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="10" fill="red"/></svg>');

  const files = [
    { path: 'img1.svg', bytes: svgData },
    { path: 'img2.svg', bytes: svgData },
    { path: 'img3.svg', bytes: svgData },
    { path: 'img4.svg', bytes: svgData },
    { path: 'img5.svg', bytes: svgData },
    { path: 'img6.svg', bytes: svgData },
  ];

  const report = await instance.uploadMany('bucket', files, { concurrency: 2 });
  assert.equal(report.summary.files, 6);
  assert.ok(maxConcurrentObserved <= 2, `Observed ${maxConcurrentObserved} concurrent workers, expected <= 2`);
});

