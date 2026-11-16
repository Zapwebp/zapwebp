'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  icoHandler,
  plugin,
  parseIco,
  decodeIco,
  decodeBmpDib,
  encodeIco,
  buildIcoContainer,
  generateFaviconSuite,
  normalizeSizes,
} = require('../src/index');

const SAMPLE_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" rx="32" fill="#10b981" />
    <circle cx="128" cy="128" r="64" fill="#ffffff" />
  </svg>`,
  'utf8'
);

test('ICO Sniffer: detects valid ICO and CUR headers', () => {
  const validIco = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
  const validCur = Buffer.from([0x00, 0x00, 0x02, 0x00, 0x01, 0x00]);
  const invalidType = Buffer.from([0x00, 0x00, 0x03, 0x00, 0x01, 0x00]);
  const invalidReserved = Buffer.from([0x01, 0x00, 0x01, 0x00, 0x01, 0x00]);

  assert.equal(icoHandler.detect(validIco), true);
  assert.equal(icoHandler.detect(validCur), true);
  assert.equal(icoHandler.detect(invalidType), false);
  assert.equal(icoHandler.detect(invalidReserved), false);
  assert.equal(icoHandler.detect(SAMPLE_SVG), false);
  assert.equal(icoHandler.detect(Buffer.alloc(0)), false);
  assert.equal(icoHandler.detect(null), false);
});

test('ICO Parser: enforces header validation and safety bounds', () => {
  assert.throws(() => parseIco(Buffer.alloc(4)), /too small to contain a valid header/);
  assert.throws(() => parseIco(Buffer.from([0x01, 0x00, 0x01, 0x00, 0x01, 0x00])), /Invalid ICO reserved/);
  assert.throws(() => parseIco(Buffer.from([0x00, 0x00, 0x05, 0x00, 0x01, 0x00])), /Invalid ICO type/);
  assert.throws(() => parseIco(Buffer.from([0x00, 0x00, 0x01, 0x00, 0x00, 0x00])), /contains 0 image entries/);

  // Exceeds max entries (e.g. 25 entries)
  const tooMany = Buffer.alloc(6);
  tooMany.writeUInt16LE(0, 0);
  tooMany.writeUInt16LE(1, 2);
  tooMany.writeUInt16LE(25, 4);
  assert.throws(() => parseIco(tooMany), /exceeding safe limit/);
});

test('ICO Normalize Sizes: cleans and deduplicates resolutions', () => {
  assert.deepEqual(normalizeSizes([16, 32, 16, 48]), [16, 32, 48]);
  assert.deepEqual(normalizeSizes('16, 32, 64, 128'), [16, 32, 64, 128]);
  assert.deepEqual(normalizeSizes(), [16, 32, 48, 64, 128, 256]);
  assert.throws(() => normalizeSizes([2, 9999]), /Invalid icon sizes/);
});

test('ICO Encode: generates high-resolution multi-size ICO container', async () => {
  const icoBuffer = await encodeIco(SAMPLE_SVG, {
    sizes: [16, 32, 48, 64, 128, 256],
    format: 'png',
  });

  assert.ok(Buffer.isBuffer(icoBuffer));
  assert.ok(icoBuffer.length > 500);

  const parsed = parseIco(icoBuffer);
  assert.equal(parsed.type, 'ico');
  assert.equal(parsed.count, 6);
  assert.equal(parsed.entries.length, 6);

  const widths = parsed.entries.map((e) => e.width);
  assert.deepEqual(widths, [16, 32, 48, 64, 128, 256]);

  for (const entry of parsed.entries) {
    assert.equal(entry.format, 'png');
    assert.equal(entry.bitCount, 32);
    assert.ok(entry.data.length > 0);
  }
});

test('ICO Config & Presets: supports declarative presets and hybrid format per size', async () => {
  // Test default hybrid: BMP for <= 32, PNG for > 32
  const hybridIco = await encodeIco(SAMPLE_SVG, {
    sizes: [16, 32, 48, 64],
  });
  const parsedHybrid = parseIco(hybridIco);
  assert.equal(parsedHybrid.entries.find((e) => e.width === 16).format, 'bmp');
  assert.equal(parsedHybrid.entries.find((e) => e.width === 32).format, 'bmp');
  assert.equal(parsedHybrid.entries.find((e) => e.width === 48).format, 'png');
  assert.equal(parsedHybrid.entries.find((e) => e.width === 64).format, 'png');

  // Test windows preset (all BMP)
  const windowsIco = await encodeIco(SAMPLE_SVG, { preset: 'windows' });
  const parsedWindows = parseIco(windowsIco);
  assert.deepEqual(parsedWindows.entries.map((e) => e.width), [16, 32, 48, 256]);
  for (const e of parsedWindows.entries) {
    assert.equal(e.format, 'bmp');
  }

  // Test cursor preset (type: 'cur')
  const curBuffer = await encodeIco(SAMPLE_SVG, { preset: 'cursor' });
  const parsedCur = parseIco(curBuffer);
  assert.equal(parsedCur.type, 'cur');
  assert.deepEqual(parsedCur.entries.map((e) => e.width), [32, 64]);
});

test('ICO Decode: extracts largest resolution and specific sizes', async () => {
  const icoBuffer = await encodeIco(SAMPLE_SVG, {
    sizes: [16, 32, 64, 256],
  });

  // Decode largest (default: 256)
  const largest = await decodeIco(icoBuffer);
  assert.equal(largest.width, 256);
  assert.equal(largest.height, 256);
  assert.equal(largest.channels, 4);
  assert.ok(largest.data instanceof Uint8ClampedArray);

  // Decode specific requested size: 32
  const small = await decodeIco(icoBuffer, { size: 32 });
  assert.equal(small.width, 32);
  assert.equal(small.height, 32);

  // Decode all entries with extractAll
  const allImages = await decodeIco(icoBuffer, { extractAll: true });
  assert.equal(allImages.length, 4);
  assert.deepEqual(allImages.map((img) => img.width), [16, 32, 64, 256]);
});

test('ICO BMP DIB: decodes legacy 32-bit BMP DIB with AND transparency mask', () => {
  // Construct a minimal 2x2 32-bit ICO BMP DIB
  const dib = Buffer.alloc(40 + 2 * 2 * 4 + 2 * 4);
  dib.writeUInt32LE(40, 0); // biSize
  dib.writeInt32LE(2, 4); // biWidth = 2
  dib.writeInt32LE(4, 8); // biHeight = 4 (2x icon height)
  dib.writeUInt16LE(1, 12); // biPlanes
  dib.writeUInt16LE(32, 14); // biBitCount = 32
  dib.writeUInt32LE(0, 16); // biCompression = BI_RGB

  // Set top-left pixel (in bottom-up order, row 1 pixel 0)
  // Let's populate row with BGRA
  // Row 0 (bottom row):
  dib[40] = 255; // B
  dib[41] = 0; // G
  dib[42] = 0; // R
  dib[43] = 255; // A (opaque blue)

  const decoded = decodeBmpDib(dib, 2, 2);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 2);
  assert.equal(decoded.channels, 4);
  assert.equal(decoded.data.length, 2 * 2 * 4);
  // Bottom-up decoded to top-down: bottom row is at y=1
  const bluePixelA = decoded.data[(1 * 2 + 0) * 4 + 3];
  assert.equal(bluePixelA, 255);
});

test('Favicon Suite: generates all required web assets and manifest', async () => {
  const suite = await generateFaviconSuite(SAMPLE_SVG, {
    name: 'Zapwebp Test',
    shortName: 'ZapTest',
    themeColor: '#00ff88',
    backgroundColor: '#111111',
    prefix: '/',
  });

  assert.ok(suite.files['favicon.ico']);
  assert.ok(suite.files['apple-touch-icon.png']);
  assert.ok(suite.files['icon-192.png']);
  assert.ok(suite.files['icon-512.png']);
  assert.ok(suite.files['favicon-32x32.png']);
  assert.ok(suite.files['favicon-16x16.png']);
  assert.ok(suite.files['site.webmanifest']);

  // Validate ICO inside suite
  const parsedIco = parseIco(suite.files['favicon.ico']);
  assert.ok(parsedIco.count >= 4);

  // Validate PNG sizes
  const metaApple = await sharp(suite.files['apple-touch-icon.png']).metadata();
  assert.equal(metaApple.width, 180);
  assert.equal(metaApple.height, 180);

  const meta192 = await sharp(suite.files['icon-192.png']).metadata();
  assert.equal(meta192.width, 192);

  const meta512 = await sharp(suite.files['icon-512.png']).metadata();
  assert.equal(meta512.width, 512);

  // Validate HTML tags
  assert.ok(suite.html.includes('<link rel="icon" href="/favicon.ico"'));
  assert.ok(suite.html.includes('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"'));
  assert.ok(suite.html.includes('<link rel="manifest" href="/site.webmanifest"'));
  assert.ok(suite.html.includes('<meta name="theme-color" content="#00ff88">'));

  // Validate manifest
  assert.equal(suite.manifest.name, 'Zapwebp Test');
  assert.equal(suite.manifest.short_name, 'ZapTest');
  assert.equal(suite.manifest.theme_color, '#00ff88');
  assert.equal(suite.manifest.background_color, '#111111');
});

test('Favicon CLI: zapwebp-favicon executes and writes suite to directory', () => {
  const { execFileSync } = require('node:child_process');
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-fav-test-'));
  const svgPath = path.join(tmpDir, 'icon.svg');
  fs.writeFileSync(svgPath, SAMPLE_SVG);
  const outDir = path.join(tmpDir, 'dist');

  const binPath = path.resolve(__dirname, '../bin/zapwebp-favicon.js');
  const stdout = execFileSync(
    process.execPath,
    [binPath, svgPath, '-o', outDir, '--name', 'CLI Project', '--html-file', '--json'],
    { encoding: 'utf8' }
  );

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.ok, true);
  assert.ok(parsed.files.length >= 7);
  assert.ok(fs.existsSync(path.join(outDir, 'favicon.ico')));
  assert.ok(fs.existsSync(path.join(outDir, 'apple-touch-icon.png')));
  assert.ok(fs.existsSync(path.join(outDir, 'site.webmanifest')));
  assert.ok(fs.existsSync(path.join(outDir, 'favicon-tags.html')));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('FormatHandler contract: implements full Zapwebp lifecycle hooks', async () => {
  assert.equal(icoHandler.name, 'ico');
  assert.equal(icoHandler.supportsAlpha, true);
  assert.equal(icoHandler.isInput, true);
  assert.equal(icoHandler.isOutput, true);
  assert.deepEqual([...icoHandler.extensions], ['.ico', '.cur']);
  assert.deepEqual([...icoHandler.mimeTypes], ['image/x-icon', 'image/vnd.microsoft.icon']);

  // Test encode & decode via handler methods
  const encoded = await icoHandler.encode(SAMPLE_SVG, { sizes: [32, 64] });
  assert.ok(icoHandler.detect(encoded));

  const decoded = await icoHandler.decode(encoded);
  assert.equal(decoded.width, 64);
  assert.equal(decoded.height, 64);
});
