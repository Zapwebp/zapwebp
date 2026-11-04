'use strict';

/**
 * Batch Manager
 * Orchestrates queued conversions with concurrency limits and progress events.
 */
class BatchManager {
  /**
   * @param {object} [options]
   * @param {number} [options.concurrency=4] - Maximum concurrent workers
   * @param {(item: object, options?: object) => Promise<object>} [options.convertFn]
   */
  constructor(options = {}) {
    this.concurrency = Math.max(1, Math.min(16, Number(options.concurrency || 4)));
    this.convertFn = options.convertFn || (async () => { throw new Error('convertFn not configured'); });
    this.queue = [];
    this.running = 0;
    this.results = [];
    this.errors = [];
    this.total = 0;
    this.completed = 0;
  }

  /**
   * Adds an array of items to the batch queue.
   * @param {Array<{ id: string, file: Buffer | Uint8Array | string, options?: object }>} items
   */
  add(items) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      this.queue.push(item);
      this.total++;
    }
  }

  /**
   * Executes the batch queue with concurrency limiting.
   * @param {object} [callbacks]
   * @param {(itemResult: object) => void} [callbacks.onProgress]
   * @returns {Promise<{ results: object[], errors: object[], total: number }>}
   */
  async process(callbacks = {}) {
    const { onProgress } = callbacks;

    const runNext = async () => {
      if (this.queue.length === 0) return;
      const item = this.queue.shift();
      this.running++;

      try {
        const out = await this.convertFn(item.file, item.options);
        const itemResult = { id: item.id, name: item.name, success: true, result: out };
        this.results.push(itemResult);
        this.completed++;
        if (typeof onProgress === 'function') {
          onProgress({ completed: this.completed, total: this.total, itemResult });
        }
      } catch (err) {
        const errorResult = { id: item.id, name: item.name, success: false, error: err.message || String(err) };
        this.errors.push(errorResult);
        this.completed++;
        if (typeof onProgress === 'function') {
          onProgress({ completed: this.completed, total: this.total, errorResult });
        }
      } finally {
        this.running--;
        await runNext();
      }
    };

    const workers = [];
    const initialWorkers = Math.min(this.concurrency, this.queue.length);
    for (let i = 0; i < initialWorkers; i++) {
      workers.push(runNext());
    }

    await Promise.all(workers);
    return {
      results: this.results,
      errors: this.errors,
      total: this.total,
    };
  }
}

module.exports = {
  BatchManager,
};
