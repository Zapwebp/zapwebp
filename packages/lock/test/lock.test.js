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
  shouldSkipConversion,
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
  assert.equal(lock.targetFormat, 'png');
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

test('L2: shouldSkipConversion handles intentional format changes vs identical requests', () => {
  const inputSha256 = 'abc123inputhash';
  const existingLock = {
    version: LOCK_VERSION,
    inputSha256,
    targetFormat: 'webp',
    engineVersion: ENGINE_VERSION,
    optionsSha256: computeOptionsHash({ to: 'webp', quality: 85 }),
    convertedAt: '2026-11-22T00:00:00.000Z',
    optionsSummary: { to: 'webp', quality: 85 },
  };

  // 1. Identical request -> skip
  const resIdentical = shouldSkipConversion(existingLock, { to: 'webp', quality: 85 }, inputSha256);
  assert.deepEqual(resIdentical, { skip: true, reason: 'identical_request' });

  // 2. Intentional format change -> DO NOT skip (new derivative requested)
  const resFormatChange = shouldSkipConversion(existingLock, { to: 'avif', quality: 85 }, inputSha256);
  assert.deepEqual(resFormatChange, { skip: false, reason: 'new_target_format_requested' });

  const resFormatChangePng = shouldSkipConversion(existingLock, { to: 'png' }, inputSha256);
  assert.deepEqual(resFormatChangePng, { skip: false, reason: 'new_target_format_requested' });

  // 3. Options changed (e.g. quality 85 -> 90) -> DO NOT skip
  const resOptionsChange = shouldSkipConversion(existingLock, { to: 'webp', quality: 90 }, inputSha256);
  assert.deepEqual(resOptionsChange, { skip: false, reason: 'options_changed' });

  // 4. Input changed -> DO NOT skip
  const resInputChanged = shouldSkipConversion(existingLock, { to: 'webp', quality: 85 }, 'differentinputhash');
  assert.deepEqual(resInputChanged, { skip: false, reason: 'input_changed' });

  // 5. Engine version mismatch with invalidation on -> DO NOT skip
  const resEngineMismatch = shouldSkipConversion(
    existingLock,
    { to: 'webp', quality: 85 },
    inputSha256,
    { engineVersion: '99.0.0' }
  );
  assert.deepEqual(resEngineMismatch, { skip: false, reason: 'engine_version_changed' });

  // 6. Force override -> DO NOT skip
  const resForced = shouldSkipConversion(
    existingLock,
    { to: 'webp', quality: 85 },
    inputSha256,
    { force: true }
  );
  assert.deepEqual(resForced, { skip: false, reason: 'forced' });
});

test('L3: verifyLock reports new_target_format_requested and does not skip when format differs', () => {
  const input = Buffer.from('test-logo-vector-or-raster');
  const webpOptions = { to: 'webp', quality: 85 };
  const fpWebp = createLockFingerprint({ input, options: webpOptions, engineVersion: ENGINE_VERSION });

  const dummyWebp = Buffer.alloc(12);
  dummyWebp.write('RIFF', 0, 4, 'ascii');
  dummyWebp.write('WEBP', 8, 4, 'ascii');
  const lockedWebp = writeLock(dummyWebp, 'webp', fpWebp);

  // When asking for AVIF on an existing WebP lock:
  const avifOptions = { to: 'avif', quality: 85 };
  const verification = verifyLock(lockedWebp, input, avifOptions);

  assert.equal(verification.match, false, 'Format change must not match old lock');
  assert.equal(verification.skipped, false, 'Must not skip intentional format change');
  assert.equal(verification.reason, 'new_target_format_requested');
  assert.equal(verification.targetFormat, 'webp');
  assert.equal(verification.requestedFormat, 'avif');
});

test('L5: Edge cases matrix - WebP, AVIF, quality, and edited source', () => {
  const inputA = Buffer.from('logo-source-content-v1');
  const inputB = Buffer.from('logo-source-content-v2-edited');

  // Scenario 1: WebP -> WebP (same options) -> Skip (redundant)
  const fpWebp85 = createLockFingerprint({ input: inputA, options: { to: 'webp', quality: 85 } });
  const dummyWebp = Buffer.alloc(12);
  dummyWebp.write('RIFF', 0, 4, 'ascii');
  dummyWebp.write('WEBP', 8, 4, 'ascii');
  const lockedWebp = writeLock(dummyWebp, 'webp', fpWebp85);

  const res1 = verifyLock(lockedWebp, inputA, { to: 'webp', quality: 85 });
  assert.equal(res1.match, true);
  assert.equal(res1.skipped, true);

  // Scenario 2: WebP -> WebP (new quality 92) -> Convert (options changed)
  const res2 = verifyLock(lockedWebp, inputA, { to: 'webp', quality: 92 });
  assert.equal(res2.match, false);
  assert.equal(res2.skipped, false);
  assert.equal(res2.reason, 'options_hash_mismatch');

  // Scenario 3: WebP -> AVIF -> Convert (new derivative requested)
  const res3 = verifyLock(lockedWebp, inputA, { to: 'avif', quality: 85 });
  assert.equal(res3.match, false);
  assert.equal(res3.skipped, false);
  assert.equal(res3.reason, 'new_target_format_requested');

  // Scenario 4: WebP -> AVIF (then later WebP again) -> WebP lock remains valid and skips
  const res4 = verifyLock(lockedWebp, inputA, { to: 'webp', quality: 85 });
  assert.equal(res4.match, true);
  assert.equal(res4.skipped, true);

  // Scenario 5: Source file edited, WebP -> AVIF -> Convert (input changed)
  const res5 = verifyLock(lockedWebp, inputB, { to: 'avif', quality: 85 });
  assert.equal(res5.match, false);
  assert.equal(res5.skipped, false);
  // When input is changed and format is changed, input hash mismatch takes precedence or format change
  assert.ok(res5.reason === 'input_hash_mismatch' || res5.reason === 'new_target_format_requested');
});

test('L5: Multi-format derivatives have independent, non-conflicting locks', () => {
  const sourceSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');

  // Create WebP derivative
  const dummyWebp = Buffer.alloc(12);
  dummyWebp.write('RIFF', 0, 4, 'ascii');
  dummyWebp.write('WEBP', 8, 4, 'ascii');
  const fpWebp = createLockFingerprint({ input: sourceSvg, options: { to: 'webp', quality: 85 } });
  const lockedWebp = writeLock(dummyWebp, 'webp', fpWebp);

  // Create AVIF derivative (simulated container)
  const dummyAvif = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
  const fpAvif = createLockFingerprint({ input: sourceSvg, options: { to: 'avif', quality: 75 } });
  
  assert.equal(fpWebp['zapwebp:lock'].targetFormat, 'webp');
  assert.equal(fpAvif['zapwebp:lock'].targetFormat, 'avif');
  assert.notEqual(fpWebp['zapwebp:lock'].optionsSha256, fpAvif['zapwebp:lock'].optionsSha256);

  // Verify WebP output against WebP request -> match
  assert.equal(verifyLock(lockedWebp, sourceSvg, { to: 'webp', quality: 85 }).match, true);
  // Verify WebP output against AVIF request -> no match, new derivative
  assert.equal(verifyLock(lockedWebp, sourceSvg, { to: 'avif', quality: 75 }).reason, 'new_target_format_requested');
});
