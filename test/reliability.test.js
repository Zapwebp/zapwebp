'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { reliability } = require('@zapwebp/shared');
const { convertImage } = require('@zapwebp/core');

// 1. Integration imports
const { zapwebp: vitePlugin } = require('../packages/vite/src/index');
const { withZapwebp } = require('../packages/next/src/index');
const { parseInputs } = require('../packages/github-action/src/inputs');
const { assertForkSafety } = require('../packages/github-action/src/fork');
const { convertAsset: actionConvertAsset } = require('../packages/github-action/src/convert');
const { createStorageWrapper } = require('../packages/storage/src/wrapper');
const { validateStoragePath, validateSafeUrl } = require('../packages/storage/src/sanitize');
const { calculateCropBox, CROP_PRESETS } = require('../packages/crop/src/index');
const { safeRead } = require('../packages/lens/src/safe-read');

test('Reliability Masterplan: Golden Corpus determinism across core engine', async () => {
  // Test first 10 golden cases to guarantee determinism and non-empty output
  for (let i = 0; i < 10; i++) {
    const c = reliability.GOLDEN_CASES[i];
    const res = await reliability.verifyGoldenCase(c, async (input, opts) => {
      const out = await convertImage(input, opts);
      return out.data;
    });

    assert.equal(res.id, c.id);
    assert.equal(typeof res.sha256, 'string');
    assert.equal(res.sha256.length, 64);
    assert.ok(res.byteLength > 0);
  }
});

test('Reliability Masterplan: Adversarial Fixtures rejected across Core Engine', async () => {
  // 1. Billion Laughs XXE
  await reliability.verifyAdversarialRejection('billion-laughs', async (data) => {
    await convertImage(data, { to: 'webp' });
  });

  // 2. Script Injection
  await reliability.verifyAdversarialRejection('script-injection', async (data) => {
    await convertImage(data, { to: 'webp' });
  });

  // 3. External SSRF reference
  await reliability.verifyAdversarialRejection('external-ref', async (data) => {
    await convertImage(data, { to: 'webp' });
  });

  // 4. Corrupt header
  await reliability.verifyAdversarialRejection('corrupt-header', async (data) => {
    await convertImage(data, { to: 'png' });
  });
});

test('Reliability Dimension: Vite Plugin (Stability, Security, and Reliability)', async () => {
  const plugin = vitePlugin({ outDir: 'dist' });
  assert.equal(plugin.name, 'zapwebp');
  assert.equal(typeof plugin.buildStart, 'function');
  assert.equal(typeof plugin.closeBundle, 'function');

  // Security: Adversarial SVG script rejection in Vite plugin conversion worker
  const { convertSvgAsset } = require('../packages/vite/src/convert');
  const tmpDir = path.join(__dirname, 'tmp-vite-adversarial');
  fs.mkdirSync(tmpDir, { recursive: true });
  const evilFile = path.join(tmpDir, 'evil.svg');
  fs.writeFileSync(evilFile, reliability.ADVERSARIAL_FIXTURES['script-injection'].data);

  try {
    await assert.rejects(
      async () => {
        await convertSvgAsset(evilFile, {
          scales: [1],
          quality: 85,
          clean: true,
        });
      },
      (err) => err.code === 'E_UNSAFE_SVG' || err.message.includes('active content')
    );
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

test('Reliability Dimension: Next.js Plugin (Stability and Security)', async () => {
  const nextConfig = withZapwebp()({
    reactStrictMode: true,
  });

  assert.equal(nextConfig.reactStrictMode, true);
  assert.equal(typeof nextConfig.webpack, 'function');

  // Security: Next.js convertAll rejects adversarial scripts
  const { convertAll } = require('../packages/next/src/convert');
  const tmpDir = path.join(__dirname, 'tmp-next-adversarial');
  fs.mkdirSync(tmpDir, { recursive: true });
  const evilFile = path.join(tmpDir, 'evil.svg');
  fs.writeFileSync(evilFile, reliability.ADVERSARIAL_FIXTURES['script-injection'].data);

  try {
    await assert.rejects(
      async () => {
        await convertAll(
          [{ absolutePath: evilFile, relativePath: 'evil.svg' }],
          {
            outDir: 'out',
            scales: [1],
            quality: 85,
            clean: true,
            formats: ['webp'],
          },
          tmpDir
        );
      },
      (err) => err.code === 'E_UNSAFE_SVG' || err.message.includes('active content') || err.message.includes('SVG security validation failed')
    );
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

test('Reliability Dimension: GitHub Action (Security, Fork Isolation, Idempotency)', () => {
  const tmpDir = path.join(__dirname, 'tmp-action-fork');
  fs.mkdirSync(tmpDir, { recursive: true });
  const eventPath = path.join(tmpDir, 'event.json');
  fs.writeFileSync(
    eventPath,
    JSON.stringify({ pull_request: { head: { repo: { fork: true } } } })
  );

  try {
    // Fork Safety
    assert.throws(
      () => {
        assertForkSafety({ mode: 'commit' }, { GITHUB_EVENT_PATH: eventPath });
      },
      (err) => err.code === 'E_FORK_COMMIT_FORBIDDEN'
    );

    // Path Traversal Security
    assert.throws(
      () => {
        parseInputs(['../../../../etc/passwd']);
      },
      (err) => err.message.includes('traverse parent directories') || err.code === 'E_PATH_TRAVERSAL'
    );
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

test('Reliability Dimension: Storage Adapters (Security, Boundary, and SSRF)', () => {
  // Path traversal rejection
  assert.throws(
    () => {
      validateStoragePath('../../etc/passwd');
    },
    (err) => err.code === 'E_PATH_TRAVERSAL'
  );

  // SSRF prevention against link-local cloud metadata
  assert.throws(
    () => {
      validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    },
    (err) => err.code === 'E_UNSAFE_URL' || err.code === 'E_SSRF_PROHIBITED' || err.message.includes('forbidden')
  );

  // SSRF prevention against localhost
  assert.throws(
    () => {
      validateSafeUrl('http://127.0.0.1:8080/internal');
    },
    (err) => err.code === 'E_UNSAFE_URL' || err.code === 'E_SSRF_PROHIBITED' || err.message.includes('forbidden')
  );
});

test('Reliability Dimension: Lens CLI (Security and Sandbox Safety)', async () => {
  // safeRead rejects non-existent or path escaped file
  await assert.rejects(
    async () => {
      await safeRead('../../../unauthorized-secret.txt', { maxBytes: 100 });
    },
    (err) => err.code === 'E_FILE_NOT_FOUND' || err.code === 'E_SYMLINK' || err.code === 'E_FILE_TOO_LARGE'
  );
});

test('Reliability Dimension: Crop Plugin (Stability and Boundary Clamping)', async () => {
  // Coordinates clamp cleanly without exceeding image boundaries
  const box = await calculateCropBox(1000, 1000, {
    mode: 'manual',
    x: -500,
    y: -500,
    width: 2000,
    height: 2000,
  });

  assert.equal(box.x, 0, 'X must clamp to 0');
  assert.equal(box.y, 0, 'Y must clamp to 0');
  assert.equal(box.width, 1000, 'Width must clamp to source width');
  assert.equal(box.height, 1000, 'Height must clamp to source height');

  // Platform presets export
  assert.ok(CROP_PRESETS.avatar);
  assert.ok(CROP_PRESETS.thumbnail);
  assert.ok(CROP_PRESETS.banner);
});

test('Reliability Dimension: Soak Test Execution (Leak and Memory Drift Detection)', async () => {
  // Runs 30 repeated conversions on core engine ensuring RSS growth stays strictly bounded
  const soakResult = await reliability.runSoakTest(
    async () => {
      await convertImage(reliability.PNG_TRANSPARENT_SAMPLE, {
        to: 'webp',
        quality: 85,
        clean: true,
      });
    },
    {
      iterations: 30,
      maxRssGrowthMb: 60,
      name: 'core-soak-verification',
    }
  );

  assert.equal(soakResult.iterations, 30);
  assert.equal(soakResult.leakDetected, false);
  assert.equal(soakResult.passed, true);
  assert.ok(soakResult.avgLatencyMs >= 0);
});
