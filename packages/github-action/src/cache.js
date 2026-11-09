'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CACHE_DIR = '.zapwebp';
const HASHES_FILE = 'hashes.json';

/**
 * Computes SHA-256 digest for input buffer combined with options fingerprint.
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {string}
 */
function computeFileHash(buffer, options = {}) {
  const optionsKey = JSON.stringify({
    format: options.format || 'webp',
    scale: options.scale || [1],
    baseWidth: options.baseWidth || 512,
    quality: options.quality || 85,
    lossless: Boolean(options.lossless),
    clean: options.clean !== false,
  });

  return crypto
    .createHash('sha256')
    .update(buffer)
    .update(optionsKey)
    .digest('hex');
}

/**
 * Loads the existing hash cache from `.zapwebp/hashes.json`.
 * @param {string} rootDir
 * @returns {Record<string, string>}
 */
function loadCache(rootDir) {
  const filePath = path.join(rootDir, CACHE_DIR, HASHES_FILE);
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persists the hash cache to `.zapwebp/hashes.json`.
 * @param {string} rootDir
 * @param {Record<string, string>} cache
 */
function saveCache(rootDir, cache) {
  const dirPath = path.join(rootDir, CACHE_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, HASHES_FILE);
  fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), 'utf8');
}

/**
 * Determines whether a file requires conversion or can be skipped via hash cache.
 * @param {string} relPath
 * @param {string} currentHash
 * @param {string[]} expectedOutputPaths
 * @param {Record<string, string>} cache
 * @returns {boolean}
 */
function shouldConvert(relPath, currentHash, expectedOutputPaths, cache) {
  // If outputs do not exist on disk, must convert
  for (const outPath of expectedOutputPaths) {
    if (!fs.existsSync(outPath)) {
      return true;
    }
  }

  // If hash matches previous recorded run, skip conversion
  if (cache[relPath] && cache[relPath] === currentHash) {
    return false;
  }

  return true;
}

module.exports = {
  CACHE_DIR,
  HASHES_FILE,
  computeFileHash,
  loadCache,
  saveCache,
  shouldConvert,
};

