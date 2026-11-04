'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { once } = require('node:events');
const { Zap, createZapClient } = require('../src');

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#8dc63f"/></svg>';

test('Zap SDK: local offline execution, multi-target, inspect, optimize, and webhook verification', async () => {
  const zap = new Zap();
  assert.equal(zap.isOffline, true);

  // 1. Single conversion
  const webp = await zap.convert(Buffer.from(svg), { to: 'webp', width: 96 });
  assert.ok(Buffer.isBuffer(webp));
  assert.equal(webp.format, 'webp');
  assert.equal(webp.width, 96);
  assert.equal(webp.alphaPreserved, true);

  // 2. Multi-target conversion
  const multi = await zap.convert(Buffer.from(svg), {
    to: ['webp', 'png', 'avif'],
    width: 64,
  });
  assert.ok(Array.isArray(multi));
  assert.equal(multi.length, 3);
  assert.deepEqual(multi.map((m) => m.format), ['webp', 'png', 'avif']);
  assert.ok(multi.every((m) => m.alphaPreserved && m.size > 0));

  // 3. Inspection
  const info = await zap.inspect(Buffer.from(svg));
  assert.equal(info.format, 'svg');
  assert.equal(info.hasAlpha, true);
  assert.ok(Array.isArray(info.recommendedTargets));

  // 4. Optimization report
  const report = await zap.optimize({
    files: [Buffer.from(svg)],
    targets: [{ to: 'webp', quality: 85 }, { to: 'avif', quality: 55 }],
  });
  assert.ok(report.totalBytesBefore > 0);
  assert.ok(report.totalBytesAfter > 0);
  assert.equal(report.files.length, 1);
  assert.equal(report.files[0].outputs.length, 2);

  // 5. Webhook HMAC-SHA256 signature verification
  const payload = JSON.stringify({ event: 'job.completed', id: 'evt_123' });
  const secret = 'whsec_test_secret_key_12345';
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  assert.equal(Zap.verifyWebhookSignature(payload, validSignature, secret), true);
  assert.equal(Zap.verifyWebhookSignature(payload, `sha256=${validSignature}`, secret), true);
  assert.equal(Zap.verifyWebhookSignature(payload, 'invalid_sig', secret), false);

  // 6. Factory helper
  const client = createZapClient();
  assert.ok(client instanceof Zap);
});

test('Zap SDK: remote API client mode', async (t) => {
  // Spawn a mock Zap server
  const server = http.createServer((req, res) => {
    if (req.url === '/api/v1/convert' && req.method === 'POST') {
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'X-Zapwebp-Width': '128',
        'X-Zapwebp-Height': '128',
        'X-Zapwebp-Alpha-Preserved': 'true',
      });
      res.end(Buffer.from('MOCK_WEBP_BYTES'));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const zap = new Zap({ baseUrl, apiKey: 'zap_test_key' });
  assert.equal(zap.isOffline, false);

  const res = await zap.convert(Buffer.from(svg), { to: 'webp' });
  assert.equal(res.toString(), 'MOCK_WEBP_BYTES');
  assert.equal(res.width, 128);
  assert.equal(res.alphaPreserved, true);
});

