'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ZapwebpError } = require('./errors');

/**
 * Standard Default Limits across all Zapwebp surfaces.
 */
const DEFAULT_LIMITS = Object.freeze({
  maxFilesPerRequest: 20,
  maxFilesPerSession: 100,
  maxFilesPerUser: null,
  maxBytesPerRequest: 104857600, // 100 MB (100 * 1024 * 1024)
  maxConcurrent: 4, // Backward-compatible alias for concurrency.perRequest
  concurrency: Object.freeze({
    perRequest: 4, // Batch worker pool per conversion request
    perUser: 4,    // Max active concurrent conversion requests per user
    global: 16,    // Server-wide concurrency ceiling across all users
  }),
  rateLimit: Object.freeze({
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  }),
});

/**
 * Formats a byte number into human-readable string.
 *
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string}
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

/**
 * Normalizes and resolves limit configuration against defaults.
 *
 * @param {Record<string, any>} [userLimits={}]
 * @returns {object} Normalized limits
 */
function resolveLimits(userLimits = {}) {
  if (!userLimits || typeof userLimits !== 'object') {
    return {
      ...DEFAULT_LIMITS,
      concurrency: { ...DEFAULT_LIMITS.concurrency },
    };
  }

  function parseNumberOrNull(val, fallback) {
    if (val === null || val === 'unlimited' || val === Infinity) return null;
    if (val !== undefined) {
      const num = Number(val);
      return Number.isFinite(num) && num >= 0 ? num : fallback;
    }
    return fallback;
  }

  const maxFilesPerRequest = parseNumberOrNull(
    userLimits.maxFilesPerRequest,
    DEFAULT_LIMITS.maxFilesPerRequest
  );

  const maxFilesPerSession = parseNumberOrNull(
    userLimits.maxFilesPerSession,
    DEFAULT_LIMITS.maxFilesPerSession
  );

  const maxFilesPerUser = parseNumberOrNull(
    userLimits.maxFilesPerUser,
    DEFAULT_LIMITS.maxFilesPerUser
  );

  const maxBytesPerRequest = parseNumberOrNull(
    userLimits.maxBytesPerRequest,
    DEFAULT_LIMITS.maxBytesPerRequest
  );

  const perRequest = parseNumberOrNull(
    userLimits.concurrency?.perRequest ?? userLimits.maxConcurrent,
    DEFAULT_LIMITS.concurrency.perRequest
  ) || 1;

  const perUser = parseNumberOrNull(
    userLimits.concurrency?.perUser,
    DEFAULT_LIMITS.concurrency.perUser
  );

  const global = parseNumberOrNull(
    userLimits.concurrency?.global,
    DEFAULT_LIMITS.concurrency.global
  );

  const concurrency = {
    perRequest,
    perUser,
    global,
  };

  let rateLimit = DEFAULT_LIMITS.rateLimit;
  if (userLimits.rateLimit === null || userLimits.rateLimit === 'unlimited' || userLimits.rateLimit === false) {
    rateLimit = null;
  } else if (userLimits.rateLimit && typeof userLimits.rateLimit === 'object') {
    rateLimit = {
      maxRequests: parseNumberOrNull(userLimits.rateLimit.maxRequests, 100) || 100,
      windowMs: parseNumberOrNull(userLimits.rateLimit.windowMs, 60000) || 60000,
    };
  }

  return {
    maxFilesPerRequest,
    maxFilesPerSession,
    maxFilesPerUser,
    maxBytesPerRequest,
    maxConcurrent: perRequest,
    concurrency,
    rateLimit,
  };
}

/**
 * Validates request batches against active limits and throws structured errors.
 *
 * @param {object} params
 * @param {number} params.filesCount - Number of files in the batch
 * @param {number} [params.totalBytes=0] - Total input byte size
 * @param {number} [params.sessionCount=0] - Files already processed in this session
 * @param {number} [params.userCount=0] - Files already processed by this user
 * @param {object} [params.limits] - Resolved limits object
 * @throws {ZapwebpError} When any limit is exceeded
 */
function evaluateLimits({
  filesCount = 0,
  totalBytes = 0,
  sessionCount = 0,
  userCount = 0,
  limits = DEFAULT_LIMITS,
} = {}) {
  const resolved = resolveLimits(limits);

  // 1. Files per request
  if (resolved.maxFilesPerRequest !== null && filesCount > resolved.maxFilesPerRequest) {
    throw new ZapwebpError({
      code: 'E_TOO_MANY_FILES',
      message: `This batch has ${filesCount} files. The limit is ${resolved.maxFilesPerRequest}.`,
      fix: `Drop ${resolved.maxFilesPerRequest} or fewer files, or raise the limit in settings.`,
      suggestedFix: { maxFiles: resolved.maxFilesPerRequest },
      retryable: true,
    });
  }

  // 2. Bytes per request
  if (resolved.maxBytesPerRequest !== null && totalBytes > resolved.maxBytesPerRequest) {
    throw new ZapwebpError({
      code: 'E_REQUEST_TOO_LARGE',
      message: `This batch is ${formatBytes(totalBytes)}. The limit is ${formatBytes(resolved.maxBytesPerRequest)}.`,
      fix: 'Reduce the batch size, or raise the limit.',
      suggestedFix: { maxBytes: resolved.maxBytesPerRequest },
      retryable: true,
    });
  }

  // 3. Files per session
  if (resolved.maxFilesPerSession !== null && sessionCount + filesCount > resolved.maxFilesPerSession) {
    throw new ZapwebpError({
      code: 'E_SESSION_LIMIT_EXCEEDED',
      message: `Session limit of ${resolved.maxFilesPerSession} files reached. Processed ${sessionCount + filesCount} files in this session.`,
      fix: "Start a new session with 'zap --reset-session', or raise the limit in .zapwebp/config.json.",
      retryable: false,
    });
  }

  // 4. Files per user
  if (resolved.maxFilesPerUser !== null && userCount + filesCount > resolved.maxFilesPerUser) {
    throw new ZapwebpError({
      code: 'E_USER_LIMIT_EXCEEDED',
      message: `User limit exceeded. Processed ${userCount + filesCount} files. The user limit is ${resolved.maxFilesPerUser}.`,
      fix: 'Wait for the quota reset period, or raise maxFilesPerUser.',
      retryable: false,
    });
  }
}

/**
 * Builds standard limits response metadata block.
 *
 * @param {object} params
 * @param {number} [params.filesCount=0]
 * @param {number} [params.totalBytes=0]
 * @param {number} [params.sessionCount=0]
 * @param {object} [params.limits]
 * @param {object} [params.rateLimit]
 * @param {object} [params.concurrencyStatus]
 * @returns {object} Response metadata block
 */
function createLimitsMetadata({
  filesCount = 0,
  totalBytes = 0,
  sessionCount = 0,
  limits = DEFAULT_LIMITS,
  rateLimit = null,
  concurrencyStatus = null,
} = {}) {
  const resolved = resolveLimits(limits);

  const remainingFiles = resolved.maxFilesPerRequest !== null
    ? Math.max(0, resolved.maxFilesPerRequest - filesCount)
    : null;

  const remainingBytes = resolved.maxBytesPerRequest !== null
    ? Math.max(0, resolved.maxBytesPerRequest - totalBytes)
    : null;

  const sessionUsed = sessionCount + filesCount;
  const sessionRemaining = resolved.maxFilesPerSession !== null
    ? Math.max(0, resolved.maxFilesPerSession - sessionUsed)
    : null;

  const metadata = {
    filesProcessed: filesCount,
    filesRemaining: remainingFiles,
    bytesProcessed: totalBytes,
    bytesRemaining: remainingBytes,
    maxFilesPerRequest: resolved.maxFilesPerRequest,
    usedFiles: filesCount,
    remainingFiles,
    maxBytesPerRequest: resolved.maxBytesPerRequest,
    usedBytes: totalBytes,
    remainingBytes,
    maxConcurrent: resolved.maxConcurrent,
    concurrency: {
      perRequest: resolved.concurrency.perRequest,
      perUser: resolved.concurrency.perUser,
      global: resolved.concurrency.global,
      ...(concurrencyStatus && typeof concurrencyStatus === 'object' ? concurrencyStatus : {}),
    },
    session: {
      maxFilesPerSession: resolved.maxFilesPerSession,
      usedFiles: sessionUsed,
      remainingFiles: sessionRemaining,
    },
  };

  if (rateLimit && typeof rateLimit === 'object') {
    metadata.rateLimit = rateLimit;
  }

  return metadata;
}

/**
 * Abstract Rate Limit Store.
 */
class RateLimitStore {
  get(key, windowMs) {
    throw new Error('RateLimitStore.get() not implemented');
  }

  increment(key, count, windowMs) {
    throw new Error('RateLimitStore.increment() not implemented');
  }

  clear(key) {
    throw new Error('RateLimitStore.clear() not implemented');
  }
}

/**
 * In-memory sliding/fixed window Rate Limit Store.
 */
class MemoryRateLimitStore extends RateLimitStore {
  constructor() {
    super();
    this.records = new Map();
  }

  get(key, windowMs) {
    const now = Date.now();
    const entry = this.records.get(key);
    if (!entry) return null;
    if (now - entry.windowStart >= windowMs) {
      this.records.delete(key);
      return null;
    }
    return { count: entry.count, windowStart: entry.windowStart };
  }

  increment(key, count, windowMs) {
    const now = Date.now();
    let entry = this.records.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { windowStart: now, count: 0 };
      this.records.set(key, entry);
    }
    entry.count += count;
    return { count: entry.count, windowStart: entry.windowStart };
  }

  clear(key) {
    if (key !== undefined) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }
}

/**
 * File-backed Atomic Rate Limit Store for multi-instance / multi-process coordination.
 */
class FileRateLimitStore extends RateLimitStore {
  /**
   * @param {object} [options]
   * @param {string} [options.filePath] - File path (defaults to .zapwebp/ratelimit.json)
   */
  constructor({ filePath = path.join('.zapwebp', 'ratelimit.json') } = {}) {
    super();
    this.filePath = path.resolve(filePath);
  }

  _read() {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    } catch {
      return {};
    }
  }

  _write(data) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');

      let renamed = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          fs.renameSync(tmp, this.filePath);
          renamed = true;
          break;
        } catch {
          if (attempt === 4) {
            try {
              fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
            } catch {}
          }
        }
      }
      try {
        if (!renamed && fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {}
    } catch {}
  }

  get(key, windowMs) {
    const data = this._read();
    const entry = data[key];
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.windowStart >= windowMs) {
      delete data[key];
      this._write(data);
      return null;
    }
    return { count: entry.count, windowStart: entry.windowStart };
  }

  increment(key, count, windowMs) {
    const data = this._read();
    const now = Date.now();

    // Prune stale entries
    for (const [k, v] of Object.entries(data)) {
      if (now - v.windowStart >= windowMs) {
        delete data[k];
      }
    }

    let entry = data[key];
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { windowStart: now, count: 0 };
      data[key] = entry;
    }
    entry.count += count;
    this._write(data);
    return { count: entry.count, windowStart: entry.windowStart };
  }

  clear(key) {
    if (key !== undefined) {
      const data = this._read();
      delete data[key];
      this._write(data);
    } else {
      try {
        if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
      } catch {}
    }
  }
}

/**
 * Universal Rate Limiter supporting memory, file-backed atomic multi-instance, and custom stores.
 */
class RateLimiter {
  /**
   * @param {object} [options]
   * @param {number} [options.maxRequests=100]
   * @param {number} [options.windowMs=60000]
   * @param {RateLimitStore} [options.store]
   * @param {string} [options.keyPrefix='']
   */
  constructor({
    maxRequests = 100,
    windowMs = 60000,
    store = null,
    keyPrefix = '',
  } = {}) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.store = store || new MemoryRateLimitStore();
    this.keyPrefix = keyPrefix;
  }

  _resolveKey(key) {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  /**
   * Checks whether the given key is allowed under rate limits.
   *
   * @param {string} [key='default']
   * @returns {boolean} True if allowed
   */
  check(key = 'default') {
    const k = this._resolveKey(key);
    const entry = this.store.get(k, this.windowMs);
    if (!entry) return true;
    return entry.count < this.maxRequests;
  }

  /**
   * Asynchronous rate check (for async multi-instance/distributed stores).
   * @param {string} [key='default']
   * @returns {Promise<boolean>}
   */
  async checkAsync(key = 'default') {
    const k = this._resolveKey(key);
    const entry = await this.store.get(k, this.windowMs);
    if (!entry) return true;
    return entry.count < this.maxRequests;
  }

  /**
   * Records a request for the key. Throws ZapwebpError if rate limit is exceeded.
   *
   * @param {string} [key='default']
   * @param {number} [count=1]
   */
  record(key = 'default', count = 1) {
    const k = this._resolveKey(key);
    const now = Date.now();
    const entryBefore = this.store.get(k, this.windowMs);
    if (entryBefore && entryBefore.count + count > this.maxRequests) {
      const resetInSec = Math.max(1, Math.ceil((entryBefore.windowStart + this.windowMs - now) / 1000));
      throw new ZapwebpError({
        code: 'E_RATE_LIMIT',
        message: `Too many requests. Try again in ${resetInSec} seconds.`,
        fix: 'Wait, or raise the rate limit.',
        retryable: true,
      });
    }

    const updated = this.store.increment(k, count, this.windowMs);
    if (updated.count > this.maxRequests) {
      const resetInSec = Math.max(1, Math.ceil((updated.windowStart + this.windowMs - now) / 1000));
      throw new ZapwebpError({
        code: 'E_RATE_LIMIT',
        message: `Too many requests. Try again in ${resetInSec} seconds.`,
        fix: 'Wait, or raise the rate limit.',
        retryable: true,
      });
    }
  }

  /**
   * Asynchronously records a request for the key.
   * @param {string} [key='default']
   * @param {number} [count=1]
   * @returns {Promise<void>}
   */
  async recordAsync(key = 'default', count = 1) {
    const k = this._resolveKey(key);
    const now = Date.now();
    const entryBefore = await this.store.get(k, this.windowMs);
    if (entryBefore && entryBefore.count + count > this.maxRequests) {
      const resetInSec = Math.max(1, Math.ceil((entryBefore.windowStart + this.windowMs - now) / 1000));
      throw new ZapwebpError({
        code: 'E_RATE_LIMIT',
        message: `Too many requests. Try again in ${resetInSec} seconds.`,
        fix: 'Wait, or raise the rate limit.',
        retryable: true,
      });
    }

    const updated = await this.store.increment(k, count, this.windowMs);
    if (updated.count > this.maxRequests) {
      const resetInSec = Math.max(1, Math.ceil((updated.windowStart + this.windowMs - now) / 1000));
      throw new ZapwebpError({
        code: 'E_RATE_LIMIT',
        message: `Too many requests. Try again in ${resetInSec} seconds.`,
        fix: 'Wait, or raise the rate limit.',
        retryable: true,
      });
    }
  }

  /**
   * Returns remaining requests allowed in current window.
   *
   * @param {string} [key='default']
   * @returns {number}
   */
  remaining(key = 'default') {
    const k = this._resolveKey(key);
    const entry = this.store.get(k, this.windowMs);
    if (!entry) return this.maxRequests;
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Asynchronously returns remaining requests allowed in current window.
   * @param {string} [key='default']
   * @returns {Promise<number>}
   */
  async remainingAsync(key = 'default') {
    const k = this._resolveKey(key);
    const entry = await this.store.get(k, this.windowMs);
    if (!entry) return this.maxRequests;
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Returns remaining seconds until the rate limit window resets.
   *
   * @param {string} [key='default']
   * @returns {number} Seconds until reset
   */
  resetIn(key = 'default') {
    const k = this._resolveKey(key);
    const entry = this.store.get(k, this.windowMs);
    if (!entry) return 0;
    const now = Date.now();
    return Math.max(1, Math.ceil((entry.windowStart + this.windowMs - now) / 1000));
  }

  /**
   * Asynchronously returns remaining seconds until the rate limit window resets.
   * @param {string} [key='default']
   * @returns {Promise<number>}
   */
  async resetInAsync(key = 'default') {
    const k = this._resolveKey(key);
    const entry = await this.store.get(k, this.windowMs);
    if (!entry) return 0;
    const now = Date.now();
    return Math.max(1, Math.ceil((entry.windowStart + this.windowMs - now) / 1000));
  }

  /**
   * Clears rate limit state for key or all keys.
   * @param {string} [key]
   */
  clear(key) {
    const k = key !== undefined ? this._resolveKey(key) : undefined;
    return this.store.clear(k);
  }

  /**
   * Asynchronously clears rate limit state.
   * @param {string} [key]
   * @returns {Promise<void>}
   */
  async clearAsync(key) {
    const k = key !== undefined ? this._resolveKey(key) : undefined;
    return await this.store.clear(k);
  }
}

/**
 * Multi-tier Concurrency Limiter:
 * - perRequest: worker pool within a single batch
 * - perUser: max concurrent jobs per user
 * - global: server-wide ceiling across all users
 */
class ConcurrencyLimiter {
  /**
   * @param {object} [options]
   * @param {number|null} [options.perRequest=4]
   * @param {number|null} [options.perUser=4]
   * @param {number|null} [options.global=16]
   * @param {object} [options.concurrency]
   */
  constructor(options = {}) {
    const conf = options.concurrency || options;
    const parse = (val, def) => {
      if (val === null || val === 'unlimited' || val === Infinity) return null;
      if (val !== undefined) {
        const n = Number(val);
        return Number.isFinite(n) && n >= 0 ? n : def;
      }
      return def;
    };

    this.perRequest = parse(conf.perRequest ?? options.perRequest, 4);
    this.perUser = parse(conf.perUser ?? options.perUser, 4);
    this.global = parse(conf.global ?? options.global, 16);

    this.activeGlobal = 0;
    this.activeUsers = new Map();
  }

  /**
   * Attempts to acquire execution capacity. Throws E_CONCURRENCY_LIMIT_EXCEEDED if limit is reached.
   * @param {object} [params]
   * @param {string} [params.userId='anonymous']
   * @param {number} [params.count=1]
   * @returns {{ release: () => void }} Token to release capacity
   */
  acquire({ userId = 'anonymous', count = 1 } = {}) {
    if (this.global !== null && this.activeGlobal + count > this.global) {
      throw new ZapwebpError({
        code: 'E_CONCURRENCY_LIMIT_EXCEEDED',
        message: `Global concurrency limit of ${this.global} reached. Currently active conversions: ${this.activeGlobal}.`,
        fix: 'Wait for active conversions to finish or raise concurrency.global in settings.',
        retryable: true,
      });
    }

    if (this.perUser !== null) {
      const userActive = this.activeUsers.get(userId) || 0;
      if (userActive + count > this.perUser) {
        throw new ZapwebpError({
          code: 'E_CONCURRENCY_LIMIT_EXCEEDED',
          message: `User concurrency limit of ${this.perUser} reached for user "${userId}". Currently active conversions: ${userActive}.`,
          fix: 'Wait for your running conversions to complete or raise concurrency.perUser.',
          retryable: true,
        });
      }
    }

    this.activeGlobal += count;
    this.activeUsers.set(userId, (this.activeUsers.get(userId) || 0) + count);

    let released = false;
    return {
      release: () => {
        if (!released) {
          released = true;
          this.release({ userId, count });
        }
      },
    };
  }

  /**
   * Releases active execution capacity.
   * @param {object} [params]
   * @param {string} [params.userId='anonymous']
   * @param {number} [params.count=1]
   */
  release({ userId = 'anonymous', count = 1 } = {}) {
    this.activeGlobal = Math.max(0, this.activeGlobal - count);
    const userActive = this.activeUsers.get(userId) || 0;
    const nextUser = Math.max(0, userActive - count);
    if (nextUser <= 0) {
      this.activeUsers.delete(userId);
    } else {
      this.activeUsers.set(userId, nextUser);
    }
  }

  /**
   * Executes task with automatic acquire and release in finally.
   * @param {() => Promise<any>} taskFn
   * @param {object} [params]
   * @param {string} [params.userId='anonymous']
   * @param {number} [params.count=1]
   * @returns {Promise<any>}
   */
  async run(taskFn, { userId = 'anonymous', count = 1 } = {}) {
    const token = this.acquire({ userId, count });
    try {
      return await taskFn();
    } finally {
      token.release();
    }
  }

  /**
   * Retrieves active concurrency status.
   * @param {object} [params]
   * @param {string} [params.userId='anonymous']
   * @returns {object}
   */
  getStatus({ userId = 'anonymous' } = {}) {
    return {
      activeGlobal: this.activeGlobal,
      maxGlobal: this.global,
      activeUser: this.activeUsers.get(userId) || 0,
      maxUser: this.perUser,
      perRequest: this.perRequest,
    };
  }
}

module.exports = {
  DEFAULT_LIMITS,
  resolveLimits,
  formatBytes,
  evaluateLimits,
  createLimitsMetadata,
  RateLimitStore,
  MemoryRateLimitStore,
  FileRateLimitStore,
  RateLimiter,
  ConcurrencyLimiter,
};
