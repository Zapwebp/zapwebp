'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  computeOptionsHash,
  createLockFingerprint,
  writeLock,
  readLock,
  verifyLock,
  createLockPlugin,
  ENGINE_VERSION,
  LOCK_VERSION,
} = require('../src/lock');

test('L1 & L2: computeOptionsHash is deterministic and canonical', () => {
  const hashA = computeOptionsHash({ to: 'webp', quality: 80, clean: true, width: 400 });
  const hashB = computeOptionsHash({ width: 400, clean: true, quality: 80, to: 'webp' });
  assert.equal(hashA, hashB, 'Key order in options must not change the hash');

  const hashDiff = computeOptionsHash({ to: 'webp', quality: 85, clean: true, width: 400 });
  assert.notEqual(hashA, hashDiff, 'Altering quality must produce a different hash');
});

test('L1: createLockFingerprint builds standard zapwebp:lock block', () => {
  const fakeInput = Buffer.from('test-image-content-bytes');
  const fingerprint = createLockFingerprint({
    input: fakeInput,
    options: { to: 'png', quality: 90 },
    engineVersion: '2.26.0',
  });

  const lock = fingerprint['zapwebp:lock'];
  assert.ok(lock);
  assert.equal(lock.version, LOCK_VERSION);
  assert.equal(lock.engineVersion, '2.26.0');
  assert.equal(lock.inputSha256, crypto.createHash('sha256').update(fakeInput).digest('hex'));
  assert.equal(lock.optionsSha256, computeOptionsHash({ to: 'png', quality: 90 }));
  assert.equal(lock.optionsSummary.to, 'png');
});

test('L3 & L4: writeLock and readLock roundtrip across SVG', () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>', 'utf8');
  const fp = createLockFingerprint({ input: svg, options: { to: 'svg' } });
  const locked = writeLock(svg, 'svg', fp);

  const extracted = readLock(locked, 'svg');
  assert.ok(extracted);
  assert.equal(extracted.version, LOCK_VERSION);
  assert.equal(extracted.optionsSha256, fp['zapwebp:lock'].optionsSha256);
});

test('L3 & L4: writeLock and readLock roundtrip across WebP', () => {
  // Construct minimal valid WebP header
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(4, 4);
  header.write('WEBP', 8, 4, 'ascii');

  const fp = createLockFingerprint({ input: header, options: { to: 'webp', quality: 85 } });
  const locked = writeLock(header, 'webp', fp);

  const extracted = readLock(locked, 'webp');
  assert.ok(extracted);
  assert.equal(extracted.optionsSha256, fp['zapwebp:lock'].optionsSha256);
});

test('L3 & L4: writeLock and readLock roundtrip across PNG', () => {
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4, 4, 'ascii');
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  const fakePng = Buffer.concat([pngSig, ihdr, iend]);

  const fp = createLockFingerprint({ input: fakePng, options: { to: 'png' } });
  const locked = writeLock(fakePng, 'png', fp);

  const extracted = readLock(locked, 'png');
  assert.ok(extracted);
  assert.equal(extracted.optionsSha256, fp['zapwebp:lock'].optionsSha256);
});

test('L3 & L4: writeLock and readLock roundtrip across JPEG', () => {
  const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // SOI + EOI
  const fp = createLockFingerprint({ input: fakeJpeg, options: { to: 'jpeg', quality: 80 } });
  const locked = writeLock(fakeJpeg, 'jpeg', fp);

  const extracted = readLock(locked, 'jpeg');
  assert.ok(extracted);
  assert.equal(extracted.optionsSha256, fp['zapwebp:lock'].optionsSha256);
});

test('L5: verifyLock detects match and commands skip', () => {
  const input = Buffer.from('image-raw-data');
  const options = { to: 'webp', quality: 85 };
  const fp = createLockFingerprint({ input, options, engineVersion: ENGINE_VERSION });

  const dummyWebp = Buffer.alloc(12);
  dummyWebp.write('RIFF', 0, 4, 'ascii');
  dummyWebp.write('WEBP', 8, 4, 'ascii');
  const lockedOutput = writeLock(dummyWebp, 'webp', fp);

  // 1. Identical request: skip
  const res1 = verifyLock(lockedOutput, input, options);
  assert.equal(res1.match, true);
  assert.equal(res1.skipped, true);
  assert.equal(res1.reason, 'options_hash_match');

  // 2. Options mismatch (quality change): re-convert
  const res2 = verifyLock(lockedOutput, input, { to: 'webp', quality: 90 });
  assert.equal(res2.match, false);
  assert.equal(res2.skipped, false);
  assert.equal(res2.reason, 'options_hash_mismatch');

  // 3. Input mismatch: re-convert
  const res3 = verifyLock(lockedOutput, Buffer.from('different-image'), options);
  assert.equal(res3.match, false);
  assert.equal(res3.skipped, false);
  assert.equal(res3.reason, 'input_hash_mismatch');

  // 4. Force override: re-convert
  const res4 = verifyLock(lockedOutput, input, options, { force: true });
  assert.equal(res4.match, false);
  assert.equal(res4.skipped, false);
  assert.equal(res4.reason, 'forced');

  // 5. Engine version mismatch
  const res5 = verifyLock(lockedOutput, input, options, { engineVersion: '9.9.9' });
  assert.equal(res5.match, false);
  assert.equal(res5.skipped, false);
  assert.equal(res5.reason, 'engine_version_mismatch');
});

test('L5: createLockPlugin lifecycle hooks beforeConvert and afterConvert', async () => {
  const plugin = createLockPlugin();
  const input = Buffer.from('sample-source');
  const options = { to: 'svg' };

  // Generate output with lock
  const baseSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  const outputs = await plugin.hooks.afterConvert({ input, options }, [{ data: baseSvg, format: 'svg' }]);
  assert.ok(outputs[0].lock);
  assert.ok(readLock(outputs[0].data, 'svg'));

  // Test beforeConvert skipping on matching output
  const ctx = await plugin.hooks.beforeConvert({
    input,
    options,
    existingBuffer: outputs[0].data,
  });
  assert.equal(ctx.skipConversion, true);
  assert.equal(ctx.lock.match, true);
});
