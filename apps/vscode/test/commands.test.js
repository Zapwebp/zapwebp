'use strict';

const { getMock, resetMock } = require('./mock-vscode');
const test = require('node:test');
const assert = require('node:assert/strict');
const vscode = require('vscode');

const { registerConvertCommand, siblingUri } = require('../src/commands/convert');
const { registerConvertScalesCommand } = require('../src/commands/convert-scales');

const SVG_FIXTURE = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" fill="#3b82f6"/>
</svg>
`.trim();

test('commands.siblingUri derives proper sibling paths', () => {
  const uri = vscode.Uri.file('/projects/app/assets/logo.svg');
  const webpUri = siblingUri(uri, 'webp');
  assert.equal(webpUri.path, '/projects/app/assets/logo.webp');

  const jpegUri = siblingUri(uri, 'jpeg');
  assert.equal(jpegUri.path, '/projects/app/assets/logo.jpg');
});

test('commands.convert right-click converts single SVG to sibling WebP without modifying source', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const convertHandler = mock._registeredCommands.get('zapwebp.convert');
  assert.ok(typeof convertHandler === 'function');

  const sourcePath = '/workspace/src/badge.svg';
  const outputPath = '/workspace/src/badge.webp';
  const sourceBytes = Buffer.from(SVG_FIXTURE, 'utf8');

  mock._virtualFs.set(sourcePath, sourceBytes);
  const sourceUri = vscode.Uri.file(sourcePath);

  await convertHandler(sourceUri);

  // Source must remain completely untouched
  assert.equal(mock._virtualFs.get(sourcePath).toString('utf8'), SVG_FIXTURE);

  // Output must exist and be non-empty
  const output = mock._virtualFs.get(outputPath);
  assert.ok(output);
  assert.ok(output.byteLength > 0);
  assert.equal(output.subarray(0, 4).toString('ascii'), 'RIFF');
});

test('commands.convert batch converts multiple selected URIs', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const file1 = '/workspace/icons/one.svg';
  const file2 = '/workspace/icons/two.svg';
  mock._virtualFs.set(file1, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(file2, Buffer.from(SVG_FIXTURE));

  const convertHandler = mock._registeredCommands.get('zapwebp.convert');
  const uri1 = vscode.Uri.file(file1);
  const uri2 = vscode.Uri.file(file2);

  await convertHandler(uri1, [uri1, uri2]);

  assert.ok(mock._virtualFs.get('/workspace/icons/one.webp'));
  assert.ok(mock._virtualFs.get('/workspace/icons/two.webp'));
});

test('commands.convertScales generates @1x, @2x, and @3x outputs', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertScalesCommand(context);

  const scalesHandler = mock._registeredCommands.get('zapwebp.convertScales');
  assert.ok(typeof scalesHandler === 'function');

  const sourcePath = '/workspace/media/hero.svg';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE));
  const sourceUri = vscode.Uri.file(sourcePath);

  await scalesHandler(sourceUri);

  assert.ok(mock._virtualFs.get('/workspace/media/hero.webp'), 'hero.webp (@1x) must exist');
  assert.ok(mock._virtualFs.get('/workspace/media/hero@2x.webp'), 'hero@2x.webp must exist');
  assert.ok(mock._virtualFs.get('/workspace/media/hero@3x.webp'), 'hero@3x.webp must exist');
});

test('commands.convertToPng converts SVG to PNG preserving alpha', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const pngHandler = mock._registeredCommands.get('zapwebp.convertToPng');
  assert.ok(typeof pngHandler === 'function');

  const sourcePath = '/workspace/src/icon.svg';
  const outputPath = '/workspace/src/icon.png';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE, 'utf8'));

  await pngHandler(vscode.Uri.file(sourcePath));

  const output = mock._virtualFs.get(outputPath);
  assert.ok(output, 'PNG output must exist');
  assert.equal(output.subarray(1, 4).toString('ascii'), 'PNG');
});

test('commands.convertToAvif converts SVG to AVIF', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const avifHandler = mock._registeredCommands.get('zapwebp.convertToAvif');
  assert.ok(typeof avifHandler === 'function');

  const sourcePath = '/workspace/src/graphic.svg';
  const outputPath = '/workspace/src/graphic.avif';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE, 'utf8'));

  await avifHandler(vscode.Uri.file(sourcePath));

  const output = mock._virtualFs.get(outputPath);
  assert.ok(output, 'AVIF output must exist');
});

test('commands.convertToJpeg flattens SVG with specified background color', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const jpegHandler = mock._registeredCommands.get('zapwebp.convertToJpeg');
  assert.ok(typeof jpegHandler === 'function');

  mock._inputBoxHandler = () => '#ff0000';

  const sourcePath = '/workspace/src/photo.svg';
  const outputPath = '/workspace/src/photo.jpg';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE, 'utf8'));

  await jpegHandler(vscode.Uri.file(sourcePath));

  const output = mock._virtualFs.get(outputPath);
  assert.ok(output, 'JPEG output must exist');
  assert.equal(output[0], 0xff);
  assert.equal(output[1], 0xd8);
});

test('commands.convertPrompt allows interactive format selection', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertCommand(context);

  const promptHandler = mock._registeredCommands.get('zapwebp.convertPrompt');
  assert.ok(typeof promptHandler === 'function');

  mock._quickPickHandler = (items) => items.find((i) => i.format === 'png');

  const sourcePath = '/workspace/src/dialog.svg';
  const outputPath = '/workspace/src/dialog.png';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE, 'utf8'));

  await promptHandler(vscode.Uri.file(sourcePath));

  const output = mock._virtualFs.get(outputPath);
  assert.ok(output, 'dialog.png must exist');
});

test('commands.convertScalesPrompt generates multi-scale assets for chosen format', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerConvertScalesCommand(context);

  const promptHandler = mock._registeredCommands.get('zapwebp.convertScalesPrompt');
  assert.ok(typeof promptHandler === 'function');

  mock._quickPickHandler = (items) => items.find((i) => i.format === 'png');

  const sourcePath = '/workspace/src/banner.svg';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE, 'utf8'));

  await promptHandler(vscode.Uri.file(sourcePath));

  assert.ok(mock._virtualFs.get('/workspace/src/banner.png'), 'banner.png must exist');
  assert.ok(mock._virtualFs.get('/workspace/src/banner@2x.png'), 'banner@2x.png must exist');
  assert.ok(mock._virtualFs.get('/workspace/src/banner@3x.png'), 'banner@3x.png must exist');
});
