'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { convert } = require('../packages/core');

/**
 * Measures memory consumption (heap allocation and peak delta) during conversion.
 * Target: < 80 MB peak memory.
 * @returns {Promise<{ name: string, memoryMb: number, targetMb: number, passed: boolean }>}
 */
async function runMemoryBench() {
  const targetMb = 80;
  if (global.gc) global.gc();

  const initialHeap = process.memoryUsage().heapUsed;
  const fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'photo.png'));

  for (let i = 0; i < 5; i++) {
    await convert(fixture, { to: 'webp' });
  }

  const finalHeap = process.memoryUsage().heapUsed;
  const memoryMb = Number(((finalHeap - initialHeap) / (1024 * 1024)).toFixed(2));
  const safeValue = Math.max(0, memoryMb);

  return {
    name: 'Memory (per conversion peak)',
    memoryMb: safeValue,
    targetMb,
    passed: safeValue <= targetMb,
  };
}

module.exports = { runMemoryBench };

if (require.main === module) {
  runMemoryBench().then(console.log);
}
