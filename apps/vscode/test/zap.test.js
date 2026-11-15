'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getMock, resetMock } = require('./mock-vscode');
const vscode = require('vscode');

const { detectFormatFromBytes, formatFromExtension, getRealFormat } = require('../src/format');
const { buildMenu } = require('../src/menu');
const { rememberPreference, getPreferredTarget, clearPreferences } = require('../src/history');
const { registerZapCommand, buildOutputUri } = require('../src/commands/zap');

const SVG_FIXTURE = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" fill="#3b82f6" />
</svg>
`.trim();

const PNG_FIXTURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

const JPEG_FIXTURE = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
]);

const GIF_FIXTURE = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

const WEBP_FIXTURE = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0b, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x00, 0x07, 0x10, 0x81, 0x05, 0x00, 0x00, 0x00,
]);

const AVIF_FIXTURE = Buffer.from([
  0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70,
  0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00,
  0x61, 0x76, 0x69, 0x66, 0x6d, 0x69, 0x66, 0x31,
]);

const HEIC_FIXTURE = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00,
  0x6d, 0x69, 0x66, 0x31,
]);

const ICO_FIXTURE = Buffer.from([
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10,
]);

const TIFF_FIXTURE = Buffer.from([
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
]);

test('format: detectFormatFromBytes sniffs real formats across all supported types', () => {
  assert.equal(detectFormatFromBytes(Buffer.from(SVG_FIXTURE)), 'svg');
  assert.equal(detectFormatFromBytes(PNG_FIXTURE), 'png');
  assert.equal(detectFormatFromBytes(JPEG_FIXTURE), 'jpeg');
  assert.equal(detectFormatFromBytes(GIF_FIXTURE), 'gif');
  assert.equal(detectFormatFromBytes(WEBP_FIXTURE), 'webp');
  assert.equal(detectFormatFromBytes(AVIF_FIXTURE), 'avif');
  assert.equal(detectFormatFromBytes(HEIC_FIXTURE), 'heic');
  assert.equal(detectFormatFromBytes(ICO_FIXTURE), 'ico');
  assert.equal(detectFormatFromBytes(TIFF_FIXTURE), 'tiff');
  assert.equal(detectFormatFromBytes(Buffer.from('not an image')), null);
});

test('format: formatFromExtension handles diverse extensions cleanly', () => {
  assert.equal(formatFromExtension('assets/banner.svg'), 'svg');
  assert.equal(formatFromExtension('assets/photo.PNG'), 'png');
  assert.equal(formatFromExtension('assets/photo.jpg'), 'jpeg');
  assert.equal(formatFromExtension('assets/photo.jpeg'), 'jpeg');
  assert.equal(formatFromExtension('assets/icon.webp'), 'webp');
  assert.equal(formatFromExtension('assets/icon.avif'), 'avif');
  assert.equal(formatFromExtension('assets/icon.heif'), 'heic');
  assert.equal(formatFromExtension('assets/favicon.ico'), 'ico');
  assert.equal(formatFromExtension('assets/doc.pdf'), null);
});

test('format: getRealFormat prefers magic byte content over misleading file extensions', async () => {
  const mock = resetMock();
  // SVG content saved inside a .png filename (misleading extension)
  const misleadingUri = vscode.Uri.file('/workspace/assets/fake.png');
  mock._virtualFs.set(misleadingUri.path, Buffer.from(SVG_FIXTURE));

  const format = await getRealFormat(misleadingUri);
  assert.equal(format, 'svg', 'Must detect true SVG format from magic bytes despite .png extension');
});

test('menu: buildMenu constructs format-tailored menu options', () => {
  // SVG menu: has multipliers and all raster targets
  const svgMenu = buildMenu('svg');
  assert.ok(svgMenu.some((i) => i.multipliers && i.multipliers.length === 3), 'SVG must include multipliers');
  assert.ok(svgMenu.some((i) => i.target === 'webp'));
  assert.ok(svgMenu.some((i) => i.target === 'png'));
  assert.ok(svgMenu.some((i) => i.target === 'avif'));
  assert.ok(svgMenu.some((i) => i.target === 'jpeg'));

  // PNG menu: no multipliers by default, never offers PNG as target
  const pngMenu = buildMenu('png');
  assert.ok(!pngMenu.some((i) => i.target === 'png'), 'PNG source must not offer PNG target');
  assert.ok(!pngMenu.some((i) => i.multipliers), 'PNG source must hide multipliers by default');
  assert.ok(pngMenu.some((i) => i.target === 'webp'));
  assert.ok(pngMenu.some((i) => i.target === 'avif'));
  assert.ok(pngMenu.some((i) => i.target === 'jpeg'));

  // JPEG menu: never offers JPEG as target
  const jpegMenu = buildMenu('jpeg');
  assert.ok(!jpegMenu.some((i) => i.target === 'jpeg'));
  assert.ok(jpegMenu.some((i) => i.target === 'webp'));
  assert.ok(jpegMenu.some((i) => i.target === 'avif'));
  assert.ok(jpegMenu.some((i) => i.target === 'png'));

  // ICO menu: limited to webp and png
  const icoMenu = buildMenu('ico');
  assert.equal(icoMenu.length, 2);
  assert.ok(icoMenu.some((i) => i.target === 'webp'));
  assert.ok(icoMenu.some((i) => i.target === 'png'));
});

test('menu: buildMenu promotes preferred last-used target to top', () => {
  const menu = buildMenu('png', { preferredTarget: 'avif' });
  assert.equal(menu[0].target, 'avif');
  assert.ok(menu[0].label.includes('★ Last used'));
  assert.equal(menu[0].isLastUsed, true);
});

test('history: rememberPreference saves and restores target format choices', () => {
  const context = {
    globalState: {
      data: new Map(),
      get: function (k, def) {
        return this.data.has(k) ? this.data.get(k) : def;
      },
      update: function (k, v) {
        this.data.set(k, v);
        return Promise.resolve();
      },
    },
  };

  clearPreferences(context);
  assert.equal(getPreferredTarget(context, 'png'), null);

  rememberPreference(context, { sourceFormat: 'png', targetFormat: 'avif' });
  assert.equal(getPreferredTarget(context, 'png'), 'avif');

  // Case-insensitive lookup
  assert.equal(getPreferredTarget(context, 'PNG'), 'avif');
});

test('commands.zap: right-clicking PNG shows context-aware menu and converts to WebP', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  assert.ok(typeof zapHandler === 'function');

  const sourcePath = '/workspace/assets/photo.png';
  const outPath = '/workspace/assets/photo.webp';
  mock._virtualFs.set(sourcePath, PNG_FIXTURE);

  let presentedItems = [];
  mock._quickPickHandler = (items) => {
    presentedItems = items;
    return items.find((i) => i.item.target === 'webp');
  };

  const sourceUri = vscode.Uri.file(sourcePath);
  await zapHandler(sourceUri);

  // Assert QuickPick presented only valid PNG targets (no PNG, no multipliers)
  assert.ok(presentedItems.length > 0);
  assert.ok(!presentedItems.some((i) => i.item.target === 'png'), 'Must not offer PNG to PNG');
  assert.ok(!presentedItems.some((i) => i.item.multipliers), 'Must not offer multipliers for PNG');

  // Assert output file created without touching source
  assert.equal(mock._virtualFs.get(sourcePath).byteLength, PNG_FIXTURE.byteLength);
  assert.ok(mock._virtualFs.get(outPath), 'photo.webp must be written');
  assert.ok(mock._virtualFs.get(outPath).byteLength > 0);
});

test('commands.zap: SVG multi-scale selection writes @1x, @2x, @3x outputs', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const sourcePath = '/workspace/assets/icon.svg';
  mock._virtualFs.set(sourcePath, Buffer.from(SVG_FIXTURE));

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.multipliers && i.item.multipliers.length === 3);
  };

  const sourceUri = vscode.Uri.file(sourcePath);
  await zapHandler(sourceUri);

  assert.ok(mock._virtualFs.get('/workspace/assets/icon.webp'), 'icon.webp (@1x) must exist');
  assert.ok(mock._virtualFs.get('/workspace/assets/icon@2x.webp'), 'icon@2x.webp must exist');
  assert.ok(mock._virtualFs.get('/workspace/assets/icon@3x.webp'), 'icon@3x.webp must exist');
});

test('commands.zap: multi-select with identical formats converts in single batch', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const file1 = '/workspace/icons/one.png';
  const file2 = '/workspace/icons/two.png';
  mock._virtualFs.set(file1, PNG_FIXTURE);
  mock._virtualFs.set(file2, PNG_FIXTURE);

  mock._quickPickHandler = (items) => {
    return items.find((i) => i.item.target === 'webp');
  };

  const uri1 = vscode.Uri.file(file1);
  const uri2 = vscode.Uri.file(file2);
  const result = await zapHandler(uri1, [uri1, uri2]);

  assert.equal(result.converted, 2);
  assert.ok(mock._virtualFs.get('/workspace/icons/one.webp'));
  assert.ok(mock._virtualFs.get('/workspace/icons/two.webp'));
});

test('commands.zap: multi-select with mixed formats prompts user and supports "all to WebP"', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerZapCommand(context);

  const zapHandler = mock._registeredCommands.get('zapwebp.zap');
  const svgFile = '/workspace/mixed/logo.svg';
  const pngFile = '/workspace/mixed/photo.png';
  mock._virtualFs.set(svgFile, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(pngFile, PNG_FIXTURE);

  let quickPickPrompt = '';
  mock._quickPickHandler = (items, options) => {
    quickPickPrompt = options?.placeHolder || '';
    return items.find((i) => i.action === 'all-webp');
  };

  const uriSvg = vscode.Uri.file(svgFile);
  const uriPng = vscode.Uri.file(pngFile);
  const result = await zapHandler(uriSvg, [uriSvg, uriPng]);

  assert.ok(quickPickPrompt.includes('Multiple formats selected'), 'Should inform user of multiple formats');
  assert.equal(result.converted, 2);
  assert.ok(mock._virtualFs.get('/workspace/mixed/logo.webp'));
  assert.ok(mock._virtualFs.get('/workspace/mixed/photo.webp'));
});

test('commands.zap: buildOutputUri respects multipliers and never duplicates extension', () => {
  const uri = vscode.Uri.file('/workspace/img/avatar.png');
  const single = buildOutputUri(uri, 'webp', 1);
  assert.equal(single.path, '/workspace/img/avatar.webp');

  const scaled = buildOutputUri(uri, 'webp', 2);
  assert.equal(scaled.path, '/workspace/img/avatar@2x.webp');
});
