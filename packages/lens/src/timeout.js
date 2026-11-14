'use strict';

const { LensError } = require('./errors');

const DEFAULT_DECODE_TIMEOUT_MS = 5000;

/**
 * Wraps a promise in a timeout guard to prevent parser hangs or exponential backtracking DoS.
 *
 * @template T
 * @param {Promise<T>} promise - Asynchronous operation to monitor
 * @param {number} [ms=5000] - Timeout limit in milliseconds
 * @param {string} [label='Decode'] - Identifying label for error message
 * @returns {Promise<T>}
 * @throws {LensError}
 */
async function withTimeout(promise, ms = DEFAULT_DECODE_TIMEOUT_MS, label = 'Decode') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new LensError({
        code: 'E_DECODE_TIMEOUT',
        message: `Decode timed out after ${ms}ms (${label})`,
        fix: 'The file may be corrupted, truncated, or intentionally malformed.',
      }));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  withTimeout,
  DEFAULT_DECODE_TIMEOUT_MS,
};
