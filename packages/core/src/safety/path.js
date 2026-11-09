'use strict';

const { createError } = require('../errors');

/**
 * Validates and normalizes paths strictly preventing path traversal attacks.
 * @param {string} filePath
 * @returns {string} Sanitized relative path
 * @throws {ZapwebpError}
 */
function validatePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw createError('E_PATH_TRAVERSAL', 'filePath must be a non-empty string.');
  }

  const byteLength = Buffer.byteLength(filePath, 'utf8');
  if (byteLength > 1024) {
    throw createError('E_PATH_TRAVERSAL', `Path exceeds maximum limit of 1024 bytes (received ${byteLength} bytes).`);
  }

  if (filePath.includes('\0')) {
    throw createError('E_PATH_TRAVERSAL', 'Path contains illegal null bytes.');
  }

  if (/^file:\/\//i.test(filePath)) {
    throw createError('E_PATH_TRAVERSAL', 'Absolute "file://" URI schemes are forbidden.');
  }

  if (/^[a-zA-Z]:[\\\/]/i.test(filePath)) {
    throw createError('E_PATH_TRAVERSAL', 'Absolute drive letter paths are forbidden.');
  }

  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw createError('E_PATH_TRAVERSAL', 'Directory traversal ("..") is strictly forbidden.');
    }
  }

  const cleaned = segments.filter((s) => s.length > 0 && s !== '.').join('/');
  if (!cleaned) {
    throw createError('E_PATH_TRAVERSAL', 'Resulting path is empty.');
  }

  return cleaned;
}

module.exports = {
  validatePath,
};

