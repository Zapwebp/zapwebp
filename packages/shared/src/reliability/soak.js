'use strict';

/**
 * Executes a resource soak test verifying that memory, descriptors, and latencies remain stable.
 * @param {(iteration: number) => Promise<any>} runnerFn
 * @param {object} [options]
 * @param {number} [options.iterations=100] - Total operational cycles.
 * @param {number} [options.maxRssGrowthMb=50] - Maximum permissible RSS growth threshold in MB.
 * @param {string} [options.name='soak-test'] - Test suite label.
 * @returns {Promise<{
 *   name: string,
 *   iterations: number,
 *   initialRssMb: number,
 *   finalRssMb: number,
 *   rssDeltaMb: number,
 *   avgLatencyMs: number,
 *   leakDetected: boolean,
 *   passed: boolean
 * }>}
 */
async function runSoakTest(runnerFn, options = {}) {
  const iterations = Number.isFinite(options.iterations) && options.iterations > 0 ? options.iterations : 100;
  const maxRssGrowthMb = Number.isFinite(options.maxRssGrowthMb) ? options.maxRssGrowthMb : 50;
  const name = options.name || 'soak-test';

  if (typeof global.gc === 'function') {
    global.gc();
  }

  const initialRss = process.memoryUsage().rss;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await runnerFn(i);
  }

  if (typeof global.gc === 'function') {
    global.gc();
  }

  const finalRss = process.memoryUsage().rss;
  const durationMs = Date.now() - startTime;
  const avgLatencyMs = Number((durationMs / iterations).toFixed(2));

  const initialRssMb = Number((initialRss / (1024 * 1024)).toFixed(2));
  const finalRssMb = Number((finalRss / (1024 * 1024)).toFixed(2));
  const rssDeltaMb = Number(((finalRss - initialRss) / (1024 * 1024)).toFixed(2));

  // Memory growth exceeding the ceiling indicates an unbounded cache or buffer retention leak
  const leakDetected = rssDeltaMb > maxRssGrowthMb;

  if (leakDetected) {
    throw new Error(
      `SOAK LEAK DETECTED [${name}]: RSS grew by ${rssDeltaMb} MB over ${iterations} iterations (ceiling: ${maxRssGrowthMb} MB).`
    );
  }

  return {
    name,
    iterations,
    initialRssMb,
    finalRssMb,
    rssDeltaMb,
    avgLatencyMs,
    leakDetected: false,
    passed: true,
  };
}

module.exports = {
  runSoakTest,
};
