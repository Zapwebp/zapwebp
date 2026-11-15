'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fflate = require('fflate');

const { convertImage, parallelMap, registerFormat } = require('@zapwebp/core');
const { icoHandler } = require('../packages/format-ico/src/index');
const { BatchManager } = require('../packages/features/src/index');
const { resolveError } = require('../packages/ui/src/index');

registerFormat(icoHandler);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

test('Web Real-World: drops a transparent SVG and produces WebP with alpha preserved', async () => {
  const svgBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/tabler-home.svg'));

  const result = await convertImage(svgBytes, {
    to: 'webp',
    quality: 85,
  });

  assert.ok(result.data, 'Output buffer must exist');
  assert.equal(result.format, 'webp');
  assert.equal(result.alphaPreserved, true, 'Alpha channel must be preserved for transparent SVG');
  assert.ok(result.width > 0);
  assert.ok(result.height > 0);

  // Assert binary WebP container
  const buf = Buffer.from(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buf.subarray(8, 12).toString('ascii'), 'WEBP');
});

test('Web Real-World: batch converts 5 real SVG icons and produces in-memory ZIP bundle', async () => {
  const svgFiles = [
    'tabler-home.svg',
    'lucide-menu.svg',
    'simple-icons-github.svg',
    'logo-wordmark.svg',
    'diagram.svg',
  ];

  const items = svgFiles.map((filename) => ({
    name: filename,
    data: fs.readFileSync(path.join(FIXTURES_DIR, 'svg', filename)),
  }));

  const results = await parallelMap(items, 4, async (item) => {
    const res = await convertImage(item.data, {
      to: 'webp',
      quality: 85,
    });
    return { name: item.name, status: 'success', output: res.data };
  });

  assert.equal(results.length, svgFiles.length);

  // Prepare ZIP archive entries using fflate (same library used in web app)
  const zipEntries = {};
  for (const item of results) {
    assert.equal(item.status, 'success', `Conversion of ${item.name} should succeed`);
    assert.ok(item.output && item.output.length > 0);
    const outName = item.name.replace(/\.svg$/i, '.webp');
    zipEntries[outName] = item.output;
  }

  const zipBytes = fflate.zipSync(zipEntries, { level: 6 });
  assert.ok(zipBytes.byteLength > 0, 'ZIP bundle must be created');

  // Verify ZIP unzips and contains all 5 files
  const unzipped = fflate.unzipSync(zipBytes);
  const unzippedKeys = Object.keys(unzipped);
  assert.equal(unzippedKeys.length, 5);
  for (const filename of svgFiles) {
    const webpName = filename.replace(/\.svg$/i, '.webp');
    assert.ok(unzipped[webpName], `ZIP must contain ${webpName}`);
    assert.ok(unzipped[webpName].length > 0);
  }
});

test('Web Real-World: converts real Material Icon PNG to WebP and AVIF', async () => {
  const pngBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'png/material-icon-512.png'));

  // To WebP
  const webp = await convertImage(pngBytes, { to: 'webp', quality: 90 });
  assert.equal(webp.format, 'webp');
  assert.equal(webp.alphaPreserved, true);
  assert.equal(webp.width, 512);
  assert.equal(webp.height, 512);

  // To AVIF
  const avif = await convertImage(pngBytes, { to: 'avif', quality: 80 });
  assert.equal(avif.format, 'avif');
  assert.equal(avif.alphaPreserved, true);
  assert.equal(avif.width, 512);
  assert.equal(avif.height, 512);
});

test('Web Real-World: quality settings scale output size on real photos', async () => {
  const photoBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'jpg/unsplash-thumb.jpg'));

  const lowQuality = await convertImage(photoBytes, { to: 'webp', quality: 30 });
  const highQuality = await convertImage(photoBytes, { to: 'webp', quality: 95 });

  assert.ok(
    highQuality.data.byteLength > lowQuality.data.byteLength,
    `High quality (${highQuality.data.byteLength} B) must be larger than low quality (${lowQuality.data.byteLength} B)`
  );
});

test('Web Real-World: lossless mode produces verified lossless output', async () => {
  const svgBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/tabler-home.svg'));

  const lossless = await convertImage(svgBytes, {
    to: 'webp',
    lossless: true,
  });

  assert.equal(lossless.format, 'webp');
  assert.equal(lossless.lossless, true);
  assert.equal(lossless.alphaPreserved, true);
});

test('Web Real-World: converts real brand SVG to multi-size ICO container', async () => {
  const brandSvg = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/simple-icons-github.svg'));

  const icoResult = await convertImage(brandSvg, {
    to: 'ico',
    sizes: [16, 32, 48, 64, 128, 256],
  });

  assert.equal(icoResult.format, 'ico');
  assert.ok(icoResult.data.length > 500);

  // Convert that generated ICO back to WebP to verify container readability
  const webpResult = await convertImage(icoResult.data, {
    to: 'webp',
  });

  assert.equal(webpResult.format, 'webp');
  assert.equal(webpResult.width, 256, 'Should extract the 256x256 high-resolution entry');
  assert.equal(webpResult.alphaPreserved, true);
});

test('Web Real-World: security rejects active script injection SVG with E_UNSAFE_SVG', async () => {
  const scriptSvg = fs.readFileSync(path.join(FIXTURES_DIR, 'edge-cases/script-injection.svg'));

  await assert.rejects(
    async () => {
      await convertImage(scriptSvg, { to: 'webp' });
    },
    (err) => {
      assert.equal(err.code, 'E_UNSAFE_SVG');
      const resolved = resolveError(err);
      assert.ok(resolved.message.includes('Script') || resolved.message.includes('active') || resolved.message.includes('malicious') || resolved.message.includes('SVG'));
      return true;
    }
  );
});

test('Web Real-World: security rejects billion-laughs entity expansion XML attack', async () => {
  const xxeSvg = fs.readFileSync(path.join(FIXTURES_DIR, 'edge-cases/billion-laughs.svg'));

  await assert.rejects(
    async () => {
      await convertImage(xxeSvg, { to: 'webp' });
    },
    (err) => {
      assert.ok(
        err.code === 'E_UNSAFE_SVG' || err.code === 'E_CORRUPT_HEADER',
        `Should reject entity expansion attack, got code: ${err.code}`
      );
      return true;
    }
  );
});

test('Web Real-World: rejects empty 0-byte file and corrupt PNG chunks', async () => {
  const emptySvg = fs.readFileSync(path.join(FIXTURES_DIR, 'edge-cases/empty.svg'));
  await assert.rejects(
    async () => {
      await convertImage(emptySvg, { to: 'webp' });
    },
    (err) => {
      assert.equal(err.code, 'E_EMPTY_FILE');
      return true;
    }
  );

  const corruptPng = fs.readFileSync(path.join(FIXTURES_DIR, 'edge-cases/corrupt.png'));
  await assert.rejects(
    async () => {
      await convertImage(corruptPng, { to: 'webp' });
    },
    (err) => {
      assert.equal(err.code, 'E_CORRUPT_HEADER');
      return true;
    }
  );
});

test('Web Real-World: features BatchManager tracks states and concurrency', async () => {
  const svgBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'svg/tabler-home.svg'));
  const pngBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'png/material-icon-24.png'));

  const progressUpdates = [];

  const manager = new BatchManager({
    concurrency: 2,
    convertFn: async (file, options) => {
      return convertImage(file, options);
    },
  });

  manager.add([
    { id: '1', name: 'home.svg', file: svgBytes, options: { to: 'webp' } },
    { id: '2', name: 'icon.png', file: pngBytes, options: { to: 'webp' } },
  ]);

  const output = await manager.process({
    onProgress: (p) => progressUpdates.push(p),
  });

  assert.equal(output.results.length, 2);
  assert.equal(output.errors.length, 0);
  assert.equal(progressUpdates.length, 2);
  assert.ok(output.results[0].success);
  assert.ok(output.results[1].success);
});
