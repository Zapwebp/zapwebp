'use strict';

const crypto = require('node:crypto');

const DEFAULT_MAX_CACHE_ENTRIES = 500;
const DEFAULT_MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Computes a deterministic SHA-256 cache key from input bytes, options, and engine version.
 *
 * @param {Buffer|Uint8Array} input - Input image bytes
 * @param {object} options - Conversion options
 * @param {string} [engineVersion='1.1.1'] - Core engine version
 * @returns {string}
 */
function computeCacheKey(input, options = {}, engineVersion = '1.1.1') {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  hash.update(`:v${engineVersion}:`);

  // Canonical sorted options string
  const sortedKeys = Object.keys(options).sort();
  for (const key of sortedKeys) {
    if (key === 'cache') continue;
    const val = options[key];
    if (val !== undefined && typeof val !== 'function') {
      hash.update(`${key}=${JSON.stringify(val)};`);
    }
  }

  return hash.digest('hex');
}

/**
 * High-performance, memory-bounded LRU Cache for deterministic conversion results.
 */
class ConversionCache {
  /**
   * @param {object} [options]
   * @param {number} [options.maxEntries=500]
   * @param {number} [options.maxBytes=52428800]
   */
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || DEFAULT_MAX_CACHE_ENTRIES;
    this.maxBytes = options.maxBytes || DEFAULT_MAX_CACHE_BYTES;
    this.entries = new Map();
    this.totalBytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retrieves a cached result by key and refreshes its LRU priority.
   * @param {string} key
   * @returns {object|null}
   */
  get(key) {
    if (!this.entries.has(key)) {
      this.misses++;
      return null;
    }

    const item = this.entries.get(key);
    // Refresh LRU order: delete and re-insert
    this.entries.delete(key);
    this.entries.set(key, item);
    this.hits++;

    // Return a shallow clone with a fresh Buffer copy to ensure caller mutation safety
    return {
      ...item,
      data: Buffer.from(item.data),
    };
  }

  /**
   * Stores a conversion result in the cache, evicting oldest entries if limits are exceeded.
   * @param {string} key
   * @param {object} result
   */
  set(key, result) {
    if (!result || !result.data) return;
    const byteLength = result.data.length;

    // Do not cache oversized individual items exceeding 25% of max cache capacity
    if (byteLength > this.maxBytes * 0.25) return;

    if (this.entries.has(key)) {
      const existing = this.entries.get(key);
      this.totalBytes -= existing.data.length;
      this.entries.delete(key);
    }

    // Evict least recently used entries if size or count limits are hit
    while (
      (this.entries.size >= this.maxEntries || this.totalBytes + byteLength > this.maxBytes) &&
      this.entries.size > 0
    ) {
      const oldestKey = this.entries.keys().next().value;
      const oldestItem = this.entries.get(oldestKey);
      this.totalBytes -= oldestItem.data.length;
      this.entries.delete(oldestKey);
    }

    this.entries.set(key, {
      ...result,
      data: Buffer.from(result.data),
      cachedAt: Date.now(),
    });
    this.totalBytes += byteLength;
  }

  /**
   * Clears all cached entries and resets statistics.
   */
  clear() {
    this.entries.clear();
    this.totalBytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns current cache statistics.
   * @returns {{ size: number, totalBytes: number, hits: number, misses: number, hitRate: number }}
   */
  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.entries.size,
      totalBytes: this.totalBytes,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Number((this.hits / total).toFixed(3)) : 0,
    };
  }
}

const defaultCache = new ConversionCache();

module.exports = {
  computeCacheKey,
  ConversionCache,
  defaultCache,
};
