'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { scan } = require('../src/scan');
const { convert, buildCliArgs } = require('../src/convert');
const { parseInputs } = require('../src/inputs');

const SAMPLE_TRANSPARENT_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#8dc63f" />
</svg>
`.trim();

const UNSAFE_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <script>evil()</script>
</svg>
`.trim();

test('buildCliArgs constructs expected CLI command invocation arguments', () => {
  const inputs = parseInputs([
    'src/**/*.{svg,png}',
    'avif',
    '1,2',
    '256',
    '80',
    'false',
    'true',
    'dist',
  ]);

  const cliArgs = buildCliArgs(inputs);
  assert.deepEqual(cliArgs, [
    'src/**/*.{svg,png}',
    '--to',
    'avif',
    '--quality',
    '80',
    '--scale',
    '1,2',
    '--base-width',
    '256',
    '--clean',
    '--out-dir',
    'dist',
  ]);
});

test('convert scans and converts SVG with transparency and multipliers to WebP', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-action-convert-'));
  const srcDir = path.join(tmpDir, 'src', 'icons');
  fs.mkdirSync(srcDir, { recursive: true });

  const svgPath = path.join(srcDir, 'star.svg');
  fs.writeFileSync(svgPath, SAMPLE_TRANSPARENT_SVG, 'utf8');

  const files = scan(tmpDir, 'src/**/*.svg');
  assert.equal(files.length, 1);
  assert.equal(files[0].relativePath, 'src/icons/star.svg');

  const inputs = parseInputs(['src/**/*.svg', 'webp', '1,2', '120', '85', 'false', 'true', 'dist/icons']);
  const result = await convert(files, inputs, tmpDir);

  assert.equal(result.filesIn, 1);
  assert.equal(result.filesOut, 2);
  assert.ok(result.bytesOut > 0);

  // Check generated WebP files
  const out1x = path.join(tmpDir, 'dist', 'icons', 'star.webp');
  const out2x = path.join(tmpDir, 'dist', 'icons', 'star@2x.webp');
  assert.ok(fs.existsSync(out1x));
  assert.ok(fs.existsSync(out2x));

  // Alpha preservation verified
  const item1x = result.outputs.find((o) => o.scale === 1);
  assert.ok(item1x);
  assert.equal(item1x.alphaPreserved, true);
  assert.equal(item1x.width, 120);

  // Source SVG is strictly immutable
  assert.equal(fs.readFileSync(svgPath, 'utf8'), SAMPLE_TRANSPARENT_SVG);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convert supports dynamic target formats: passing format png emits PNG outputs', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-action-png-'));
  fs.writeFileSync(path.join(tmpDir, 'icon.svg'), SAMPLE_TRANSPARENT_SVG, 'utf8');

  const files = scan(tmpDir, '*.svg');
  const inputs = parseInputs(['*.svg', 'png', '1', '100']);
  const result = await convert(files, inputs, tmpDir);

  assert.equal(result.filesOut, 1);
  const outPng = path.join(tmpDir, 'icon.png');
  assert.ok(fs.existsSync(outPng));
  assert.equal(result.outputs[0].target, 'icon.png');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convert supports dynamic target formats: passing format avif emits AVIF outputs', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-action-avif-'));
  fs.writeFileSync(path.join(tmpDir, 'hero.svg'), SAMPLE_TRANSPARENT_SVG, 'utf8');

  const files = scan(tmpDir, '*.svg');
  const inputs = parseInputs(['*.svg', 'avif', '1,2', '128']);
  const result = await convert(files, inputs, tmpDir);

  assert.equal(result.filesOut, 2);
  const out1x = path.join(tmpDir, 'hero.avif');
  const out2x = path.join(tmpDir, 'hero@2x.avif');
  assert.ok(fs.existsSync(out1x));
  assert.ok(fs.existsSync(out2x));
  assert.equal(result.outputs[0].target, 'hero.avif');
  assert.equal(result.outputs[1].target, 'hero@2x.avif');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('convert fails loudly on unsafe SVG containing active scripts', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-action-unsafe-'));
  fs.writeFileSync(path.join(tmpDir, 'unsafe.svg'), UNSAFE_SVG, 'utf8');

  const files = scan(tmpDir, '*.svg');
  const inputs = parseInputs(['*.svg']);

  await assert.rejects(
    async () => {
      await convert(files, inputs, tmpDir);
    },
    (err) => {
      assert.match(err.message, /SVG security validation failed/);
      return true;
    }
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
