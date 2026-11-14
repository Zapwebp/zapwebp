'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { once } = require('node:events');
const { Zapwebp, Zap, createZapClient, ZapwebpError, resolveInput, listTools } = require('../src');
const { createMockSvg } = require('@zapwebp/core/testing');

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#8dc63f"/></svg>';

test('Zapwebp SDK: instantiation and backwards-compatibility', () => {
  const zap1 = new Zapwebp();
  const zap2 = new Zap();
  const zap3 = createZapClient();

  assert.ok(zap1 instanceof Zapwebp);
  assert.ok(zap2 instanceof Zapwebp);
  assert.ok(zap3 instanceof Zapwebp);
  assert.equal(zap1.isOffline, true);
});

test('Zapwebp SDK: 12 agentic methods in offline in-memory mode', async () => {
  const zap = new Zapwebp();

  // 1. convert (object-style and positional with nextAction)
  const webp = await zap.convert({ input: Buffer.from(svg), to: 'webp', width: 96 });
  assert.ok(Buffer.isBuffer(webp));
  assert.equal(webp.format, 'webp');
  assert.equal(webp.width, 96);
  assert.equal(webp.alphaPreserved, true);
  assert.ok(webp.nextAction);
  assert.equal(webp.nextAction.tool, 'verify_clean');

  // Positional multi-target conversion
  const multi = await zap.convert(Buffer.from(svg), {
    to: ['webp', 'png', 'avif'],
    width: 64,
  });
  assert.ok(Array.isArray(multi));
  assert.equal(multi.length, 3);
  assert.deepEqual(multi.map((m) => m.format), ['webp', 'png', 'avif']);

  // 2. convertBatch
  const batchRes = await zap.convertBatch({
    inputs: [Buffer.from(svg), createMockSvg({ width: 50, height: 50 })],
    to: 'webp',
  });
  assert.equal(batchRes.total, 2);
  assert.equal(batchRes.success, 2);
  assert.equal(batchRes.failed, 0);
  assert.equal(batchRes.results.length, 2);
  assert.equal(batchRes.nextAction.tool, 'optimize_assets');

  // 3. inspect
  const info = await zap.inspect(Buffer.from(svg));
  assert.equal(info.format, 'svg');
  assert.equal(info.hasAlpha, true);
  assert.ok(Array.isArray(info.recommendedTargets));
  assert.ok(info.nextAction);
  assert.equal(info.nextAction.tool, 'convert_image');

  // 4. verifyClean
  const cleanCheck = await zap.verifyClean({ input: webp });
  assert.equal(typeof cleanCheck.clean, 'boolean');
  assert.ok(cleanCheck.nextAction);

  // 5. verifyAlpha
  const alphaCheck = await zap.verifyAlpha({ input: webp });
  assert.equal(alphaCheck.hasAlpha, true);
  assert.ok(alphaCheck.cornerPixelsAlpha);
  assert.ok(alphaCheck.nextAction);

  // 6. suggestConversion
  const suggestion = await zap.suggestConversion({ input: Buffer.from(svg), useCase: 'icon' });
  assert.equal(suggestion.useCase, 'icon');
  assert.equal(suggestion.recommendedFormat, 'webp');
  assert.ok(suggestion.nextAction);
  assert.equal(suggestion.nextAction.tool, 'convert_image');

  // 7. auditCommand
  const audit = await zap.auditCommand({ command: 'convert icon.svg -background black icon.jpg' });
  assert.equal(audit.tool, 'ImageMagick');
  assert.ok(audit.warnings.length > 0);
  assert.ok(audit.nextAction);

  // 8. listTools
  const tools = await zap.listTools();
  assert.ok(Array.isArray(tools));
  assert.ok(tools.length >= 8);
  assert.ok(tools.some((t) => t.name === 'convert_image'));
  assert.ok(tools.some((t) => t.name === 'inspect_image'));

  // 9. getAgentManifest
  const manifest = await zap.getAgentManifest();
  assert.equal(manifest.name, '@zapwebp/sdk');
  assert.ok(manifest.capabilities.length > 0);

  // 10. getUsage
  const usage = await zap.getUsage();
  assert.equal(usage.mode, 'offline');
  assert.equal(usage.inMemory, true);
  assert.ok(usage.operations > 0);
  assert.ok(usage.bytesProcessed > 0);

  // 11. optimize
  const report = await zap.optimize({
    files: [Buffer.from(svg)],
    targets: [{ to: 'webp', quality: 85 }, { to: 'avif', quality: 55 }],
  });
  assert.ok(report.totalBytesBefore > 0);
  assert.ok(report.totalBytesAfter > 0);
  assert.equal(report.files.length, 1);

  // 12. Webhook HMAC verification
  const payload = JSON.stringify({ event: 'job.completed', id: 'evt_123' });
  const secret = 'whsec_test_secret_key_12345';
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(Zapwebp.verifyWebhookSignature(payload, validSignature, secret), true);
  assert.equal(Zapwebp.verifyWebhookSignature(payload, 'invalid', secret), false);
});

test('Zapwebp SDK: universal input adapter (Buffer, Uint8Array, Blob, inline SVG, Data URI)', async () => {
  // Uint8Array
  const u8 = new Uint8Array(Buffer.from(svg));
  const res1 = await resolveInput(u8);
  assert.ok(Buffer.isBuffer(res1.buffer));

  // Inline SVG string
  const res2 = await resolveInput(svg);
  assert.ok(Buffer.isBuffer(res2.buffer));
  assert.equal(res2.filename, 'inline.svg');

  // Base64 Data URI
  const b64DataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const res3 = await resolveInput(b64DataUri);
  assert.ok(Buffer.isBuffer(res3.buffer));
  assert.equal(res3.buffer.toString(), svg);

  // Blob mock
  const blobMock = {
    name: 'test.svg',
    async arrayBuffer() {
      return Buffer.from(svg).buffer;
    },
  };
  const res4 = await resolveInput(blobMock);
  assert.ok(Buffer.isBuffer(res4.buffer));
  assert.equal(res4.filename, 'test.svg');
});

test('Zapwebp SDK: structured errors with suggestedFix and retryable flag', async () => {
  const zap = new Zapwebp();

  // Attempting to flatten transparent SVG to JPEG without background color throws E_ALPHA_NOT_REPRESENTABLE
  await assert.rejects(
    async () => zap.convert({ input: Buffer.from(svg), to: 'jpeg' }),
    (err) => {
      assert.ok(err instanceof ZapwebpError);
      assert.equal(err.code, 'E_ALPHA_NOT_REPRESENTABLE');
      assert.equal(err.retryable, true);
      assert.deepEqual(err.suggestedFix, { background: '#ffffff' });

      // Verify toJSON() method
      const json = err.toJSON();
      assert.equal(json.code, 'E_ALPHA_NOT_REPRESENTABLE');
      assert.equal(json.retryable, true);
      assert.deepEqual(json.suggestedFix, { background: '#ffffff' });
      return true;
    }
  );

  // Retrying with the suggestedFix succeeds deterministically
  const recovered = await zap.convert({
    input: Buffer.from(svg),
    to: 'jpeg',
    background: '#ffffff',
  });
  assert.ok(Buffer.isBuffer(recovered));
  assert.equal(recovered.format, 'jpeg');
});

test('Zapwebp SDK: convertUrl and inspectUrl remote execution', async (t) => {
  const server = http.createServer((req, res) => {
    if (req.url === '/test-image.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(Buffer.from(svg));
      return;
    }
    if (req.url === '/api/v1/convert' && req.method === 'POST') {
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'X-Zapwebp-Width': '128',
        'X-Zapwebp-Height': '128',
        'X-Zapwebp-Alpha-Preserved': 'true',
      });
      res.end(Buffer.from('MOCK_REMOTE_WEBP'));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const zap = new Zapwebp({ baseUrl, apiKey: 'test_key_123' });
  assert.equal(zap.isOffline, false);

  const converted = await zap.convert(Buffer.from(svg), { to: 'webp' });
  assert.equal(converted.toString(), 'MOCK_REMOTE_WEBP');
  assert.equal(converted.width, 128);
  assert.equal(converted.alphaPreserved, true);
  assert.ok(converted.nextAction);
});
