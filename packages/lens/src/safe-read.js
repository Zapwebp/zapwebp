'use strict';

const { lstat, readFile } = require('node:fs/promises');
const path = require('node:path');
const { LensError } = require('./errors');

const DEFAULT_MAX_READ_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Safely reads a file with strict symlink and file size limit guards.
 * Lens is strictly read-only and never follows symlinks.
 *
 * @param {string} filePath - Target file path
 * @param {{ maxBytes?: number }} [options] - Configuration options
 * @returns {Promise<Buffer>}
 * @throws {LensError}
 */
async function safeRead(filePath, options = {}) {
  const maxBytes = options.maxBytes || DEFAULT_MAX_READ_BYTES;
  const resolved = path.resolve(filePath);

  let stat;
  try {
    stat = await lstat(resolved);
  } catch (err) {
    throw new LensError({
      code: 'E_FILE_NOT_FOUND',
      message: `File does not exist or cannot be read: ${filePath}`,
      fix: 'Verify the path exists and your user account has read permissions.',
      cause: err,
    });
  }

  if (stat.isSymbolicLink()) {
    throw new LensError({
      code: 'E_SYMLINK',
      message: `Refusing to read symlink: ${filePath}`,
      fix: 'Pass the resolved physical path instead.',
    });
  }

  if (stat.size > maxBytes) {
    throw new LensError({
      code: 'E_FILE_TOO_LARGE',
      message: `File is ${stat.size} bytes, max allowed is ${maxBytes}`,
      fix: 'Use --max-bytes to raise the maximum read limit.',
    });
  }

  return readFile(resolved);
}

module.exports = {
  safeRead,
  DEFAULT_MAX_READ_BYTES,
};
