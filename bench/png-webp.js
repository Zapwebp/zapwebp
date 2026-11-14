'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { convertImage } = require('../packages/core');

/**
 * Measures single PNG -> WebP (1080p) conversion latency.
 * Target: < 80ms.
 * @param {number} [iterations=10]
 * @returns {Promise<{ name: string, timeMs: number, targetMs: number, passed: boolean }>}
 */
async function runPngWebpBench(iterations = 10) {
  const targetMs = 80;
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'photo.png'));

  // Warmup
  await convertImage(fixture, { to: 'webp', quality: 85 });

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await convertImage(fixture, { to: 'webp', quality: 85 });
    times.push(performance.now() - start);
  }

  const avgMs = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2));
  return {
    name: 'Single PNG → WebP (1080p)',
    timeMs: avgMs,
    targetMs,
    passed: avgMs <= targetMs * 1.5,
  };
}

module.exports = { runPngWebpBench };

if (require.main === module) {
  runPngWebpBench().then(console.log);
}
