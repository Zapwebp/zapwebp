'use strict';

const TRANSIENT_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
]);

const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Determines whether an error is transient and eligible for retry.
 * @param {any} err
 * @returns {boolean}
 */
function isTransient(err) {
  if (!err) return false;
  if (err.code && TRANSIENT_ERROR_CODES.has(err.code)) return true;
  if (typeof err.status === 'number' && TRANSIENT_HTTP_STATUSES.has(err.status)) return true;
  if (typeof err.statusCode === 'number' && TRANSIENT_HTTP_STATUSES.has(err.statusCode)) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('connection reset') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('service unavailable') ||
    msg.includes('bad gateway')
  );
}

/**
 * Asynchronously retries a function with exponential backoff on transient errors.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} [options={}]
 * @param {number} [options.maxAttempts=3]
 * @param {number} [options.baseDelayMs=500]
 * @param {(err: any) => boolean} [options.isTransientFn=isTransient]
 * @returns {Promise<T>}
 */
async function retry(fn, options = {}) {
  const { maxAttempts = 3, baseDelayMs = 500, isTransientFn = isTransient } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = isTransientFn(err);

      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }

      // Exponential backoff with small random jitter
      const jitter = Math.random() * 100;
      const delay = Math.round(baseDelayMs * Math.pow(2, attempt - 1) + jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = {
  isTransient,
  retry,
};

