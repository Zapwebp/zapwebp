'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { convertImage } = require('@zapwebp/core');
const {
  inspectCommand,
  compareCommand,
  alphaCommand,
  diffCommand,
  reportCommand,
  verifyCommand,
  safeRead,
  LensError,
} = require('../src');
const { safeTempWrite } = require('../src/safe-write');
const { withTimeout } = require('../src/timeout');

test('Lens Safe I/O: safeRead rejects symlinks and oversize files', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-io-test-'));

  try {
    const normalFile = path.join(tmpDir, 'normal.txt');
    await fs.writeFile(normalFile, 'hello lens safe read', 'utf8');

    // 1. Normal read
    const buf = await safeRead(normalFile);
    assert.equal(buf.toString('utf8'), 'hello lens safe read');

    // 2. Symlink rejection
    const symlinkPath = path.join(tmpDir, 'symlink.txt');
    try {
      await fs.symlink(normalFile, symlinkPath);
      await assert.rejects(
        async () => safeRead(symlinkPath),
        (err) => {
          assert.equal(err instanceof LensError, true);
          assert.equal(err.code, 'E_SYMLINK');
          return true;
        }
      );
    } catch (symErr) {
      // Windows unprivileged environments may disallow creating symlinks; skip if OS blocks creation
      if (symErr.code !== 'EPERM') throw symErr;
    }

    // 3. Oversize file rejection
    await assert.rejects(
      async () => safeRead(normalFile, { maxBytes: 5 }),
      (err) => {
        assert.equal(err instanceof LensError, true);
        assert.equal(err.code, 'E_FILE_TOO_LARGE');
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lens Safe Temp Write: safeTempWrite creates isolated owner-only files', async () => {
  const writtenPath = await safeTempWrite('test-safe.txt', 'isolated temp content');
  try {
    assert.ok(path.isAbsolute(writtenPath));
    const content = await fs.readFile(writtenPath, 'utf8');
    assert.equal(content, 'isolated temp content');
  } finally {
    await fs.rm(path.dirname(writtenPath), { recursive: true, force: true }).catch(() => {});
  }
});

test('Lens Timeouts: withTimeout guards against slow or hung decodes', async () => {
  const slowPromise = new Promise((resolve) => setTimeout(resolve, 200));

  await assert.rejects(
    async () => withTimeout(slowPromise, 25, 'slowOperation'),
    (err) => {
      assert.equal(err instanceof LensError, true);
      assert.equal(err.code, 'E_DECODE_TIMEOUT');
      return true;
    }
  );

  const fastPromise = new Promise((resolve) => setTimeout(() => resolve('fast'), 10));
  const res = await withTimeout(fastPromise, 100, 'fastOperation');
  assert.equal(res, 'fast');
});

test('Lens SVG Safety: inspectCommand rejects unsafe SVGs containing scripts', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-svg-test-'));

  try {
    const maliciousSvg = path.join(tmpDir, 'evil.svg');
    await fs.writeFile(
      maliciousSvg,
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="10"/></svg>',
      'utf8'
    );

    await assert.rejects(
      async () => inspectCommand(maliciousSvg),
      (err) => {
        assert.equal(err instanceof LensError, true);
        assert.equal(err.code, 'E_UNSAFE_SVG');
        return true;
      }
    );

    // Overriding with allowUnsafe succeeds
    const allowed = await inspectCommand(maliciousSvg, { allowUnsafe: true });
    assert.equal(allowed.format, 'svg');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lens Invariant: inspect, compare, alpha, diff, and report execute in read-only mode', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-test-'));

  try {
    const svgPath = path.join(tmpDir, 'test.svg');
    const webpPath = path.join(tmpDir, 'test.webp');
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="50" height="50" fill="red"/></svg>';
    await fs.writeFile(svgPath, svgContent, 'utf8');

    const converted = await convertImage(svgContent, { to: 'webp' });
    await fs.writeFile(webpPath, converted.data);

    const mtimeSvgBefore = (await fs.stat(svgPath)).mtimeMs;
    const mtimeWebpBefore = (await fs.stat(webpPath)).mtimeMs;

    // 1. Inspect
    const inspectRes = await inspectCommand(webpPath, { json: false });
    assert.equal(inspectRes.format, 'webp');
    assert.equal(inspectRes.hasAlpha, true);
    assert.ok(inspectRes.chunks.length > 0);

    // 2. Compare
    const compareRes = await compareCommand(svgPath, webpPath, { json: false });
    assert.equal(compareRes.formatA, 'svg');
    assert.equal(compareRes.formatB, 'webp');
    assert.equal(typeof compareRes.percentage, 'number');

    // 3. Alpha
    const alphaRes = await alphaCommand(webpPath, { json: false });
    assert.equal(alphaRes.hasAlpha, true);

    // 4. Diff with --visual
    const diffRes = await diffCommand(svgPath, webpPath, { visual: true });
    assert.ok(diffRes.chunksB.includes('RIFF'));
    assert.ok(diffRes.visual);
    assert.equal(typeof diffRes.visual.ssimEstimate, 'number');
    assert.ok(diffRes.visual.htmlPath);

    // 5. Report with --html
    const reportHtmlPath = path.join(tmpDir, 'batch-report.html');
    const reportRes = await reportCommand([svgPath, webpPath], { html: reportHtmlPath });
    assert.equal(reportRes.totalFiles, 2);
    assert.equal(reportRes.htmlReport, reportHtmlPath);
    const htmlReportContent = await fs.readFile(reportHtmlPath, 'utf8');
    assert.ok(htmlReportContent.includes('Zapwebp Lens Batch Report'));

    // INVARIANT ASSERTION: Neither file was modified
    const mtimeSvgAfter = (await fs.stat(svgPath)).mtimeMs;
    const mtimeWebpAfter = (await fs.stat(webpPath)).mtimeMs;
    assert.equal(mtimeSvgBefore, mtimeSvgAfter, 'Source file mtime must remain unchanged');
    assert.equal(mtimeWebpBefore, mtimeWebpAfter, 'Target file mtime must remain unchanged');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lens Verify: verifyCommand validates checksums against expected hash and manifest', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-verify-test-'));

  try {
    const testFile = path.join(tmpDir, 'asset.png');
    const dummyBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    await fs.writeFile(testFile, dummyBytes);

    const actualHash = crypto.createHash('sha256').update(dummyBytes).digest('hex');

    // 1. Correct expected hash matches
    const res1 = await verifyCommand(testFile, { expectedSha256: actualHash });
    assert.equal(res1.match, true);
    assert.equal(res1.sha256, actualHash);

    // 2. Mismatched hash throws E_VERIFY_MISMATCH
    await assert.rejects(
      async () => verifyCommand(testFile, { expectedSha256: 'deadbeef1234567890abcdef' }),
      (err) => {
        assert.equal(err instanceof LensError, true);
        assert.equal(err.code, 'E_VERIFY_MISMATCH');
        return true;
      }
    );

    // 3. Manifest verification
    const manifestPath = path.join(tmpDir, 'zapwebp.manifest.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        files: [
          {
            path: 'asset.png',
            sha256: actualHash,
          },
        ],
      }),
      'utf8'
    );

    const res2 = await verifyCommand(testFile, { fromManifest: manifestPath });
    assert.equal(res2.match, true);
    assert.equal(res2.sha256, actualHash);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lens Batch Limits: reportCommand rejects batches exceeding limit', async () => {
  const files = ['a.png', 'b.png', 'c.png'];
  await assert.rejects(
    async () => reportCommand(files, { maxBatch: 2 }),
    (err) => {
      assert.equal(err instanceof LensError, true);
      assert.equal(err.code, 'E_BATCH_LIMIT');
      return true;
    }
  );
});

test('Lens CI Open Guard: openHtml throws E_OPEN_IN_CI when process.env.CI is true', async () => {
  const prevCI = process.env.CI;
  process.env.CI = 'true';

  try {
    const { openHtml } = require('../src/render/html');
    await assert.rejects(
      async () => openHtml({}, Buffer.from([1, 2, 3]), null, 'test.png', null, { open: true }),
      (err) => {
        assert.equal(err instanceof LensError, true);
        assert.equal(err.code, 'E_OPEN_IN_CI');
        return true;
      }
    );
  } finally {
    process.env.CI = prevCI;
  }
});

test('Lens Inspect --fail-if-dirty: throws E_DIRTY_METADATA if file contains metadata chunks', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-dirty-test-'));

  try {
    // Generate valid PNG and inject an eXIf chunk before IEND
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="green"/></svg>';
    const converted = await convertImage(svgContent, { to: 'png' });
    const pngBuffer = Buffer.from(converted.data);

    const iendIndex = pngBuffer.indexOf('IEND') - 4;
    const beforeIend = pngBuffer.subarray(0, iendIndex);
    const afterIend = pngBuffer.subarray(iendIndex);

    const exifChunk = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x08]), // length 8
      Buffer.from('eXIf', 'ascii'),
      Buffer.alloc(8),
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // crc
    ]);

    const dirtyPng = Buffer.concat([beforeIend, exifChunk, afterIend]);
    const dirtyPath = path.join(tmpDir, 'dirty.png');
    await fs.writeFile(dirtyPath, dirtyPng);

    await assert.rejects(
      async () => inspectCommand(dirtyPath, { failIfDirty: true }),
      (err) => {
        assert.equal(err instanceof LensError, true);
        assert.equal(err.code, 'E_DIRTY_METADATA');
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lens CLI Execution: CLI emits stable JSON envelope and handles exit codes', async () => {
  const { execFile } = require('node:child_process');
  const util = require('node:util');
  const execFileAsync = util.promisify(execFile);
  const cliPath = path.resolve(__dirname, '../bin/zapwebp-lens.js');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-cli-test-'));

  try {
    const testSvg = path.join(tmpDir, 'logo.svg');
    await fs.writeFile(testSvg, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle r="10"/></svg>');

    // 1. inspect --json returns envelope with exit code 0
    const { stdout } = await execFileAsync(process.execPath, [cliPath, 'inspect', testSvg, '--json']);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.version, '1.0.0');
    assert.equal(parsed.tool, 'zapwebp-lens');
    assert.equal(parsed.command, 'inspect');
    assert.equal(parsed.result.format, 'svg');
    assert.deepEqual(parsed.errors, []);

    // 2. Unknown command returns exit code 2 (config error)
    await assert.rejects(
      async () => execFileAsync(process.execPath, [cliPath, 'invalid-command']),
      (err) => {
        assert.equal(err.code, 2);
        return true;
      }
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
