'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { convertImage } = require('@zapwebp/core');
const {
  inspectCommand,
  compareCommand,
  alphaCommand,
  diffCommand,
  reportCommand,
} = require('../src');

test('Lens: inspect, compare, alpha, diff, and report execute in read-only mode', async () => {
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

    // 4. Diff
    const diffRes = await diffCommand(svgPath, webpPath, { json: false });
    assert.ok(diffRes.chunksB.includes('RIFF'));

    // 5. Report
    const reportRes = await reportCommand([svgPath, webpPath], { json: false });
    assert.equal(reportRes.totalFiles, 2);

    // INVARIANT ASSERTION: Neither file was modified
    const mtimeSvgAfter = (await fs.stat(svgPath)).mtimeMs;
    const mtimeWebpAfter = (await fs.stat(webpPath)).mtimeMs;
    assert.equal(mtimeSvgBefore, mtimeSvgAfter, 'Source file mtime must remain unchanged');
    assert.equal(mtimeWebpBefore, mtimeWebpAfter, 'Target file mtime must remain unchanged');

    // Invariant: no new files created in tmpDir
    const filesInDir = await fs.readdir(tmpDir);
    assert.deepEqual(filesInDir.sort(), ['test.svg', 'test.webp']);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
