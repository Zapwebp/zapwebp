'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');

test('Vercel Serverless Function entrypoint (api/index.js)', async (t) => {
  const app = require('../api/index.js');
  assert.equal(typeof app, 'function', 'api/index.js must export the Express application');

  const server = http.createServer(app).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  // 1. Direct API health check
  const healthRes = await fetch(`${base}/api/v1/health`);
  assert.equal(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.ok, true);

  // 2. Simulated Vercel rewrite with __zap_url
  const vercelRewriteRes = await fetch(`${base}/api/index.js?__zap_url=/api/v1/health`);
  assert.equal(vercelRewriteRes.status, 200);
  const vercelJson = await vercelRewriteRes.json();
  assert.equal(vercelJson.ok, true);

  // 3. GET /api/v1/convert with JSON header returns endpoint descriptors
  const getConvertJson = await fetch(`${base}/api/v1/convert`, { headers: { Accept: 'application/json' } });
  assert.equal(getConvertJson.status, 200);
  const convertDescriptor = await getConvertJson.json();
  assert.equal(convertDescriptor.endpoint, 'POST /api/v1/convert');
  assert.ok(convertDescriptor.curlExample);

  // 4. GET /api/v1/convert from browser redirects to docs
  const getConvertBrowser = await fetch(`${base}/api/v1/convert`, { headers: { Accept: 'text/html' }, redirect: 'manual' });
  assert.equal(getConvertBrowser.status, 303);
  assert.equal(getConvertBrowser.headers.get('location'), 'https://zapwebp-docs.vercel.app/api');

  // 5. POST /api/v1/convert converts image
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#8dc63f"/></svg>';
  const form = new FormData();
  form.append('file', new Blob([svg], { type: 'image/svg+xml' }), 'test.svg');
  form.append('to', 'webp');
  form.append('width', '32');
  const postRes = await fetch(`${base}/api/v1/convert`, { method: 'POST', body: form });
  assert.equal(postRes.status, 200);
  assert.match(postRes.headers.get('content-type'), /image\/webp/);
});
