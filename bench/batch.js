'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { convert, parallelMap } = require('../packages/core');

/**
 * Measures 100-file SVG conversion throughput with the parallel pool.
 * Target: < 2.5s for 100 files.
 * @param {number} [count=100]
 * @returns {Promise<{ name: string, timeMs: number, targetMs: number, passed: boolean, count: number }>}
 */
async function runBatchBench(count = 100) {
  const targetMs = 2500;
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'logo.svg'));
  const batch = Array.from({ length: count }, () => fixture);

  // Warmup
  await convert(fixture, { to: 'webp' });

  const start = performance.now();
  await parallelMap(batch, 8, async (buf) => {
    return convert(buf, { to: 'webp' });
  });

  const totalTimeMs = Number((performance.now() - start).toFixed(2));
  return {
    name: `Batch of ${count} SVGs`,
    timeMs: totalTimeMs,
    targetMs,
    passed: totalTimeMs <= targetMs * 1.5,
    count,
  };
}

module.exports = { runBatchBench };

if (require.main === module) {
  runBatchBench().then(console.log);
}
