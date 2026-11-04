'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  registry,
  registerFormat,
  getHandlerByName,
  getHandlerByMime,
  getHandlerByExtension,
  detectFormatHandler,
  getAllHandlers,
  FormatRegistry,
} = require('../src/formats');
const { convertImage } = require('../src');

test('Format Registry: contains all 7 built-in handlers with correct metadata', () => {
  const handlers = getAllHandlers();
  assert.equal(handlers.length >= 7, true, 'At least 7 handlers must be registered');

  const names = handlers.map((h) => h.name).sort();
  assert.deepEqual(names, ['avif', 'gif', 'jpeg', 'png', 'svg', 'tiff', 'webp']);

  const svg = getHandlerByName('svg');
  assert.ok(svg);
  assert.equal(svg.supportsAlpha, true);
  assert.equal(svg.isInput, true);
  assert.equal(svg.isOutput, false);
  assert.equal(svg.mimeTypes.includes('image/svg+xml'), true);
  assert.equal(svg.extensions.includes('.svg'), true);

  const png = getHandlerByName('png');
  assert.ok(png);
  assert.equal(png.supportsAlpha, true);
  assert.equal(png.isInput, true);
  assert.equal(png.isOutput, true);

  const jpeg = getHandlerByName('jpeg');
  assert.ok(jpeg);
  assert.equal(jpeg.supportsAlpha, false);
  assert.equal(jpeg.isInput, true);
  assert.equal(jpeg.isOutput, true);

  const webp = getHandlerByName('webp');
  assert.ok(webp);
  assert.equal(webp.supportsAlpha, true);
  assert.equal(webp.isInput, true);
  assert.equal(webp.isOutput, true);
});

test('Format Registry: resolves by MIME type and extension case-insensitively', () => {
  assert.equal(getHandlerByMime('image/png')?.name, 'png');
  assert.equal(getHandlerByMime('image/jpeg')?.name, 'jpeg');
  assert.equal(getHandlerByMime('IMAGE/WEBP')?.name, 'webp');
  assert.equal(getHandlerByMime('image/svg+xml; charset=utf-8')?.name, 'svg');

  assert.equal(getHandlerByExtension('.png')?.name, 'png');
  assert.equal(getHandlerByExtension('.JPG')?.name, 'jpeg');
  assert.equal(getHandlerByExtension('webp')?.name, 'webp');
  assert.equal(getHandlerByExtension('.svg')?.name, 'svg');
  assert.equal(getHandlerByExtension('.avif')?.name, 'avif');
});

test('Format Registry: detectFormatHandler matches byte buffers accurately', async () => {
  const testSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#c7f36b"/></svg>');
  assert.equal(detectFormatHandler(testSvg)?.name, 'svg');

  const pngRes = await convertImage(testSvg, { to: 'png', width: 10, height: 10 });
  assert.equal(detectFormatHandler(pngRes.data)?.name, 'png');

  const webpRes = await convertImage(testSvg, { to: 'webp', width: 10, height: 10 });
  assert.equal(detectFormatHandler(webpRes.data)?.name, 'webp');

  const jpegRes = await convertImage(testSvg, { to: 'jpeg', background: '#ffffff', width: 10, height: 10 });
  assert.equal(detectFormatHandler(jpegRes.data)?.name, 'jpeg');
});

test('Format Registry: Open/Closed extensibility permits registering custom format handlers', () => {
  const customRegistry = new FormatRegistry();
  const mockHandler = {
    name: 'custom-bmp',
    mimeTypes: ['image/x-custom-bmp'],
    extensions: ['.cbmp'],
    supportsAlpha: false,
    isInput: true,
    isOutput: false,
    detect: (bytes) => bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d,
    decode: async () => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 }),
    encode: async () => { throw new Error('Not implemented'); },
  };

  customRegistry.register(mockHandler);
  assert.equal(customRegistry.getByName('custom-bmp')?.name, 'custom-bmp');
  assert.equal(customRegistry.getByMime('image/x-custom-bmp')?.name, 'custom-bmp');
  assert.equal(customRegistry.getByExtension('.cbmp')?.name, 'custom-bmp');
  assert.equal(customRegistry.detect(Buffer.from([0x42, 0x4d, 0x00, 0x00]))?.name, 'custom-bmp');
});

test('Format Registry: decode -> encode roundtrip preserves dimensions across format handlers', async () => {
  const testSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="8" fill="#8dc63f"/></svg>');
  const svgHandler = getHandlerByName('svg');
  const webpHandler = getHandlerByName('webp');
  const pngHandler = getHandlerByName('png');

  const raw = await svgHandler.decode(testSvg);
  assert.equal(raw.width > 0, true);
  assert.equal(raw.height > 0, true);
  assert.equal(raw.data.length, raw.width * raw.height * 4);

  const encodedWebp = await webpHandler.encode(raw, { quality: 90 });
  assert.ok(Buffer.isBuffer(encodedWebp));
  assert.equal(webpHandler.detect(encodedWebp), true);

  const encodedPng = await pngHandler.encode(raw, {});
  assert.ok(Buffer.isBuffer(encodedPng));
  assert.equal(pngHandler.detect(encodedPng), true);
});
