'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const zapCli = path.resolve(__dirname, '../bin/zap.js');

test('Proof 2: CLI --verify compares output SHA-256 and strictly enforces verification', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-verify-proof-'));
  const testSvg = path.join(tmpDir, 'test.svg');
  const validSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#22c55e"/></svg>';
  fs.writeFileSync(testSvg, validSvg);

  // 1. Initial conversion to find actual SHA-256
  const out1 = path.join(tmpDir, 'out1.webp');
  const initialRun = spawnSync(process.execPath, [zapCli, 'test.svg', '--to', 'webp', '-o', 'out1.webp'], {
    cwd: tmpDir,
    encoding: 'utf8',
  });
  assert.equal(initialRun.status, 0, `Initial conversion failed: ${initialRun.stderr}`);
  assert.ok(fs.existsSync(out1), 'Initial output file must exist');

  const actualBytes = fs.readFileSync(out1);
  const expectedHash = crypto.createHash('sha256').update(actualBytes).digest('hex');

  // 2. Conversion with MATCHING --verify hash -> Must succeed and write file
  const outValid = path.join(tmpDir, 'out-valid.webp');
  const validRun = spawnSync(process.execPath, [
    zapCli,
    'test.svg',
    '--to', 'webp',
    '-o', 'out-valid.webp',
    '--verify', expectedHash
  ], {
    cwd: tmpDir,
    encoding: 'utf8',
  });
  assert.equal(validRun.status, 0, `Matching --verify failed: ${validRun.stderr}`);
  assert.ok(fs.existsSync(outValid), 'Output file must be written when hash matches');

  // 3. Conversion with MISMATCHING --verify hash -> Must exit with code 1, print E_VERIFICATION_FAILED, and NOT write file
  const outMismatch = path.join(tmpDir, 'out-mismatch.webp');
  const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const failRun = spawnSync(process.execPath, [
    zapCli,
    'test.svg',
    '--to', 'webp',
    '-o', 'out-mismatch.webp',
    '--verify', wrongHash
  ], {
    cwd: tmpDir,
    encoding: 'utf8',
  });

  assert.equal(failRun.status, 1, 'Mismatched --verify must exit with code 1');
  assert.ok(
    failRun.stderr.includes('E_VERIFICATION_FAILED'),
    `Stderr must contain E_VERIFICATION_FAILED, got:\n${failRun.stderr}`
  );
  assert.equal(
    fs.existsSync(outMismatch),
    false,
    'Output file must NOT be written when verification fails'
  );

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
