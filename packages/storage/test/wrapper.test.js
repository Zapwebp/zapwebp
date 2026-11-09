'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeToRgba } = require('@zapwebp/core');
const { withZapwebp } = require('../src/wrapper');

const transparentSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
  '<circle cx="50" cy="50" r="40" fill="#00ff66"/>' +
  '</svg>',
  'utf8',
);

const unsafeScriptSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">' +
  '<script>alert("hacked")</script>' +
  '<rect width="50" height="50" fill="red"/>' +
  '</svg>',
  'utf8',
);

const unsafeRemoteSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">' +
  '<image href="https://example.com/tracking.png" width="50" height="50"/>' +
  '</svg>',
  'utf8',
);

function createMockAdapter(overrides = {}) {
  const writes = [];
  const deletes = [];
  const store = new Map();

  return {
    name: 'mock',
    writes,
    deletes,
    store,
    async write(bucket, path, bytes, opts) {
      writes.push({ bucket, path, bytes, opts });
      store.set(`${bucket}:${path}`, bytes);
      return {
        path,
        bytes: bytes.length,
        publicUrl: `https://mock.storage/${bucket}/${path}`,
      };
    },
    async read(bucket, path) {
      const data = store.get(`${bucket}:${path}`);
      if (!data) throw new Error(`File not found: ${bucket}/${path}`);
      return data;
    },
    async delete(bucket, path) {
      deletes.push({ bucket, path });
      store.delete(`${bucket}:${path}`);
    },
    async exists(bucket, path) {
      return store.has(`${bucket}:${path}`);
    },
    async list(bucket, prefix) {
      const results = [];
      for (const key of store.keys()) {
        const [b, p] = key.split(':');
        if (b === bucket && (!prefix || p.startsWith(prefix))) {
          results.push(p);
        }
      }
      return results;
    },
    ...overrides,
  };
}

test('Wrapper: validates adapter structure', () => {
  assert.throws(() => withZapwebp(null), /StorageAdapter/);
  assert.throws(() => withZapwebp({}), /name, write, read, and delete/);
});

test('Wrapper: converts SVG to 3 WebPs with multipliers and calls write', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    scale: [1, 2, 3],
    baseWidth: 100,
    emitManifest: false,
  });

  const report = await zap.upload('icons', 'logo.svg', transparentSvg);

  assert.equal(report.skipped, false);
  assert.equal(report.source.format, 'svg');
  assert.equal(report.outputs.length, 3);
  assert.equal(adapter.writes.length, 3);

  // Check scale naming and widths
  assert.equal(report.outputs[0].path, 'logo.webp');
  assert.equal(report.outputs[0].scale, 1);
  assert.equal(report.outputs[0].width, 100);

  assert.equal(report.outputs[1].path, 'logo@2x.webp');
  assert.equal(report.outputs[1].scale, 2);
  assert.equal(report.outputs[1].width, 200);

  assert.equal(report.outputs[2].path, 'logo@3x.webp');
  assert.equal(report.outputs[2].scale, 3);
  assert.equal(report.outputs[2].width, 300);
});

test('Wrapper: every uploaded WebP preserves transparency in corner pixel', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    scale: [1, 2],
    baseWidth: 100,
    emitManifest: false,
  });

  await zap.upload('icons', 'logo.svg', transparentSvg);

  for (const entry of adapter.writes) {
    const raw = await decodeToRgba(entry.bytes);
    assert.ok(raw.width > 0);
    assert.ok(raw.height > 0);
    // (0,0) corner should be fully transparent (alpha < 255)
    const cornerAlpha = raw.data[3];
    assert.ok(cornerAlpha < 255, `Corner pixel alpha should be transparent (<255), got: ${cornerAlpha}`);
  }
});

test('Wrapper: keepOriginal: true uploads both converted WebPs and original SVG', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    scale: [1],
    baseWidth: 100,
    keepOriginal: true,
    emitManifest: false,
  });

  await zap.upload('assets', 'images/badge.svg', transparentSvg);

  assert.equal(adapter.writes.length, 2);
  assert.equal(adapter.writes[0].path, 'images/badge.webp');
  assert.equal(adapter.writes[0].opts.contentType, 'image/webp');

  assert.equal(adapter.writes[1].path, 'images/badge.svg');
  assert.equal(adapter.writes[1].opts.contentType, 'image/svg+xml');
});

test('Wrapper: honors outPrefix for output assets and manifest', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    scale: [1],
    baseWidth: 100,
    outPrefix: 'optimized/cdn',
    emitManifest: true,
  });

  const report = await zap.upload('public', 'hero.svg', transparentSvg);
  assert.equal(report.outputs[0].path, 'optimized/cdn/hero.webp');
  assert.ok(adapter.writes.some((w) => w.path === 'optimized/cdn/hero.manifest.json'));
});

test('Wrapper: rejects file exceeding maxBytes with E_TOO_LARGE', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, { maxBytes: 10 });

  await assert.rejects(
    () => zap.upload('b', 'large.svg', transparentSvg),
    /E_TOO_LARGE/,
  );
});

test('Wrapper: rejects SVG with active script content with E_UNSAFE_SVG', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter);

  await assert.rejects(
    () => zap.upload('b', 'unsafe.svg', unsafeScriptSvg),
    /E_UNSAFE_SVG/,
  );
  assert.equal(adapter.writes.length, 0);
});

test('Wrapper: rejects SVG with remote external reference with E_UNSAFE_SVG', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter);

  await assert.rejects(
    () => zap.upload('b', 'remote.svg', unsafeRemoteSvg),
    /E_UNSAFE_SVG/,
  );
  assert.equal(adapter.writes.length, 0);
});

test('Wrapper: conflict strategy handling (skip vs error vs overwrite)', async () => {
  const adapter = createMockAdapter();
  adapter.store.set('bucket:logo.webp', Buffer.from('existing'));

  // 1. onConflict: 'skip'
  const zapSkip = withZapwebp(adapter, { onConflict: 'skip' });
  const skipReport = await zapSkip.upload('bucket', 'logo.svg', transparentSvg);
  assert.equal(skipReport.skipped, true);
  assert.equal(skipReport.outputs.length, 0);

  // 2. onConflict: 'error'
  const zapError = withZapwebp(adapter, { onConflict: 'error' });
  await assert.rejects(
    () => zapError.upload('bucket', 'logo.svg', transparentSvg),
    /E_CONFLICT/,
  );

  // 3. onConflict: 'overwrite'
  const zapOverwrite = withZapwebp(adapter, { onConflict: 'overwrite', emitManifest: false });
  const overwriteReport = await zapOverwrite.upload('bucket', 'logo.svg', transparentSvg);
  assert.equal(overwriteReport.skipped, false);
  assert.equal(overwriteReport.outputs.length, 1);
  assert.equal(adapter.writes[0].opts.upsert, true);
});

test('Wrapper: uploadMany batch conversion generates aggregate summary', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    scale: [1, 2],
    baseWidth: 80,
    emitManifest: false,
  });

  const files = [
    { path: 'icons/icon1.svg', bytes: transparentSvg },
    { path: 'icons/icon2.svg', bytes: transparentSvg },
  ];

  const batchReport = await zap.uploadMany('assets', files);
  assert.equal(batchReport.summary.files, 2);
  assert.equal(batchReport.reports.length, 2);
  assert.ok(batchReport.summary.bytesIn > 0);
  assert.ok(batchReport.summary.bytesOut > 0);
  assert.ok(Number.isInteger(batchReport.summary.saved));
  assert.equal(batchReport.manifest.totalFiles, 2);
});

test('Wrapper: remove cascades deletion across all scales, manifest, and original', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    scale: [1, 2, 3],
    keepOriginal: true,
    emitManifest: true,
  });

  // Pre-populate store
  await zap.upload('bucket', 'ui/logo.svg', transparentSvg);
  assert.ok(adapter.store.size >= 4);

  // Execute cascade remove
  await zap.remove('bucket', 'ui/logo.svg');

  // Verify derived paths were deleted
  const remainingKeys = Array.from(adapter.store.keys());
  assert.equal(remainingKeys.some((k) => k.includes('logo')), false);
  assert.ok(adapter.deletes.some((d) => d.path === 'ui/logo.webp'));
  assert.ok(adapter.deletes.some((d) => d.path === 'ui/logo@2x.webp'));
  assert.ok(adapter.deletes.some((d) => d.path === 'ui/logo@3x.webp'));
  assert.ok(adapter.deletes.some((d) => d.path === 'ui/logo.manifest.json'));
});

test('Wrapper: Target Lock enforces target format, strict mode, and supports overrideLock', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    targetFormat: 'avif',
    strict: true,
  });

  // 1. Target lock forces output to .avif
  const res = await zap.upload('bucket', 'images/banner.svg', transparentSvg);
  assert.equal(res.targetFormat, 'avif');
  assert.equal(res.targetLockEnforced, true);
  assert.equal(res.targetLockBypassed, false);
  assert.ok(adapter.store.has('bucket:images/banner.avif'));

  // 2. Opt-in overrideLock permits overriding format
  const resBypass = await zap.upload('bucket', 'images/card.svg', transparentSvg, {
    overrideLock: true,
    targetFormat: 'webp',
  });
  assert.equal(resBypass.targetFormat, 'webp');
  assert.equal(resBypass.targetLockBypassed, true);
  assert.ok(adapter.store.has('bucket:images/card.webp'));

  // 3. Strict mode throws on unconvertible input
  const corruptBytes = Buffer.from('NOT_AN_IMAGE_FILE_DATA_BYTES');
  await assert.rejects(
    async () => {
      await zap.upload('bucket', 'docs/data.bin', corruptBytes);
    },
    (err) => {
      assert.ok(err.message.includes('E_UNSUPPORTED_FORMAT'));
      return true;
    }
  );

  // 4. Non-strict mode passes unconvertible bytes through
  const zapNonStrict = withZapwebp(adapter, {
    targetFormat: 'avif',
    strict: false,
  });
  const passRes = await zapNonStrict.upload('bucket', 'docs/notes.txt', corruptBytes);
  assert.equal(passRes.passedThrough, true);
  assert.ok(adapter.store.has('bucket:docs/notes.txt'));
});

test('Wrapper: Background Preservation flattens transparent input to JPEG when defaultBackground is set', async () => {
  const adapter = createMockAdapter();
  // 1. Transparent to JPEG without background throws E_ALPHA_NOT_REPRESENTABLE
  const zapNoBg = withZapwebp(adapter, { targetFormat: 'jpeg' });
  await assert.rejects(
    async () => {
      await zapNoBg.upload('bucket', 'logo.svg', transparentSvg);
    },
    (err) => {
      assert.ok(err.message.includes('E_ALPHA_NOT_REPRESENTABLE'));
      return true;
    }
  );

  // 2. Transparent to JPEG with defaultBackground flattens onto color
  const zapWithBg = withZapwebp(adapter, {
    targetFormat: 'jpeg',
    defaultBackground: '#ffffff',
  });
  const res = await zapWithBg.upload('bucket', 'logo.svg', transparentSvg);
  assert.equal(res.targetFormat, 'jpeg');
  assert.ok(adapter.store.has('bucket:logo.jpg'));
});

test('Wrapper: crop preset auto-crops asset before uploading to storage', async () => {
  const adapter = createMockAdapter();
  const zap = withZapwebp(adapter, {
    crop: 'avatar',
    targetFormat: 'webp',
  });

  const res = await zap.upload('bucket', 'photos/user.svg', transparentSvg);
  assert.equal(res.targetFormat, 'webp');
  assert.ok(adapter.store.has('bucket:photos/user.webp'));
  const uploadedBytes = adapter.store.get('bucket:photos/user.webp');
  assert.ok(uploadedBytes.length > 0);
});
