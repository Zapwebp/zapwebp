'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getMock, resetMock } = require('./mock-vscode');
const vscode = require('vscode');

const { registerZapCommand } = require('../src/commands/zap');
const { registerFolderCommands } = require('../src/commands/folder');
const { registerHoverProvider } = require('../src/hover/provider');

const FIXTURES_DIR = path.resolve(__dirname, '../../../test/fixtures');

test.beforeEach(() => {
  resetMock();
});

test('VS Code Real-World: converts real Tabler SVG icon to WebP', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  assert.ok(typeof zapHandler === 'function');

  const sourceFile = path.join(FIXTURES_DIR, 'svg/tabler-home.svg');
  const svgBytes = fs.readFileSync(sourceFile);

  const vPath = '/workspace/icons/tabler-home.svg';
  const outPath = '/workspace/icons/tabler-home.webp';
  mock._virtualFs.set(vPath, svgBytes);

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.target === 'webp');
  };

  const uri = vscode.Uri.file(vPath);
  await zapHandler(uri);

  const outBytes = mock._virtualFs.get(outPath);
  assert.ok(outBytes, 'tabler-home.webp must be written to workspace');
  assert.ok(outBytes.byteLength > 0, 'Output WebP must not be empty');

  // Verify WebP RIFF container
  assert.equal(Buffer.from(outBytes.buffer, outBytes.byteOffset, 4).toString('ascii'), 'RIFF');
  assert.equal(Buffer.from(outBytes.buffer, outBytes.byteOffset + 8, 4).toString('ascii'), 'WEBP');
});

test('VS Code Real-World: converts real Material Icon PNG to WebP', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const sourceFile = path.join(FIXTURES_DIR, 'png/material-icon-512.png');
  const pngBytes = fs.readFileSync(sourceFile);

  const vPath = '/workspace/icons/material-icon-512.png';
  const outPath = '/workspace/icons/material-icon-512.webp';
  mock._virtualFs.set(vPath, pngBytes);

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.target === 'webp');
  };

  const uri = vscode.Uri.file(vPath);
  await zapHandler(uri);

  const outBytes = mock._virtualFs.get(outPath);
  assert.ok(outBytes, 'material-icon-512.webp must exist');
  assert.ok(outBytes.byteLength > 0);
  assert.equal(Buffer.from(outBytes.buffer, outBytes.byteOffset, 4).toString('ascii'), 'RIFF');
});

test('VS Code Real-World: converts Unsplash JPEG photo with quality settings', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const sourceFile = path.join(FIXTURES_DIR, 'jpg/unsplash-thumb.jpg');
  const jpgBytes = fs.readFileSync(sourceFile);

  const vPath = '/workspace/photos/thumb.jpg';
  const outPath = '/workspace/photos/thumb.webp';
  mock._virtualFs.set(vPath, jpgBytes);

  mock._config['quality'] = 90;
  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.target === 'webp');
  };

  const uri = vscode.Uri.file(vPath);
  await zapHandler(uri);

  const outBytes = mock._virtualFs.get(outPath);
  assert.ok(outBytes, 'thumb.webp must exist');
  assert.ok(outBytes.byteLength > 0);
});

test('VS Code Real-World: batch converts folder of real SVGs', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerFolderCommands(context);

  const zapFolderHandler = mock._registeredCommands.get('zapwebp.zapFolder');
  assert.ok(typeof zapFolderHandler === 'function');

  const folderPath = '/workspace/icons';
  const homeSvg = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/tabler-home.svg'));
  const menuSvg = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/lucide-menu.svg'));
  const ghSvg = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/simple-icons-github.svg'));

  mock._virtualFs.set(`${folderPath}/home.svg`, homeSvg);
  mock._virtualFs.set(`${folderPath}/menu.svg`, menuSvg);
  mock._virtualFs.set(`${folderPath}/github.svg`, ghSvg);

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.format === 'webp');
  };

  const folderUri = vscode.Uri.file(folderPath);
  await zapFolderHandler(folderUri);

  assert.ok(mock._virtualFs.get(`${folderPath}/home.webp`), 'home.webp should be created');
  assert.ok(mock._virtualFs.get(`${folderPath}/menu.webp`), 'menu.webp should be created');
  assert.ok(mock._virtualFs.get(`${folderPath}/github.webp`), 'github.webp should be created');
});

test('VS Code Real-World: blocks malicious SVG containing active script injection', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const sourcePath = path.join(FIXTURES_DIR, 'edge-cases/script-injection.svg');
  const maliciousBytes = fs.readFileSync(sourcePath);

  const vPath = '/workspace/malicious.svg';
  mock._virtualFs.set(vPath, maliciousBytes);

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.target === 'webp');
  };

  const uri = vscode.Uri.file(vPath);
  await zapHandler(uri);

  assert.ok(
    mock._errorMessages.some(
      (m) => m.includes('E_UNSAFE_SVG') || m.includes('script') || m.includes('unsafe')
    ),
    'Should display an error notification for unsafe SVG'
  );

  assert.equal(mock._virtualFs.has('/workspace/malicious.webp'), false);
});

test('VS Code Real-World: rejects empty 0-byte SVG', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const vPath = '/workspace/empty.svg';
  mock._virtualFs.set(vPath, Buffer.alloc(0));

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.target === 'webp');
  };

  const uri = vscode.Uri.file(vPath);
  await zapHandler(uri);

  assert.ok(
    mock._errorMessages.some(
      (m) => m.includes('E_EMPTY_FILE') || m.includes('empty') || m.includes('0 bytes')
    ),
    'Should display error notification for empty file'
  );
});

test('VS Code Real-World: hover preview displays dimensions and image details', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerHoverProvider(context);

  assert.ok(mock._hoverProvider, 'Hover provider should be registered');
  const { provider } = mock._hoverProvider;

  const sourceFile = path.join(FIXTURES_DIR, 'svg/tabler-home.svg');
  const svgBytes = fs.readFileSync(sourceFile);
  const vPath = '/workspace/tabler-home.svg';
  mock._virtualFs.set(vPath, svgBytes);

  const document = {
    uri: vscode.Uri.file(vPath),
    getText: () => svgBytes.toString('utf8'),
    fileName: 'tabler-home.svg',
  };

  const hover = await provider.provideHover(document, new vscode.Position(0, 0));
  assert.ok(hover, 'Hover should be returned for SVG');
  assert.ok(hover.contents, 'Hover should have markdown content');
  assert.ok(hover.contents.value.includes('Zapwebp preview'), 'Hover should include Zapwebp preview header');
});
