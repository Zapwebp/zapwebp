'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const core = require('../src/index');

test('Core Discipline 4: Deterministic Output verified by SHA-256 hash', async () => {
  const sampleSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    '<circle cx="50" cy="50" r="40" stroke="#1a1c18" stroke-width="4" fill="#8dc63f"/>' +
    '</svg>'
  );

  // Run conversion 3 separate times with fixed lossless parameters
  const run1 = await core.convert(sampleSvg, { to: 'png', clean: true });
  const run2 = await core.convert(sampleSvg, { to: 'png', clean: true });
  const run3 = await core.convert(sampleSvg, { to: 'png', clean: true });

  const hash1 = crypto.createHash('sha256').update(run1).digest('hex');
  const hash2 = crypto.createHash('sha256').update(run2).digest('hex');
  const hash3 = crypto.createHash('sha256').update(run3).digest('hex');

  assert.equal(hash1, hash2, 'First and second conversion runs must produce identical SHA-256 hashes');
  assert.equal(hash2, hash3, 'Second and third conversion runs must produce identical SHA-256 hashes');
});

test('Core Discipline 7: Safety chain rejects dangerous SVG patterns deterministically', async () => {
  const unsafeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

  await assert.rejects(
    () => core.convert(unsafeSvg, { to: 'webp' }),
    (err) => {
      assert.ok(err.code === 'E_UNSAFE_SVG' || err.message.includes('script'));
      return true;
    }
  );
});

test('Core Discipline 5: No silent failures — throws structured ZapwebpError with code and fix', async () => {
  const emptyBuffer = Buffer.alloc(0);

  await assert.rejects(
    () => core.convert(emptyBuffer, { to: 'webp' }),
    (err) => {
      assert.ok(err.code === 'E_EMPTY_FILE' || err.message.includes('empty'));
      assert.ok(err.fix, 'ZapwebpError must provide an actionable fix guidance');
      return true;
    }
  );
});

