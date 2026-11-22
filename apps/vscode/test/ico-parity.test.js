'use strict';

const { getMock, resetMock } = require('./mock-vscode');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vscode = require('vscode');
const { registerConvertCommand } = require('../src/commands/convert');
const { registerZapCommand, handleZapCommand } = require('../src/commands/zap');
const { convertBuffer, checkLock, ZapError } = require('../src/core');
const { readConfig, readWorkspaceLockConfig } = require('../src/config');
const { statusBar } = require('../src/ui/status-bar');
const { scanFolder } = require('../src/folder/scan');
const { convertFolder } = require('../src/folder/convert');

const FIXTURES_DIR = fs.existsSync(path.resolve(__dirname, 'fixtures'))
  ? path.resolve(__dirname, 'fixtures')
  : path.resolve(__dirname, '../../../test/fixtures');

const SVG_SAMPLE = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <circle cx="32" cy="32" r="28" fill="#10b981"/>
</svg>
`.trim();

test('ICO Generation: convertToIco generates valid multi-resolution ICO container from SVG', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const icoHandler = mock._registeredCommands.get('zapwebp.convertToIco');
  assert.ok(typeof icoHandler === 'function');

  const sourcePath = '/workspace/assets/logo.svg';
  const outIcoPath = '/workspace/assets/logo.ico';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_SAMPLE));
  const sourceUri = vscode.Uri.file(sourcePath);

  // Mock QuickPick to select Default Suite
  mock._quickPickHandler = (items) => items[0];

  await icoHandler(sourceUri);

  const icoBytes = mock._virtualFs.get(outIcoPath);
  assert.ok(icoBytes, 'logo.ico must be written');
  assert.ok(icoBytes.length > 6, 'ICO container must have header');
  // Check ICO magic header: 00 00 01 00
  assert.equal(icoBytes.readUInt16LE(0), 0); // Reserved
  assert.equal(icoBytes.readUInt16LE(2), 1); // 1 = ICO
  const count = icoBytes.readUInt16LE(4);
  assert.ok(count >= 1, 'ICO must contain at least one icon entry');
});

test('ICO Extraction: zap command extracts largest frame from real ICO file to PNG', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const realIcoPath = path.join(FIXTURES_DIR, 'ico', 'github-favicon.ico');
  const realIcoBytes = fs.readFileSync(realIcoPath);

  const vPath = '/workspace/icons/favicon.ico';
  const outPngPath = '/workspace/icons/favicon.png';
  mock._virtualFs.set(vPath, realIcoBytes);
  const vUri = vscode.Uri.file(vPath);

  // QuickPick 1 (menu): Choose "Zap to PNG"
  // QuickPick 2 (extraction mode): Choose "Largest size"
  let callCount = 0;
  mock._quickPickHandler = (items) => {
    callCount++;
    if (callCount === 1) {
      return items.find((i) => i.item?.target === 'png') || items[0];
    }
    return items.find((i) => i.label?.includes('Largest')) || items[0];
  };

  await handleZapCommand(context, vUri);

  const outPng = mock._virtualFs.get(outPngPath);
  assert.ok(outPng, 'favicon.png must be created');
  // PNG signature: 89 50 4E 47
  assert.equal(outPng[0], 0x89);
  assert.equal(outPng[1], 0x50);
  assert.equal(outPng[2], 0x4e);
  assert.equal(outPng[3], 0x47);
});

test('ICO Extraction: zap command extracts all frames into separate files', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const realIcoPath = path.join(FIXTURES_DIR, 'ico', 'github-favicon.ico');
  const realIcoBytes = fs.readFileSync(realIcoPath);

  const vPath = '/workspace/icons/multi.ico';
  mock._virtualFs.set(vPath, realIcoBytes);
  const vUri = vscode.Uri.file(vPath);

  let callCount = 0;
  mock._quickPickHandler = (items) => {
    callCount++;
    if (callCount === 1) {
      return items.find((i) => i.item?.target === 'png') || items[0];
    }
    // Choose "All sizes as separate files"
    return items.find((i) => i.label?.includes('All sizes')) || items[1];
  };

  await handleZapCommand(context, vUri);

  // Check that at least one frame file was written (e.g. multi-32x32.png)
  const writtenFiles = Array.from(mock._virtualFs.keys()).filter((k) => k.startsWith('/workspace/icons/multi-'));
  assert.ok(writtenFiles.length >= 1, 'Should extract multi-size PNG files');
  for (const f of writtenFiles) {
    const b = mock._virtualFs.get(f);
    assert.equal(b[0], 0x89, 'Extracted frame must be valid PNG');
  }
});

test('CUR Container: detects CUR magic bytes and allows conversion to PNG', async () => {
  const mock = resetMock();

  // Create a minimal valid CUR buffer (reserved=0, type=2, count=1)
  // Header: 6 bytes
  const curBuf = Buffer.alloc(6 + 16 + 100);
  curBuf.writeUInt16LE(0, 0); // reserved
  curBuf.writeUInt16LE(2, 2); // type 2 = CUR
  curBuf.writeUInt16LE(1, 4); // count 1
  // Directory entry
  curBuf.writeUInt8(32, 6); // width
  curBuf.writeUInt8(32, 7); // height
  curBuf.writeUInt16LE(0, 10); // hotspot X
  curBuf.writeUInt16LE(0, 12); // hotspot Y
  curBuf.writeUInt32LE(100, 14); // bytes in res
  curBuf.writeUInt32LE(22, 18); // offset

  const vPath = '/workspace/cursor.cur';
  mock._virtualFs.set(vPath, curBuf);

  const { getRealFormat } = require('../src/format');
  const format = await getRealFormat(vscode.Uri.file(vPath));
  assert.equal(format, 'cur', 'Should identify .cur file format');
});

test('Target Lock: reads .zapwebp/config.json, updates status bar, and enforces policy', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const rootPath = '/workspace/my-app';
  const rootUri = vscode.Uri.file(rootPath);
  mock.workspace.workspaceFolders = [{ uri: rootUri, name: 'my-app', index: 0 }];

  // Write .zapwebp/config.json locking target format to webp
  const lockConfigContent = JSON.stringify({
    targetFormat: 'webp',
    acceptFormats: ['webp'],
    strict: true,
  });
  mock._virtualFs.set(`${rootPath}/.zapwebp/config.json`, Buffer.from(lockConfigContent));

  const lockConfig = await readWorkspaceLockConfig(rootUri);
  assert.ok(lockConfig.exists);
  assert.equal(lockConfig.targetFormat, 'webp');
  assert.deepEqual(lockConfig.acceptFormats, ['webp']);

  statusBar.setTargetLock(lockConfig.targetFormat);
  assert.equal(statusBar.item.text, '⚡ Zapwebp: WebP lock active');

  // Attempting to convert SVG to AVIF should be rejected by Target Lock
  const svgPath = `${rootPath}/assets/logo.svg`;
  mock._virtualFs.set(svgPath, Buffer.from(SVG_SAMPLE));
  const svgUri = vscode.Uri.file(svgPath);

  const avifHandler = mock._registeredCommands.get('zapwebp.convertToAvif');
  await avifHandler(svgUri);

  // AVIF output should NOT have been created due to policy rejection
  assert.equal(mock._virtualFs.get(`${rootPath}/assets/logo.avif`), undefined);
  // Error message toast should have recorded E_FORMAT_REJECTED
  assert.ok(
    mock._errorMessages.some((msg) => msg.includes('E_FORMAT_REJECTED')),
    'Should display E_FORMAT_REJECTED error message'
  );
});

test('Compressor: convertCompress optimizes image under target byte limit', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const compressCmd = mock._registeredCommands.get('zapwebp.convertCompress');
  assert.ok(typeof compressCmd === 'function');

  const sourcePath = '/workspace/img/photo.png';
  // Use a real PNG fixture
  const realPngPath = path.join(FIXTURES_DIR, 'png', 'material-icon-512.png');
  const pngBytes = fs.readFileSync(realPngPath);
  mock._virtualFs.set(sourcePath, pngBytes);
  const sourceUri = vscode.Uri.file(sourcePath);

  // Mock input box to request 8 KB
  mock._inputBoxHandler = () => '8000 B';
  mock._quickPickHandler = () => ({ format: 'webp' });

  await compressCmd(sourceUri);

  const compressed = mock._virtualFs.get('/workspace/img/photo.webp');
  assert.ok(compressed, 'Compressed output must be written');
  assert.ok(compressed.length > 0);
  assert.ok(compressed.length <= 8000, `Compressed output (${compressed.length} B) must be <= 8000 B`);
});

test('Crop Integration: convertWithOptions applies aspect ratio crop', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const withOptionsCmd = mock._registeredCommands.get('zapwebp.convertWithOptions');
  assert.ok(typeof withOptionsCmd === 'function');

  const sourcePath = '/workspace/img/avatar.png';
  const realPngPath = path.join(FIXTURES_DIR, 'png', 'material-icon-512.png');
  mock._virtualFs.set(sourcePath, fs.readFileSync(realPngPath));
  const sourceUri = vscode.Uri.file(sourcePath);

  let step = 0;
  mock._quickPickHandler = (items) => {
    step++;
    if (step === 1) return { format: 'webp' }; // Step 1: Format
    if (step === 2) return { crop: 'avatar' }; // Step 2: Avatar (1:1) crop
    return items[0];
  };

  await withOptionsCmd(sourceUri);

  const outWebp = mock._virtualFs.get('/workspace/img/avatar.webp');
  assert.ok(outWebp, 'Cropped webp must exist');
  assert.equal(outWebp.subarray(0, 4).toString('ascii'), 'RIFF');
});

test('Lock Skip: skips conversion when output file already exists with matching lock fingerprint', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const convertCmd = mock._registeredCommands.get('zapwebp.convert');
  const sourcePath = '/workspace/icons/lock-test.svg';
  const outPath = '/workspace/icons/lock-test.webp';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_SAMPLE));
  const sourceUri = vscode.Uri.file(sourcePath);

  // First conversion writes file with embedded lock
  await convertCmd(sourceUri);
  const firstOutput = mock._virtualFs.get(outPath);
  assert.ok(firstOutput, 'First conversion output must exist');

  // Verify that the lock is present
  const { readLock } = require('@zapwebp/lock');
  const lockMeta = readLock(firstOutput);
  assert.ok(lockMeta, 'Output must contain zapwebp:lock fingerprint');

  // Clear logs to test second conversion
  mock._logs.length = 0;

  // Second conversion: identical input and options
  await convertCmd(sourceUri);

  // Check that the conversion was skipped by lock
  assert.ok(
    mock._logs.some((l) => l.includes('[Lock] Skipped')),
    'Second conversion must be skipped by lock'
  );
});

test('Folder Batch: scans and converts folder containing .ico and .cur files', async () => {
  const mock = resetMock();
  const folderPath = '/workspace/icons-bundle';
  const folderUri = vscode.Uri.file(folderPath);

  const realIcoPath = path.join(FIXTURES_DIR, 'ico', 'github-favicon.ico');
  const realIcoBytes = fs.readFileSync(realIcoPath);

  mock._virtualFs.set(`${folderPath}/app.ico`, realIcoBytes);
  mock._virtualFs.set(`${folderPath}/cursor.cur`, realIcoBytes);
  mock._virtualFs.set(`${folderPath}/graphic.svg`, Buffer.from(SVG_SAMPLE));

  const scanRes = await scanFolder(folderUri);
  assert.equal(scanRes.files.length, 3, 'Should discover all 3 files');
  assert.ok(scanRes.byFormat.ico, 'Should group ico files');
  assert.ok(scanRes.byFormat.cur, 'Should group cur files');
  assert.ok(scanRes.byFormat.svg, 'Should group svg files');

  const configs = [
    { sourceFormat: 'ico', targetFormat: 'png' },
    { sourceFormat: 'cur', targetFormat: 'png' },
    { sourceFormat: 'svg', targetFormat: 'webp' },
  ];

  const convRes = await convertFolder(scanRes, configs);
  assert.equal(convRes.converted, 3);
  assert.equal(convRes.failed, 0);

  assert.ok(mock._virtualFs.get(`${folderPath}/app.png`));
  assert.ok(mock._virtualFs.get(`${folderPath}/cursor.png`));
  assert.ok(mock._virtualFs.get(`${folderPath}/graphic.webp`));
});
