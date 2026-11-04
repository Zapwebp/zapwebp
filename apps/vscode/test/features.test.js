'use strict';

const { getMock, resetMock } = require('./mock-vscode');
const test = require('node:test');
const assert = require('node:assert/strict');
const vscode = require('vscode');

const { registerHoverProvider } = require('../src/hover/provider');
const { registerOnSaveWatcher } = require('../src/watcher/on-save');
const { activate, deactivate } = require('../src/extension');

const SVG_SAMPLE = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
  <circle cx="24" cy="24" r="20" fill="purple"/>
</svg>
`.trim();

test('hover.provider returns Markdown hover with checkerboard preview and byte size', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerHoverProvider(context);

  assert.ok(mock._hoverProvider);
  assert.equal(mock._hoverProvider.selector.pattern, '**/*.{svg,png,jpg,jpeg}');

  const filePath = '/workspace/icons/circle.svg';
  mock._virtualFs.set(filePath, Buffer.from(SVG_SAMPLE));
  const doc = { uri: vscode.Uri.file(filePath) };

  const hover = await mock._hoverProvider.provider.provideHover(doc);
  assert.ok(hover);
  assert.ok(hover.contents.value.includes('Zapwebp preview'));
  assert.ok(hover.contents.value.includes('data:image/svg+xml;base64,'));
  assert.ok(hover.contents.value.includes('Size:'));
});

test('watcher.on-save debounces 500ms and converts SVG when convertOnSave is enabled', async () => {
  const mock = resetMock({ convertOnSave: true });
  const context = { subscriptions: [] };
  registerOnSaveWatcher(context);

  const svgPath = '/workspace/icons/save-target.svg';
  const outWebpPath = '/workspace/icons/save-target.webp';
  mock._virtualFs.set(svgPath, Buffer.from(SVG_SAMPLE));

  const uri = vscode.Uri.file(svgPath);

  // Trigger change handler
  mock._watcher.changeHandlers[0](uri);

  // Immediately, output should not exist yet due to 500ms debounce
  assert.equal(mock._virtualFs.get(outWebpPath), undefined);

  // Poll until debounce timer (500ms) + conversion completes (up to 3000ms)
  const startTime = Date.now();
  let converted = null;
  while (Date.now() - startTime < 3000) {
    converted = mock._virtualFs.get(outWebpPath);
    if (converted) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  assert.ok(converted, 'Auto-converted WebP must exist after debounce interval and conversion');
  assert.equal(converted.subarray(0, 4).toString('ascii'), 'RIFF');
});

test('extension.activate registers all commands and subscriptions cleanly', () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  activate(context);

  assert.ok(mock._registeredCommands.has('zapwebp.convert'));
  assert.ok(mock._registeredCommands.has('zapwebp.convertScales'));
  assert.ok(mock._registeredCommands.has('zapwebp.showOutput'));
  assert.ok(context.subscriptions.length >= 5);

  deactivate();
});
