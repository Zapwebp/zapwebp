'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { convert } = require('../packages/core');

/**
 * Measures warm-start latency per conversion across multiple iterations.
 * @param {number} [iterations=20]
 * @returns {Promise<{ name: string, timeMs: number, targetMs: number, passed: boolean, iterations: number }>}
 */
async function runWarmStartBench(iterations = 20) {
  const targetMs = 50;
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'logo.svg'));

  // Warmup pass
  await convert(fixture, { to: 'webp' });

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await convert(fixture, { to: 'webp' });
    times.push(performance.now() - start);
  }

  const avgMs = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2));
  return {
    name: 'Warm start (subsequent)',
    timeMs: avgMs,
    targetMs,
    passed: avgMs <= targetMs,
    iterations,
  };
}

module.exports = { runWarmStartBench };

if (require.main === module) {
  runWarmStartBench().then(console.log);
}
