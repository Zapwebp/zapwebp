'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { undoTransaction, pruneJournal } from '../src/journal.js';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/zapwebp.js');
const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#8dc63f"/></svg>';

function runCli(args, cwd, input) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, input, encoding: 'utf8', timeout: 30000 });
}

test('CLI Lifecycle: --delete-original requires confirmation or --yes in non-interactive environment', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-cli-life-'));
  try {
    const src = path.join(tmp, 'test.svg');
    await writeFile(src, SAMPLE_SVG);

    // Without --yes in child process (non-TTY), should fail with E_CONFIRMATION_REQUIRED
    const res = runCli([src, '--delete-original'], tmp);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr + res.stdout, /E_CONFIRMATION_REQUIRED|requires --yes/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('CLI Lifecycle: --delete-original --yes deletes source after verified conversion and undo restores it', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-cli-life-'));
  try {
    const src = path.join(tmp, 'logo.svg');
    const out = path.join(tmp, 'logo.webp');
    await writeFile(src, SAMPLE_SVG);

    // Run conversion with --delete-original and --yes
    const res = runCli(['logo.svg', '-o', 'logo.webp', '--delete-original', '--yes'], tmp);
    assert.equal(res.status, 0, res.stderr);

    // WebP must exist
    const webpData = await readFile(out).catch(() => null);
    assert.ok(webpData, 'Output WebP was created');

    // Original SVG must be deleted from disk
    const origData = await readFile(src).catch(() => null);
    assert.equal(origData, null, 'Original SVG was deleted from disk');

    // Undo should restore the deleted SVG from .zapwebp/backups/
    const undoRes = await undoTransaction(tmp);
    assert.equal(undoRes.undoneCount >= 1, true, 'Transaction was undone');

    const restoredData = await readFile(src, 'utf8').catch(() => null);
    assert.equal(restoredData, SAMPLE_SVG, 'Original SVG was restored from journal backup');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('CLI Lifecycle: gc --all and --dry-run purge journal backups safely', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-cli-gc-'));
  try {
    const src = path.join(tmp, 'icon.svg');
    await writeFile(src, SAMPLE_SVG);

    const res = runCli(['icon.svg', '--delete-original', '--yes'], tmp);
    assert.equal(res.status, 0, res.stderr);

    // Dry-run should report would prune without deleting
    const dryRes = await pruneJournal(tmp, 50, 30, { all: true, dryRun: true });
    assert.ok(dryRes.prunedCount >= 1, 'Found at least 1 backup in dry-run');

    // Real prune with all: true
    const gcRes = await pruneJournal(tmp, 50, 30, { all: true, dryRun: false });
    assert.ok(gcRes.prunedCount >= 1, 'Pruned transaction backup');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
