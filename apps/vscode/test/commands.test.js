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
