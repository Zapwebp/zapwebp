'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getMock, resetMock } = require('./mock-vscode');
const vscode = require('vscode');

const { scanFolder, hasSubfolders } = require('../src/folder/scan');
const { getPanelHtml, openFolderPanel } = require('../src/folder/panel');
const { convertFolder } = require('../src/folder/convert');
const { registerFolderCommands } = require('../src/commands/folder');

const SVG_FIXTURE = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#10b981" />
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

test('scanFolder detects convertible images and ignores unsupported files', async () => {
  const mock = resetMock();
  const folder = '/workspace/assets';

  mock._virtualFs.set(`${folder}/icon1.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/icon2.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/photo.png`, PNG_FIXTURE);
  mock._virtualFs.set(`${folder}/readme.txt`, Buffer.from('Documentation'));
  mock._virtualFs.set(`${folder}/data.json`, Buffer.from('{}'));

  const folderUri = vscode.Uri.file(folder);
  const scan = await scanFolder(folderUri, { recursive: false });

  assert.equal(scan.files.length, 3, 'Should find 3 convertible files');
  assert.equal(scan.byFormat.svg.length, 2, 'Should find 2 SVG files');
  assert.equal(scan.byFormat.png.length, 1, 'Should find 1 PNG file');
  assert.equal(scan.skipped.length, 2, 'Should skip 2 unsupported files');
  assert.equal(scan.limitReached, false);
});

test('scanFolder handles recursive subfolder opt-in', async () => {
  const mock = resetMock();
  const folder = '/workspace/assets';

  mock._virtualFs.set(`${folder}/root.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/nested/sub.png`, PNG_FIXTURE);
  mock._virtualFs.set(`${folder}/nested/deep/icon.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/node_modules/bad.png`, PNG_FIXTURE); // Must be ignored

  const folderUri = vscode.Uri.file(folder);

  // Non-recursive: root only
  const shallowScan = await scanFolder(folderUri, { recursive: false });
  assert.equal(shallowScan.files.length, 1, 'Shallow scan should find only 1 root file');
  assert.equal(shallowScan.subfolders.length, 1, 'Should detect nested subfolder');

  // Recursive: traverses subfolders, ignores node_modules
  const deepScan = await scanFolder(folderUri, { recursive: true });
  assert.equal(deepScan.files.length, 3, 'Recursive scan should find 3 files (root + sub + deep)');
  assert.ok(!deepScan.files.some((f) => f.relPath.includes('node_modules')), 'Must ignore node_modules');
});

test('scanFolder enforces maxFiles safety limit', async () => {
  const mock = resetMock();
  const folder = '/workspace/bulk';

  for (let i = 0; i < 20; i++) {
    mock._virtualFs.set(`${folder}/img_${i}.svg`, Buffer.from(SVG_FIXTURE));
  }

  const folderUri = vscode.Uri.file(folder);
  const scan = await scanFolder(folderUri, { maxFiles: 10 });

  assert.equal(scan.files.length, 10, 'Should cap at maxFiles = 10');
  assert.equal(scan.limitReached, true, 'limitReached should be true');
});

test('hasSubfolders correctly identifies presence of non-ignored subfolders', async () => {
  const mock = resetMock();

  mock._virtualFs.set('/workspace/empty-dir/file.svg', Buffer.from(SVG_FIXTURE));
  assert.equal(await hasSubfolders(vscode.Uri.file('/workspace/empty-dir')), false);

  mock._virtualFs.set('/workspace/has-sub/icons/logo.svg', Buffer.from(SVG_FIXTURE));
  assert.equal(await hasSubfolders(vscode.Uri.file('/workspace/has-sub')), true);

  mock._virtualFs.set('/workspace/only-ignored/node_modules/pkg/icon.svg', Buffer.from(SVG_FIXTURE));
  assert.equal(await hasSubfolders(vscode.Uri.file('/workspace/only-ignored')), false);
});

test('getPanelHtml generates accessible and complete configuration UI', () => {
  const folderUri = vscode.Uri.file('/workspace/assets');
  const scanResult = {
    folderUri,
    files: [
      { uri: vscode.Uri.file('/workspace/assets/logo.svg'), name: 'logo.svg', relPath: 'logo.svg', format: 'svg', ext: 'svg' },
      { uri: vscode.Uri.file('/workspace/assets/photo.png'), name: 'photo.png', relPath: 'photo.png', format: 'png', ext: 'png' },
    ],
    byFormat: {
      svg: [{ uri: vscode.Uri.file('/workspace/assets/logo.svg'), name: 'logo.svg', relPath: 'logo.svg', format: 'svg', ext: 'svg' }],
      png: [{ uri: vscode.Uri.file('/workspace/assets/photo.png'), name: 'photo.png', relPath: 'photo.png', format: 'png', ext: 'png' }],
    },
    skipped: [
      { uri: vscode.Uri.file('/workspace/assets/notes.txt'), name: 'notes.txt', relPath: 'notes.txt', ext: 'txt', reason: 'unsupported' },
    ],
    subfolders: [],
    totalFilesScanned: 3,
    limitReached: false,
  };

  const html = getPanelHtml(scanResult);
  assert.ok(html.includes('Zap Folder: <code>assets</code>'));
  assert.ok(html.includes('2 convertible images'));
  assert.ok(html.includes('1 skipped (unsupported)'));
  assert.ok(html.includes('scales-svg'), 'Should include multi-scale checkbox for SVG');
  assert.ok(html.includes('target-svg'));
  assert.ok(html.includes('target-png'));
  assert.ok(html.includes('Convert All (2 files)'));
});

test('convertFolder processes single-format and multi-format conversions', async () => {
  const mock = resetMock();
  const folder = '/workspace/media';

  const svg1 = `${folder}/icon1.svg`;
  const png1 = `${folder}/banner.png`;
  mock._virtualFs.set(svg1, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(png1, PNG_FIXTURE);

  const folderUri = vscode.Uri.file(folder);
  const scan = await scanFolder(folderUri, { recursive: false });

  const configs = [
    { sourceFormat: 'svg', targetFormat: 'webp', scales: false },
    { sourceFormat: 'png', targetFormat: 'webp', scales: false },
  ];

  const summary = await convertFolder(scan, configs);

  assert.equal(summary.total, 2);
  assert.equal(summary.converted, 2);
  assert.equal(summary.failed, 0);

  // Assert output files created
  assert.ok(mock._virtualFs.get(`${folder}/icon1.webp`), 'icon1.webp should exist');
  assert.ok(mock._virtualFs.get(`${folder}/banner.webp`), 'banner.webp should exist');

  // Source files must remain intact
  assert.equal(mock._virtualFs.get(svg1).toString('utf8'), SVG_FIXTURE);
});

test('convertFolder handles SVG multi-scale generation (@1x, @2x, @3x)', async () => {
  const mock = resetMock();
  const folder = '/workspace/brand';

  const logoSvg = `${folder}/logo.svg`;
  mock._virtualFs.set(logoSvg, Buffer.from(SVG_FIXTURE));

  const folderUri = vscode.Uri.file(folder);
  const scan = await scanFolder(folderUri, { recursive: false });

  const configs = [
    { sourceFormat: 'svg', targetFormat: 'webp', scales: true },
  ];

  const summary = await convertFolder(scan, configs);

  assert.equal(summary.converted, 1);
  assert.ok(mock._virtualFs.get(`${folder}/logo.webp`), 'logo.webp (@1x) should exist');
  assert.ok(mock._virtualFs.get(`${folder}/logo@2x.webp`), 'logo@2x.webp should exist');
  assert.ok(mock._virtualFs.get(`${folder}/logo@3x.webp`), 'logo@3x.webp should exist');
});

test('Flow A: zapwebp.zapFolder on single-format folder shows QuickPick and converts', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerFolderCommands(context);

  const folder = '/workspace/icons';
  mock._virtualFs.set(`${folder}/arrow.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/star.svg`, Buffer.from(SVG_FIXTURE));

  const zapFolderHandler = mock._registeredCommands.get('zapwebp.zapFolder');
  assert.ok(typeof zapFolderHandler === 'function');

  // Mock QuickPick selection to choose WebP
  mock._quickPickHandler = (items) => {
    return items.find((i) => i.format === 'webp');
  };

  const folderUri = vscode.Uri.file(folder);
  const summary = await zapFolderHandler(folderUri);

  assert.equal(summary.converted, 2);
  assert.ok(mock._virtualFs.get(`${folder}/arrow.webp`));
  assert.ok(mock._virtualFs.get(`${folder}/star.webp`));

  // Verify toast notification was fired
  assert.ok(mock._infoMessages.some((msg) => msg.includes('Zap Folder: 2 files converted')));
});

test('Flow B: zapwebp.zapFolder on mixed-format folder opens Webview panel and converts', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerFolderCommands(context);

  const folder = '/workspace/mixed';
  mock._virtualFs.set(`${folder}/icon.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/thumb.png`, PNG_FIXTURE);

  const zapFolderHandler = mock._registeredCommands.get('zapwebp.zapFolder');
  const folderUri = vscode.Uri.file(folder);

  // Hook webview creation to simulate user clicking "Convert All"
  mock._onWebviewCreated = (panel) => {
    setImmediate(() => {
      panel.webview.postMessage({
        command: 'convert',
        configs: [
          { sourceFormat: 'svg', targetFormat: 'webp', scales: false },
          { sourceFormat: 'png', targetFormat: 'avif', scales: false },
        ],
      });
    });
  };

  const summary = await zapFolderHandler(folderUri);

  assert.equal(summary.converted, 2);
  assert.ok(mock._virtualFs.get(`${folder}/icon.webp`));
  assert.ok(mock._virtualFs.get(`${folder}/thumb.avif`));
});

test('Flow C: zapwebp.zapFolder prompts for subfolders when subdirectories exist', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerFolderCommands(context);

  const folder = '/workspace/tree';
  mock._virtualFs.set(`${folder}/root.svg`, Buffer.from(SVG_FIXTURE));
  mock._virtualFs.set(`${folder}/sub/child.svg`, Buffer.from(SVG_FIXTURE));

  const zapFolderHandler = mock._registeredCommands.get('zapwebp.zapFolder');
  const folderUri = vscode.Uri.file(folder);

  let promptCount = 0;
  mock._quickPickHandler = (items) => {
    promptCount++;
    if (promptCount === 1) {
      // First prompt is subfolder scope prompt
      return items.find((i) => i.recursive === true);
    }
    // Second prompt is format choice
    return items.find((i) => i.format === 'webp');
  };

  const summary = await zapFolderHandler(folderUri);

  assert.equal(promptCount, 2, 'Should prompt for scope and then target format');
  assert.equal(summary.converted, 2, 'Both root and subfolder file should be converted');
  assert.ok(mock._virtualFs.get(`${folder}/root.webp`));
  assert.ok(mock._virtualFs.get(`${folder}/sub/child.webp`));
});

test('zapwebp.zapFolder safely ignores empty folder', async () => {
  const mock = resetMock();
  const context = { subscriptions: [] };
  registerFolderCommands(context);

  const folder = '/workspace/empty';
  mock._virtualFs.set(`${folder}/document.pdf`, Buffer.from('%PDF-1.4'));

  const zapFolderHandler = mock._registeredCommands.get('zapwebp.zapFolder');
  const folderUri = vscode.Uri.file(folder);

  await zapFolderHandler(folderUri);

  assert.ok(mock._infoMessages.includes('No supported images found in folder.'));
});
