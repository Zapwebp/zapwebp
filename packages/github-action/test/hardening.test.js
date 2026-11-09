'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { sanitizeLog } = require('../src/sanitize');
const { formatOptions } = require('../src/annotations');
const { retry, isTransient } = require('../src/retry');
const { computeFileHash, loadCache, saveCache, shouldConvert } = require('../src/cache');
const { isForkPullRequest, assertForkSafety, ZapwebpActionError } = require('../src/fork');
const { parseInputs } = require('../src/inputs');
const { buildCheckFailureBody } = require('../src/comment');

test('sanitizeLog redacts runner paths, tokens, and authorization credentials', () => {
  const input = 'Error in /home/runner/work/zapwebp/zapwebp/src/logo.svg with token ghp_1234567890abcdef1234 and Authorization: Bearer secret_12345678';
  const sanitized = sanitizeLog(input);

  assert.ok(!sanitized.includes('/home/runner/work/zapwebp/zapwebp/'));
  assert.ok(sanitized.includes('<workspace>/src/logo.svg'));
  assert.ok(!sanitized.includes('ghp_1234567890abcdef1234'));
  assert.ok(sanitized.includes('[REDACTED]'));
  assert.ok(!sanitized.includes('secret_12345678'));
});

test('formatOptions generates standard GitHub Actions key=value parameter strings', () => {
  const formatted = formatOptions({
    file: 'src\\assets\\logo.svg',
    title: 'E_UNSAFE_SVG',
    line: 12,
  });

  assert.equal(formatted, ' file=src/assets/logo.svg,title=E_UNSAFE_SVG,line=12');
});

test('retry handles transient network failures with exponential backoff', async () => {
  let attempts = 0;
  const result = await retry(async () => {
    attempts++;
    if (attempts < 3) {
      const err = new Error('Connection timeout');
      err.code = 'ETIMEDOUT';
      throw err;
    }
    return 'success';
  }, { maxAttempts: 3, baseDelayMs: 10 });

  assert.equal(attempts, 3);
  assert.equal(result, 'success');
});

test('retry fails immediately on non-transient errors without wasting retries', async () => {
  let attempts = 0;
  await assert.rejects(async () => {
    await retry(async () => {
      attempts++;
      const err = new Error('Authentication rejected');
      err.status = 401;
      throw err;
    }, { maxAttempts: 3, baseDelayMs: 10 });
  }, /Authentication rejected/);

  assert.equal(attempts, 1);
});

test('cache computes deterministic hash and enables idempotency skips', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-cache-test-'));
  const testBuffer = Buffer.from('<svg></svg>', 'utf8');
  const options = { format: 'webp', scale: [1], baseWidth: 512, quality: 85, clean: true };

  const hash1 = computeFileHash(testBuffer, options);
  const hash2 = computeFileHash(testBuffer, options);
  assert.equal(hash1, hash2);

  const outFilePath = path.join(tmpDir, 'test.webp');
  fs.writeFileSync(outFilePath, Buffer.from([1, 2, 3]));

  const cache = { 'test.svg': hash1 };
  saveCache(tmpDir, cache);

  const loaded = loadCache(tmpDir);
  assert.equal(loaded['test.svg'], hash1);

  // When output exists and hash matches: skip conversion
  const should1 = shouldConvert('test.svg', hash1, [outFilePath], loaded);
  assert.equal(should1, false);

  // When output exists but input hash changed: convert
  const should2 = shouldConvert('test.svg', 'different-hash', [outFilePath], loaded);
  assert.equal(should2, true);

  // When output is missing: convert
  const should3 = shouldConvert('test.svg', hash1, [path.join(tmpDir, 'missing.webp')], loaded);
  assert.equal(should3, true);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('assertForkSafety blocks commit mode on fork pull requests', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-fork-test-'));
  const eventPath = path.join(tmpDir, 'event.json');
  fs.writeFileSync(eventPath, JSON.stringify({
    pull_request: {
      number: 42,
      head: {
        repo: {
          fork: true,
        },
      },
    },
  }), 'utf8');

  const mockEnv = {
    GITHUB_EVENT_PATH: eventPath,
  };

  assert.equal(isForkPullRequest(mockEnv), true);

  // Mode commit must throw
  assert.throws(() => {
    assertForkSafety({ mode: 'commit' }, mockEnv);
  }, (err) => {
    return err instanceof ZapwebpActionError && err.code === 'E_FORK_COMMIT_FORBIDDEN';
  });

  // Mode check and comment are permitted
  assert.doesNotThrow(() => {
    assertForkSafety({ mode: 'check' }, mockEnv);
  });
  assert.doesNotThrow(() => {
    assertForkSafety({ mode: 'comment' }, mockEnv);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('parseInputs rejects path traversal and malicious inputs', () => {
  // Directory traversal in glob
  assert.throws(() => {
    parseInputs(['../**/*.svg']);
  }, /cannot traverse parent directories/);

  // Leading slash in glob
  assert.throws(() => {
    parseInputs(['/etc/passwd']);
  }, /must be a relative path pattern/);

  // Directory traversal in outDir
  assert.throws(() => {
    parseInputs([], { INPUT_OUT_DIR: '../dist' });
  }, /cannot traverse parent directories/);

  // Newline in commit message
  assert.throws(() => {
    parseInputs([], { INPUT_COMMIT_MESSAGE: 'line1\nline2' });
  }, /cannot contain newline characters/);

  // Invalid mode
  assert.throws(() => {
    parseInputs([], { INPUT_MODE: 'destroy' });
  }, /Invalid action mode/);
});

test('buildCheckFailureBody generates markdown table and runnable CLI command', () => {
  const failures = [
    { file: 'src/logo.svg', reason: 'Out-of-date WebP asset' },
    { file: 'icons/star.png', reason: 'Missing WebP asset' },
  ];

  const body = buildCheckFailureBody(failures);
  assert.ok(body.includes('## ⚡ Zapwebp check failed'));
  assert.ok(body.includes('`src/logo.svg`'));
  assert.ok(body.includes('`icons/star.png`'));
  assert.ok(body.includes('npx zapwebp src/logo.svg icons/star.png'));
});

