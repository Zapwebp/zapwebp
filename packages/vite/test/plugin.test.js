'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { zapwebp } = require('../src/index');

const TEST_SVG = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="44" height="44" rx="8" fill="#8dc63f" />
</svg>
`.trim();

test('zapwebp plugin executes build hooks, emits WebPs and manifest to public outDir', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-vite-plugin-'));
  const srcDir = path.join(tmpDir, 'src', 'assets');
  fs.mkdirSync(srcDir, { recursive: true });

  const svgPath = path.join(srcDir, 'logo.svg');
  fs.writeFileSync(svgPath, TEST_SVG, 'utf8');

  const plugin = zapwebp({
    scale: [1, 2],
    baseWidth: 128,
    outDir: 'public/icons',
    emitManifest: true,
    emitToPublic: true,
  });

  // 1. configResolved
  plugin.configResolved({ root: tmpDir, command: 'build' });

  // 2. buildStart
  await plugin.buildStart();

  // Verify outputs written to public/icons
  const outDir = path.join(tmpDir, 'public', 'icons');
  assert.ok(fs.existsSync(outDir));
  assert.ok(fs.existsSync(path.join(outDir, 'logo.webp')));
  assert.ok(fs.existsSync(path.join(outDir, 'logo@2x.webp')));

  // 3. transform hook
  const transformed = plugin.transform('', svgPath);
  assert.ok(transformed);
  assert.equal(transformed.code, 'export default "/icons/logo.webp";');

  // 4. closeBundle hook writes manifest
  await plugin.closeBundle();

  const manifestPath = path.join(outDir, 'zapwebp.manifest.json');
  assert.ok(fs.existsSync(manifestPath));

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.totals.inputFiles, 1);
  assert.equal(manifest.totals.outputFiles, 2);
  assert.equal(manifest.files.length, 2);
  assert.ok(manifest.files[0].sha256);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('zapwebp plugin honors onConflict: error when target file already exists', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-vite-conflict-'));
  const srcDir = path.join(tmpDir, 'src');
  const outDir = path.join(tmpDir, 'public', 'icons');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'logo.svg'), TEST_SVG, 'utf8');
  // Pre-create output file
  fs.writeFileSync(path.join(outDir, 'logo.webp'), 'already exists', 'utf8');

  const plugin = zapwebp({
    outDir: 'public/icons',
    onConflict: 'error',
  });

  plugin.configResolved({ root: tmpDir, command: 'build' });

  await assert.rejects(
    async () => {
      await plugin.buildStart();
    },
    (err) => {
      assert.match(err.message, /Output file already exists/);
      return true;
    }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

