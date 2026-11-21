'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/zapwebp.js');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="#8dc63f"/></svg>';

function run(args, cwd, input) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, input, encoding: 'utf8', timeout: 30000 });
}

test('CLI Limits: enforces --max-files flag and fails with E_TOO_MANY_FILES', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-cli-limits-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'icons'), { recursive: true });
  for (let i = 1; i <= 5; i++) {
    await writeFile(path.join(directory, 'icons', `icon${i}.svg`), svg);
  }

  // 1. Run with --max-files 3 -> should fail
  const failed = run(['icons/*.svg', '--max-files', '3', '--out-dir', 'dist'], directory);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /E_TOO_MANY_FILES/);
  assert.match(failed.stderr, /limit is 3/);

  // 2. Run with --max-files 10 -> should succeed
  const ok = run(['icons/*.svg', '--max-files', '10', '--out-dir', 'dist', '--json'], directory);
  assert.equal(ok.status, 0, ok.stderr);
  const records = JSON.parse(ok.stdout);
  assert.equal(records.length, 5);
  assert.ok(records[0].limits);
  assert.equal(records[0].limits.filesProcessed, 5);
});

test('CLI Limits: --unlimited bypasses maxFiles and maxBytes limits from config', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-cli-unlimited-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, '.zapwebp'), { recursive: true });
  await writeFile(
    path.join(directory, '.zapwebp', 'config.json'),
    JSON.stringify({
      limits: {
        maxFilesPerRequest: 2,
      },
    }),
    'utf8'
  );

  await mkdir(path.join(directory, 'icons'), { recursive: true });
  for (let i = 1; i <= 4; i++) {
    await writeFile(path.join(directory, 'icons', `icon${i}.svg`), svg);
  }

  // Without --unlimited, fails due to config limit of 2
  const failed = run(['icons/*.svg', '--out-dir', 'dist'], directory);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /E_TOO_MANY_FILES/);

  // With --unlimited, succeeds
  const success = run(['icons/*.svg', '--unlimited', '--out-dir', 'dist', '--json'], directory);
  assert.equal(success.status, 0, success.stderr);
  const records = JSON.parse(success.stdout);
  assert.equal(records.length, 4);
  assert.equal(records[0].limits.filesRemaining, null); // null indicates unlimited
});

test('CLI Limits: tracks session in .zapwebp/session.json and supports --reset-session', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-cli-session-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, '.zapwebp'), { recursive: true });
  await writeFile(
    path.join(directory, '.zapwebp', 'config.json'),
    JSON.stringify({
      limits: {
        maxFilesPerRequest: 10,
        maxFilesPerSession: 3,
      },
    }),
    'utf8'
  );

  await mkdir(path.join(directory, 'batch1'), { recursive: true });
  await writeFile(path.join(directory, 'batch1', 'a.svg'), svg);
  await writeFile(path.join(directory, 'batch1', 'b.svg'), svg);

  // Run 1: 2 files processed (under session limit of 3)
  const run1 = run(['batch1/*.svg', '--out-dir', 'dist1'], directory);
  assert.equal(run1.status, 0, run1.stderr);

  // Check session.json exists and has filesProcessed = 2
  const sessionRaw = await readFile(path.join(directory, '.zapwebp', 'session.json'), 'utf8');
  const sessionData = JSON.parse(sessionRaw);
  assert.equal(sessionData.filesProcessed, 2);

  // Run 2: 2 files processed -> total 4 > session limit 3 -> fails with E_SESSION_LIMIT_EXCEEDED
  await mkdir(path.join(directory, 'batch2'), { recursive: true });
  await writeFile(path.join(directory, 'batch2', 'c.svg'), svg);
  await writeFile(path.join(directory, 'batch2', 'd.svg'), svg);

  const run2 = run(['batch2/*.svg', '--out-dir', 'dist2'], directory);
  assert.equal(run2.status, 1);
  assert.match(run2.stderr, /E_SESSION_LIMIT_EXCEEDED/);
  assert.match(run2.stderr, /zap --reset-session/);

  // Reset session
  const resetRun = run(['--reset-session'], directory);
  assert.equal(resetRun.status, 0, resetRun.stderr);
  assert.match(resetRun.stdout, /Session reset/);

  // Run 2 again: now succeeds because session counter was reset to 0
  const run3 = run(['batch2/*.svg', '--out-dir', 'dist2'], directory);
  assert.equal(run3.status, 0, run3.stderr);
});

test('CLI Limits: enforces --max-bytes limit and fails with E_REQUEST_TOO_LARGE', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-cli-bytes-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'img'), { recursive: true });
  await writeFile(path.join(directory, 'img', 'test.svg'), svg);

  // Limit to 10 bytes -> fails because svg is ~105 bytes
  const failed = run(['img/test.svg', '--max-bytes', '10B', '--out-dir', 'dist'], directory);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /E_REQUEST_TOO_LARGE/);
});
