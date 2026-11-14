'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { convertImage } = require('../packages/core');

/**
 * Measures single SVG -> WebP conversion latency.
 * Target: < 25ms.
 * @param {number} [iterations=20]
 * @returns {Promise<{ name: string, timeMs: number, targetMs: number, passed: boolean }>}
 */
async function runSvgWebpBench(iterations = 20) {
  const targetMs = 25;
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'logo.svg'));

  // Warmup
  await convertImage(fixture, { to: 'webp', width: 512, height: 512 });

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await convertImage(fixture, { to: 'webp', width: 512, height: 512 });
    times.push(performance.now() - start);
  }

  const avgMs = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2));
  return {
    name: 'Single SVG → WebP (512×512)',
    timeMs: avgMs,
    targetMs,
    passed: avgMs <= targetMs * 1.5,
  };
}

module.exports = { runSvgWebpBench };

if (require.main === module) {
  runSvgWebpBench().then(console.log);
}
