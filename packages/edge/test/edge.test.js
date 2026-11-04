'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createZapHandler } = require('../src/index.js');
const { detectFormat } = require('@zapwebp/core');

const sampleSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">' +
  '<rect width="32" height="32" fill="#3b82f6"/>' +
  '</svg>',
  'utf8'
);

test('Edge: createZapHandler converts request body into locked target format', async () => {
  const handler = createZapHandler({
    targetFormat: 'webp',
    strict: true,
  });

  const request = new Request('https://zapwebp.vercel.app/img/icon.svg', {
    method: 'POST',
    body: sampleSvg,
  });

  const response = await handler(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/webp');
  assert.equal(response.headers.get('X-Zapwebp-Target-Lock'), 'enforced');

  const ab = await response.arrayBuffer();
  const output = Buffer.from(ab);
  assert.equal(detectFormat(output), 'webp');
});

test('Edge: strict mode rejects unconvertible bytes with HTTP 415 and E_UNSUPPORTED_FORMAT', async () => {
  const handler = createZapHandler({
    targetFormat: 'webp',
    strict: true,
  });

  const corruptBytes = Buffer.from('NOT_AN_IMAGE_PAYLOAD_BYTES');
  const request = new Request('https://zapwebp.vercel.app/img/corrupt.bin', {
    method: 'POST',
    body: corruptBytes,
  });

  const response = await handler(request);
  assert.equal(response.status, 415);
  const data = await response.json();
  assert.equal(data.error, 'E_UNSUPPORTED_FORMAT');
  assert.equal(data.target, 'webp');
  assert.ok(data.fix.includes('Upload a supported format'));
});

test('Edge: non-strict mode passes unconvertible bytes through with HTTP 200', async () => {
  const handler = createZapHandler({
    targetFormat: 'webp',
    strict: false,
  });

  const corruptBytes = Buffer.from('NOT_AN_IMAGE_PAYLOAD_BYTES');
  const request = new Request('https://zapwebp.vercel.app/img/audio.mp3', {
    method: 'POST',
    body: corruptBytes,
  });

  const response = await handler(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Zapwebp-Target-Lock'), 'bypassed-passthrough');
  const ab = await response.arrayBuffer();
  assert.equal(Buffer.from(ab).toString('utf8'), 'NOT_AN_IMAGE_PAYLOAD_BYTES');
});

test('Edge: source function resolver serves locked target', async () => {
  const handler = createZapHandler({
    targetFormat: 'avif',
    source: async (_req) => sampleSvg,
  });

  const request = new Request('https://zapwebp.vercel.app/img/source-test.svg', {
    method: 'GET',
  });

  const response = await handler(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/avif');
  const ab = await response.arrayBuffer();
  assert.equal(detectFormat(Buffer.from(ab)), 'avif');
});

