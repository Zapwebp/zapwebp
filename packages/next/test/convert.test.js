'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { convertAll } = require('../src/convert');
const { resolveConfig } = require('../src/config');
const { getSharp } = require('@zapwebp/core');

const VALID_TRANSPARENT_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#8dc63f" />
</svg>
`.trim();

const UNSAFE_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <script>alert("xss")</script>
  <circle cx="50" cy="50" r="40" fill="#8dc63f" />
</svg>
`.trim();

test('convertAll converts transparent SVG to WebP with multipliers and writes to outDir', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-next-convert-'));
  const srcDir = path.join(tmpDir, 'src');
  const outDir = path.join(tmpDir, 'public', 'icons');
  fs.mkdirSync(srcDir, { recursive: true });

  const svgPath = path.join(srcDir, 'icon.svg');
  fs.writeFileSync(svgPath, VALID_TRANSPARENT_SVG, 'utf8');

  const config = resolveConfig({
    scale: [1, 2],
    baseWidth: 200,
    outDir: 'public/icons',
  });

  const files = [{ absolutePath: svgPath, relativePath: 'src/icon.svg' }];
  const outputs = await convertAll(files, config, tmpDir);

  assert.equal(outputs.length, 2);

  // 1x
  const out1x = outputs.find((o) => o.scale === 1);
  assert.ok(out1x);
  assert.equal(out1x.name, 'icon.webp');
  assert.equal(out1x.width, 200);
  assert.equal(out1x.alphaPreserved, true);
  assert.ok(fs.existsSync(path.join(outDir, 'icon.webp')));

  // 2x
  const out2x = outputs.find((o) => o.scale === 2);
  assert.ok(out2x);
  assert.equal(out2x.name, 'icon@2x.webp');
  assert.equal(out2x.width, 400);
  assert.equal(out2x.alphaPreserved, true);
  assert.ok(fs.existsSync(path.join(outDir, 'icon@2x.webp')));

  // Source remains immutable
  assert.equal(fs.readFileSync(svgPath, 'utf8'), VALID_TRANSPARENT_SVG);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convertAll fails loudly on unsafe SVG containing active script content', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-next-convert-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const svgPath = path.join(srcDir, 'unsafe.svg');
  fs.writeFileSync(svgPath, UNSAFE_SVG, 'utf8');

  const config = resolveConfig();
  const files = [{ absolutePath: svgPath, relativePath: 'src/unsafe.svg' }];

  await assert.rejects(
    async () => {
      await convertAll(files, config, tmpDir);
    },
    (err) => {
      assert.match(err.message, /SVG security validation failed/);
      return true;
    }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convertAll respects onConflict: error when output file already exists', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-next-conflict-'));
  const srcDir = path.join(tmpDir, 'src');
  const outDir = path.join(tmpDir, 'public', 'icons');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const svgPath = path.join(srcDir, 'icon.svg');
  fs.writeFileSync(svgPath, VALID_TRANSPARENT_SVG, 'utf8');
  fs.writeFileSync(path.join(outDir, 'icon.webp'), 'already-exists', 'utf8');

  const config = resolveConfig({
    outDir: 'public/icons',
    onConflict: 'error',
  });

  const files = [{ absolutePath: svgPath, relativePath: 'src/icon.svg' }];

  await assert.rejects(
    async () => {
      await convertAll(files, config, tmpDir);
    },
    (err) => {
      assert.match(err.message, /Output file already exists/);
      return true;
    }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convertAll converts raster images to WebP and AVIF with multipliers', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-next-raster-'));
  const srcDir = path.join(tmpDir, 'public');
  const outDir = path.join(tmpDir, 'public', 'optimized');
  fs.mkdirSync(srcDir, { recursive: true });

  const pngPath = path.join(srcDir, 'hero.png');
  const sharp = getSharp();
  await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 4,
      background: { r: 141, g: 198, b: 63, alpha: 0.8 },
    },
  }).png().toFile(pngPath);

  const config = resolveConfig({
    outDir: 'public/optimized',
    formats: ['webp', 'avif'],
    scale: [1, 2],
  });

  const files = [{ absolutePath: pngPath, relativePath: 'public/hero.png' }];
  const outputs = await convertAll(files, config, tmpDir);

  assert.equal(outputs.length, 4); // 2 formats * 2 scales
  assert.ok(fs.existsSync(path.join(outDir, 'hero.webp')));
  assert.ok(fs.existsSync(path.join(outDir, 'hero@2x.webp')));
  assert.ok(fs.existsSync(path.join(outDir, 'hero.avif')));
  assert.ok(fs.existsSync(path.join(outDir, 'hero@2x.avif')));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
