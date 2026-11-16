'use strict';

const os = require('node:os');
const { ZapwebpError } = require('@zapwebp/shared');

const DEFAULT_CONCURRENCY = Math.max(1, Math.min(os.cpus()?.length || 4, 8));

/**
 * Concurrently processes an array of items with a fixed concurrency worker pool.
 * Prevents memory thrashing while maximizing multi-core throughput.
 * Stops all workers immediately on first error or abort signal to prevent resource leaks.
 *
 * @template T, R
 * @param {T[]} items - Array of input items to process
 * @param {number} [concurrency] - Max simultaneous active promises
 * @param {(item: T, index: number) => Promise<R>} workerFn - Async function processing each item
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Optional AbortSignal for external cancellation
 * @returns {Promise<R[]>}
 */
async function parallelMap(items, concurrency = DEFAULT_CONCURRENCY, workerFn, options = {}) {
  let actualConcurrency = concurrency;
  let actualWorkerFn = workerFn;
  let actualOptions = options;

  if (typeof concurrency === 'function') {
    actualWorkerFn = concurrency;
    actualConcurrency = DEFAULT_CONCURRENCY;
    actualOptions = typeof workerFn === 'object' && workerFn !== null ? workerFn : {};
  }

  if (!Array.isArray(items) || items.length === 0) return [];
  if (typeof actualWorkerFn !== 'function') {
    throw new TypeError('parallelMap workerFn must be a function.');
  }

  const signal = actualOptions?.signal;
  if (signal?.aborted) {
    throw new ZapwebpError({
      code: 'E_ABORTED',
      message: 'Operation aborted.',
      fix: 'Retry the operation when ready.',
    });
  }

  const sanitizedConcurrency = Number.isFinite(actualConcurrency) && actualConcurrency > 0
    ? Math.floor(actualConcurrency)
    : DEFAULT_CONCURRENCY;
  const limit = Math.max(1, Math.min(sanitizedConcurrency, items.length));
  const results = new Array(items.length);
  let currentIndex = 0;
  let aborted = false;
  let firstError = null;

  const onAbort = () => {
    aborted = true;
  };
  if (signal) {
    signal.addEventListener('abort', onAbort, { once: true });
  }

  async function worker() {
    while (!aborted && !signal?.aborted && currentIndex < items.length) {
      const index = currentIndex++;
      try {
        results[index] = await actualWorkerFn(items[index], index);
      } catch (err) {
        if (!firstError) firstError = err;
        aborted = true;
        throw err;
      }
    }
  }

  try {
    const workers = Array.from({ length: limit }, () => worker().catch(() => {}));
    await Promise.all(workers);
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
  }

  if (firstError) throw firstError;
  if (signal?.aborted) {
    throw new ZapwebpError({
      code: 'E_ABORTED',
      message: 'Operation aborted.',
      fix: 'Retry the operation when ready.',
    });
  }
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
