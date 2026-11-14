'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createApiRouter } = require('../src');
const core = require('@zapwebp/core');

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="#8dc63f"/></svg>';

test('API health, CORS preflight, conversion, validation, and batch routes', async (t) => {
  const app = express();
  app.use('/v1', createApiRouter({ maxFileBytes: 1024 * 1024, maxBatchBytes: 2 * 1024 * 1024 }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}/v1`;

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.version, '1.1.0');

  // GET descriptor & docs redirect
  const getConvertJson = await fetch(`${base}/convert`, { headers: { Accept: 'application/json' } });
  assert.equal(getConvertJson.status, 200);
  const convertInfo = await getConvertJson.json();
  assert.equal(convertInfo.endpoint, 'POST /api/v1/convert');
  assert.ok(convertInfo.parameters.file);

  const getConvertHtml = await fetch(`${base}/convert`, { headers: { Accept: 'text/html' }, redirect: 'manual' });
  assert.equal(getConvertHtml.status, 303);
  assert.equal(getConvertHtml.headers.get('location'), 'https://zapwebp-docs.vercel.app/api');

  const preflight = await fetch(`${base}/convert`, { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');

  const form = new FormData();
  form.append('svg', new Blob([svg], { type: 'image/svg+xml' }), 'mark.svg');
  form.append('width', '64');
  const conversion = await fetch(`${base}/convert`, { method: 'POST', body: form });
  assert.equal(conversion.status, 200);
  assert.match(conversion.headers.get('content-type'), /image\/webp/);
  assert.equal(conversion.headers.get('x-zapwebp-alpha-preserved'), 'true');
  const bytes = Buffer.from(await conversion.arrayBuffer());
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');

  const invalidOptions = new FormData();
  invalidOptions.append('svg', new Blob([svg]), 'mark.svg');
  invalidOptions.append('quality', '91junk');
  assert.equal((await fetch(`${base}/convert`, { method: 'POST', body: invalidOptions })).status, 400);

  const batch = new FormData();
  batch.append('files', new Blob([svg]), 'one.svg');
  batch.append('files', new Blob([svg]), 'two.svg');
  const batchResponse = await fetch(`${base}/batch`, { method: 'POST', body: batch });
  assert.equal(batchResponse.status, 200);
  const batchJson = await batchResponse.json();
  assert.equal(batchJson.results.length, 2);
  assert.ok(batchJson.results.every((item) => item.alphaPreserved));

  const multiTarget = new FormData();
  multiTarget.append('files', new Blob([svg]), 'multi.svg');
  multiTarget.append('targets', 'webp,png,avif');
  const multiResponse = await fetch(`${base}/batch`, { method: 'POST', body: multiTarget });
  assert.equal(multiResponse.status, 200);
  const multiJson = await multiResponse.json();
  assert.deepEqual(multiJson.results.map((item) => item.format), ['webp', 'png', 'avif']);
  assert.ok(multiJson.results.every((item) => item.alphaPreserved && item.data.length > 0));

  const transparentPng = await core.convertImage(svg, { to: 'png', width: 32 });
  const jpegForm = new FormData();
  jpegForm.append('svg', new Blob([transparentPng.data]), 'mark.png');
  jpegForm.append('to', 'jpeg');
  const rejectedJpeg = await fetch(`${base}/convert`, { method: 'POST', body: jpegForm });
  assert.equal(rejectedJpeg.status, 400);
  assert.match((await rejectedJpeg.json()).error, /cannot store transparency/i);

  const flattenedForm = new FormData();
  flattenedForm.append('svg', new Blob([transparentPng.data]), 'mark.png');
  flattenedForm.append('to', 'jpeg');
  flattenedForm.append('background', '#ffffff');
  const flattenedJpeg = await fetch(`${base}/convert`, { method: 'POST', body: flattenedForm });
  assert.equal(flattenedJpeg.status, 200);
  assert.match(flattenedJpeg.headers.get('content-type'), /image\/jpeg/);
  assert.equal(flattenedJpeg.headers.get('x-zapwebp-alpha-preserved'), 'false');

  const inspectForm = new FormData();
  inspectForm.append('file', new Blob([svg], { type: 'image/svg+xml' }), 'mark.svg');
  const inspectResponse = await fetch(`${base}/inspect`, { method: 'POST', body: inspectForm });
  assert.equal(inspectResponse.status, 200);
  const inspectBody = await inspectResponse.json();
  assert.equal(inspectBody.ok, true);
  assert.equal(inspectBody.format, 'svg');
  assert.equal(inspectBody.hasAlpha, true);
  assert.ok(Array.isArray(inspectBody.recommendedTargets));
});
