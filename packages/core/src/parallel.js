'use strict';

const os = require('node:os');

const DEFAULT_CONCURRENCY = Math.max(1, Math.min(os.cpus()?.length || 4, 8));

/**
 * Concurrently processes an array of items with a fixed concurrency worker pool.
 * Prevents memory thrashing while maximizing multi-core throughput.
 *
 * @template T, R
 * @param {T[]} items - Array of input items to process
 * @param {number} concurrency - Max simultaneous active promises
 * @param {(item: T, index: number) => Promise<R>} workerFn - Async function processing each item
 * @returns {Promise<R[]>}
 */
async function parallelMap(items, concurrency = DEFAULT_CONCURRENCY, workerFn) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await workerFn(items[index], index);
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * High-performance batch conversion manager.
 */
class ConversionPool {
  /**
   * @param {object} [options]
   * @param {number} [options.concurrency]
   */
  constructor(options = {}) {
    this.concurrency = options.concurrency || DEFAULT_CONCURRENCY;
  }

  /**
   * Processes a batch of inputs concurrently through a conversion function.
   *
   * @param {Array<any>} inputs
   * @param {object} options
   * @param {Function} convertFn
   * @returns {Promise<Array<any>>}
   */
  async processBatch(inputs, options, convertFn) {
    return parallelMap(inputs, this.concurrency, async (input, idx) => {
      try {
        const res = await convertFn(input, options);
        return { success: true, index: idx, output: res };
      } catch (err) {
        return { success: false, index: idx, error: err };
      }
    });
  }
}

const defaultPool = new ConversionPool();

module.exports = {
  parallelMap,
  ConversionPool,
  defaultPool,
  DEFAULT_CONCURRENCY,
};
