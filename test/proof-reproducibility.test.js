'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reliability } = require('@zapwebp/shared');
const { convertImage } = require('@zapwebp/core');

const manifestPath = path.resolve(__dirname, '../MANIFEST.json');

test('Proof 3: Reproducible Outputs - All 50 Golden Corpus outputs match public MANIFEST.json hashes', async () => {
  assert.ok(fs.existsSync(manifestPath), 'MANIFEST.json must exist at repo root');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.cases.length, 50, 'MANIFEST.json must contain 50 golden cases');
  assert.equal(reliability.GOLDEN_CASES.length, 50, 'GOLDEN_CASES must contain 50 cases');

  for (let i = 0; i < reliability.GOLDEN_CASES.length; i++) {
    const c = reliability.GOLDEN_CASES[i];
    const expected = manifest.cases[i];

    assert.equal(c.id, expected.id, `Case index ${i} ID mismatch: ${c.id} vs ${expected.id}`);

    const res = await reliability.verifyGoldenCase(c, async (input, opts) => {
      const out = await convertImage(input, opts);
      return out.data;
    });

    assert.equal(
      res.sha256,
      expected.sha256,
      `Determinism failure on ${c.id} (${c.name}): Expected SHA-256 ${expected.sha256}, got ${res.sha256}`
    );
    assert.equal(
      res.byteLength,
      expected.byteLength,
      `Byte length failure on ${c.id}: Expected ${expected.byteLength}, got ${res.byteLength}`
    );
  }
});
