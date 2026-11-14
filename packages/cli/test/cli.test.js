'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import core from '@zapwebp/core';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/zapwebp.js');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="#8dc63f"/></svg>';

function run(args, cwd, input) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, input, encoding: 'utf8', timeout: 30000 });
}

test('CLI converts batches without filename collisions and supports check, stdin, and dry-run', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'assets', 'left'), { recursive: true });
  await mkdir(path.join(directory, 'assets', 'right'), { recursive: true });
  await writeFile(path.join(directory, 'assets', 'left', 'logo.svg'), svg);
  await writeFile(path.join(directory, 'assets', 'right', 'logo.svg'), svg);

  const batch = run(['assets/**/*.svg', '--out-dir', 'out', '--lossless', '--json'], directory);
  assert.equal(batch.status, 0, batch.stderr);
  const entries = JSON.parse(batch.stdout);
  assert.equal(entries.length, 2);
  assert.ok(await stat(path.join(directory, 'out', 'left', 'logo.webp')));
  assert.ok(await stat(path.join(directory, 'out', 'right', 'logo.webp')));

  const check = run(['assets/**/*.svg', '--out-dir', 'out', '--lossless', '--check', '--json'], directory);
  assert.equal(check.status, 0, check.stderr);
  assert.ok(JSON.parse(check.stdout).every((entry) => entry.status === 'current'));

  const dryRun = run(['assets/**/*.svg', '--out-dir', 'dry', '--dry-run', '--json'], directory);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.ok(JSON.parse(dryRun.stdout).every((entry) => entry.status === 'planned'));
  await assert.rejects(stat(path.join(directory, 'dry')));

  const piped = run(['-', '-o', 'piped.webp'], directory, svg);
  assert.equal(piped.status, 0, piped.stderr);
  assert.equal((await readFile(path.join(directory, 'piped.webp'))).toString('ascii', 8, 12), 'WEBP');

  const invalid = run(['assets/left/logo.svg', '--width', '9000'], directory);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /between 1 and 4096/);
});

test('watch mode converts newly added SVGs', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-watch-'));
  let child;
  let diagnostics = '';
  try {
    await mkdir(path.join(directory, 'assets', 'first'), { recursive: true });
    await writeFile(path.join(directory, 'assets', 'first', 'start.svg'), svg);
    child = spawn(process.execPath, [cli, 'assets/**/*.svg', '--out-dir', 'out', '--watch'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { diagnostics += chunk; });

    async function waitFor(file) {
      const until = Date.now() + 30000;
      while (Date.now() < until) {
        if (await stat(file).then(() => true, () => false)) return;
        if (child.exitCode !== null) break;
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      throw new Error(`Timed out waiting for ${file}. ${diagnostics}`);
    }

    await waitFor(path.join(directory, 'out', 'first', 'start.webp'));
    await mkdir(path.join(directory, 'assets', 'added'), { recursive: true });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await writeFile(path.join(directory, 'assets', 'added', 'later.svg'), svg);
    await waitFor(path.join(directory, 'out', 'added', 'later.webp'));
  } finally {
    if (child && child.exitCode === null) child.kill();
    if (child && child.exitCode === null) await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 1000))]);
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI converts raster inputs to multiple targets and requires an explicit JPEG background for alpha', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-formats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const png = await core.convertImage(svg, { to: 'png', width: 32 });
  await writeFile(path.join(directory, 'icon.png'), png.data);

  const multi = run(['icon.png', '--to', 'webp,avif,png', '--out-dir', 'out', '--json'], directory);
  assert.equal(multi.status, 0, multi.stderr);
  assert.deepEqual(JSON.parse(multi.stdout).map((entry) => entry.format), ['webp', 'avif', 'png']);
  for (const extension of ['webp', 'avif', 'png']) assert.ok(await stat(path.join(directory, 'out', `icon.${extension}`)));

  const unsafeJpeg = run(['icon.png', '--to', 'jpeg', '--out-dir', 'jpg'], directory);
  assert.equal(unsafeJpeg.status, 1);
  assert.match(unsafeJpeg.stderr, /cannot store transparency.*background color/i);
  const flattened = run(['icon.png', '--to', 'jpeg', '--background', '#fff', '--out-dir', 'jpg'], directory);
  assert.equal(flattened.status, 0, flattened.stderr);
  assert.ok(await stat(path.join(directory, 'jpg', 'icon.jpg')));
});

test('CLI supports clean mode, verify-clean, inspect, audit, and explain-black-bg subcommands', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-clean-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'logo.svg'), svg);

  // 1. inspect subcommand
  const inspectRes = run(['inspect', 'logo.svg', '--json'], directory);
  assert.equal(inspectRes.status, 0, inspectRes.stderr);
  const inspectData = JSON.parse(inspectRes.stdout);
  assert.equal(inspectData.format, 'svg');
  assert.equal(inspectData.hasAlpha, true);

  // 2. audit subcommand
  const auditRes = run(['audit', 'magick logo.svg logo.webp', '--json'], directory);
  assert.equal(auditRes.status, 1);
  const auditData = JSON.parse(auditRes.stdout);
  assert.equal(auditData.safe, false);
  assert.ok(auditData.issues.length > 0);

  // 3. explain-black-bg subcommand
  const explainRes = run(['explain-black-bg', '--json'], directory);
  assert.equal(explainRes.status, 0, explainRes.stderr);
  const explainData = JSON.parse(explainRes.stdout);
  assert.ok(explainData.cause);

  // 4. clean mode conversion with verify-clean and json output
  const cleanRes = run(['logo.svg', '-o', 'logo.webp', '--verify-clean', '--json'], directory);
  assert.equal(cleanRes.status, 0, cleanRes.stderr);
  const cleanEntries = JSON.parse(cleanRes.stdout);
  assert.equal(cleanEntries[0].clean, true);
  assert.equal(cleanEntries[0].certificate.verified, true);
  assert.equal(cleanEntries[0].certificate.metadataChunks, 0);

  // 5. Test zap binary alias
  const zapBin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/zap.js');
  const zapRun = spawnSync(process.execPath, [zapBin, 'explain-black-bg', '--json'], { cwd: directory, encoding: 'utf8' });
  assert.equal(zapRun.status, 0, zapRun.stderr);
});

test('CLI supports --scale multipliers, --base-width, --zip bundle, and --srcset snippet', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-scale-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'logo.svg'), svg);

  // 1. Multiplier scales with --srcset
  const scaled = run(['logo.svg', '--scale', '1,2,3', '--base-width', '64', '--srcset'], directory);
  assert.equal(scaled.status, 0, scaled.stderr);
  assert.ok(await stat(path.join(directory, 'logo.webp')));
  assert.ok(await stat(path.join(directory, 'logo@2x.webp')));
  assert.ok(await stat(path.join(directory, 'logo@3x.webp')));
  assert.match(scaled.stdout, /<img src="logo\.webp" srcset="logo\.webp 1x, logo@2x\.webp 2x, logo@3x\.webp 3x" alt="">/);

  // 2. ZIP archive bundle with manifest
  const zipped = run(['logo.svg', '--scale', '1,2', '--base-width', '48', '--zip', '--out-dir', 'export'], directory);
  assert.equal(zipped.status, 0, zipped.stderr);
  const zipPath = path.join(directory, 'export', 'zap-export.zip');
  assert.ok(await stat(zipPath));
  const zipBuffer = await readFile(zipPath);
  assert.equal(zipBuffer.subarray(0, 4).toString('ascii'), 'PK\x03\x04');
});

test('CLI supports init command and gitignore management', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-init-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  // 1. zap init
  const initRes = run(['init'], directory);
  assert.equal(initRes.status, 0, initRes.stderr);
  assert.ok(await stat(path.join(directory, '.zapwebp.config.json')));
  assert.ok(await stat(path.join(directory, '.zapwebpignore')));
  const gitignoreContent = await readFile(path.join(directory, '.gitignore'), 'utf8');
  assert.match(gitignoreContent, /# >>> zapwebp >>>/);

  // 2. zap gitignore subcommands
  const addRes = run(['gitignore', 'add', 'custom-build/'], directory);
  assert.equal(addRes.status, 0, addRes.stderr);
  const showRes = run(['gitignore', 'show'], directory);
  assert.match(showRes.stdout, /custom-build\//);

  const removeRes = run(['gitignore', 'remove', 'custom-build/'], directory);
  assert.equal(removeRes.status, 0, removeRes.stderr);
  const showAfter = run(['gitignore', 'show'], directory);
  assert.doesNotMatch(showAfter.stdout, /custom-build\//);
});

test('CLI supports reversible transaction journal: history, show, undo, redo, and gc', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-journal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'logo.svg'), svg);

  // 1. Initial conversion
  const convertRes = run(['logo.svg', '-o', 'logo.webp'], directory);
  assert.equal(convertRes.status, 0, convertRes.stderr);
  assert.ok(await stat(path.join(directory, 'logo.webp')));

  // 2. history command
  const historyRes = run(['history', '--json'], directory);
  assert.equal(historyRes.status, 0, historyRes.stderr);
  const history = JSON.parse(historyRes.stdout);
  assert.ok(history.length >= 1);
  const txId = history[0].id;

  // 3. show command
  const showRes = run(['show', txId, '--json'], directory);
  assert.equal(showRes.status, 0, showRes.stderr);
  const tx = JSON.parse(showRes.stdout);
  assert.equal(tx.id, txId);
  assert.equal(tx.operations[0].path, 'logo.webp');

  // 4. undo command
  const undoRes = run(['undo'], directory);
  assert.equal(undoRes.status, 0, undoRes.stderr);
  await assert.rejects(stat(path.join(directory, 'logo.webp')));

  // 5. redo command
  const redoRes = run(['redo'], directory);
  assert.equal(redoRes.status, 0, redoRes.stderr);
  assert.ok(await stat(path.join(directory, 'logo.webp')));

  // 6. gc command
  const gcRes = run(['gc'], directory);
  assert.equal(gcRes.status, 0, gcRes.stderr);
  assert.match(gcRes.stdout, /Garbage collected/i);
});

test('CLI enforces ignore rules, doctor diagnostics, explain, and config precedence', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-ignore-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'legacy'), { recursive: true });
  await mkdir(path.join(directory, 'active'), { recursive: true });
  await writeFile(path.join(directory, 'legacy', 'old.svg'), svg);
  await writeFile(path.join(directory, 'active', 'new.svg'), svg);
  await writeFile(path.join(directory, '.zapwebpignore'), 'legacy/**\n');

  // 1. explain command
  const explainIgnored = run(['explain', 'legacy/old.svg', '--json'], directory);
  assert.equal(explainIgnored.status, 0, explainIgnored.stderr);
  const expIgnData = JSON.parse(explainIgnored.stdout);
  assert.equal(expIgnData.inScope, false);
  assert.equal(expIgnData.reason, 'ignored');

  const explainActive = run(['explain', 'active/new.svg', '--json'], directory);
  assert.equal(explainActive.status, 0, explainActive.stderr);
  const expActData = JSON.parse(explainActive.stdout);
  assert.equal(expActData.inScope, true);

  // 2. ignored subcommand
  const ignoredRes = run(['ignored', '.', '--json'], directory);
  assert.equal(ignoredRes.status, 0, ignoredRes.stderr);
  const ignoredList = JSON.parse(ignoredRes.stdout);
  assert.ok(ignoredList.some((item) => item.path.includes('old.svg')));

  // 3. doctor subcommand
  const doctorRes = run(['doctor'], directory);
  assert.equal(doctorRes.status, 0, doctorRes.stderr);
  assert.match(doctorRes.stdout, /Zap Health Diagnostics/i);

  // 4. config show subcommand
  const configRes = run(['config', 'show', '--json'], directory);
  assert.equal(configRes.status, 0, configRes.stderr);
  const configData = JSON.parse(configRes.stdout);
  assert.ok(configData.options);
  assert.ok(configData.origins);
  assert.equal(configData.origins.format, 'default');
});

test('CLI supports --list, --files list, and --here directory targeting', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-list-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'src'), { recursive: true });
  await writeFile(path.join(directory, 'src', 'a.svg'), svg);
  await writeFile(path.join(directory, 'src', 'b.svg'), svg);

  // 1. --list flag prints candidate files table without converting
  const listRes = run(['src/**/*.svg', '--list', '--json'], directory);
  assert.equal(listRes.status, 0, listRes.stderr);
  const listData = JSON.parse(listRes.stdout);
  assert.equal(listData.count, 2);

  // 2. --files <fileListPath>
  const fileListPath = path.join(directory, 'files-to-convert.txt');
  await writeFile(fileListPath, 'src/a.svg\nsrc/b.svg\n');
  const filesRes = run(['--files', 'files-to-convert.txt', '--out-dir', 'out', '--json'], directory);
  assert.equal(filesRes.status, 0, filesRes.stderr);
  assert.ok(await stat(path.join(directory, 'out', 'a.webp')));
  assert.ok(await stat(path.join(directory, 'out', 'b.webp')));

  // 3. --here converts current working directory directly
  const hereRes = run(['--here', '--out-dir', 'here-out', '--json'], path.join(directory, 'src'));
  assert.equal(hereRes.status, 0, hereRes.stderr);
  assert.ok(await stat(path.join(directory, 'src', 'here-out', 'a.webp')));
});

test('CLI supports --lock-target, --strict, and --override-lock', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-lock-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'src'), { recursive: true });
  await writeFile(path.join(directory, 'src', 'logo.svg'), svg);

  // 1. --lock-target forces output format even if --to is requested
  const lockRes = run(['src/logo.svg', '--lock-target', 'avif', '--to', 'png', '--out-dir', 'out', '--json'], directory);
  assert.equal(lockRes.status, 0, lockRes.stderr);
  assert.ok(await stat(path.join(directory, 'out', 'logo.avif')));

  // 2. --override-lock allows user to override the lock
  const overrideRes = run(['src/logo.svg', '--lock-target', 'avif', '--override-lock', '--to', 'webp', '--out-dir', 'out-override', '--json'], directory);
  assert.equal(overrideRes.status, 0, overrideRes.stderr);
  assert.ok(await stat(path.join(directory, 'out-override', 'logo.webp')));

  // 3. Strict mode (default when locked) fails on unconvertible input with E_UNSUPPORTED_FORMAT
  await writeFile(path.join(directory, 'src', 'corrupt.svg'), 'BAD_SVG_FILE_DATA_CORRUPT');
  const strictRes = run(['src/corrupt.svg', '--lock-target', 'webp', '--strict'], directory);
  assert.equal(strictRes.status, 1);
  assert.match(strictRes.stderr, /E_UNSUPPORTED_FORMAT/);
});

test('CLI supports smart ingestion: --same-format, --size-mode, and byte bounds', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-ingest-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, 'src'), { recursive: true });
  await writeFile(path.join(directory, 'src', 'vector.svg'), svg);

  // 1. Convert SVG to WebP first
  const prepRes = run(['src/vector.svg', '--to', 'webp', '--out-dir', 'src', '--json'], directory);
  assert.equal(prepRes.status, 0, prepRes.stderr);
  assert.ok(await stat(path.join(directory, 'src', 'vector.webp')));

  // 2. Same format pass-through: WebP input to WebP target with --same-format passthrough
  const passRes = run(['src/vector.webp', '--to', 'webp', '--same-format', 'passthrough', '--out-dir', 'out-pass', '--json'], directory);
  assert.equal(passRes.status, 0, passRes.stderr);
  const passData = JSON.parse(passRes.stdout);
  assert.equal(passData[0].passedThrough, true);
  assert.equal(passData[0].status, 'passed_through');
  assert.equal(passData[0].format, 'webp');

  // 3. Same format rejection: --same-format reject throws E_SAME_FORMAT_REJECTED
  const rejectRes = run(['src/vector.webp', '--to', 'webp', '--same-format', 'reject', '--out-dir', 'out-reject'], directory);
  assert.equal(rejectRes.status, 1);
  assert.match(rejectRes.stderr, /E_SAME_FORMAT_REJECTED/);

  // 4. Min input bytes bounds: --min-input rejects undersized files
  const minRes = run(['src/vector.webp', '--to', 'png', '--min-input', '500KB', '--out-dir', 'out-min'], directory);
  assert.equal(minRes.status, 1);
  assert.match(minRes.stderr, /E_INPUT_TOO_SMALL/);
});


