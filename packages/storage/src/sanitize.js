'use strict';

const path = require('node:path');
const { validateSafeUrl, isPrivateIp } = require('@zapwebp/shared');

/**
 * Validates and normalizes a storage path, preventing path traversal and out-of-bounds access.
 * Enforces ISO 27001 / 27017 boundary controls:
 * - Max path length 1024 bytes
 * - Rejects null bytes
 * - Rejects directory traversal ('..')
 * - Rejects absolute filesystem paths (Windows drive letters, /etc/passwd)
 * - Rejects non-HTTP URL schemes (file://)
 *
 * @param {string} filePath - Input path
 * @returns {string} Sanitized relative path
 * @throws {Error} Throws with code E_PATH_TRAVERSAL if path violates security constraints
 */
function validateStoragePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    const err = new Error('E_PATH_TRAVERSAL: filePath must be a non-empty string.');
    err.code = 'E_PATH_TRAVERSAL';
    throw err;
  }

  // 1. Check byte length limit (1024 bytes)
  const byteLength = Buffer.byteLength(filePath, 'utf8');
  if (byteLength > 1024) {
    const err = new Error(`E_PATH_TRAVERSAL: Storage path exceeds maximum limit of 1024 bytes (received ${byteLength} bytes).`);
    err.code = 'E_PATH_TRAVERSAL';
    throw err;
  }

  // 2. Reject null bytes
  if (filePath.includes('\0')) {
    const err = new Error('E_PATH_TRAVERSAL: Storage path contains illegal null bytes.');
    err.code = 'E_PATH_TRAVERSAL';
    throw err;
  }

  // 3. Reject file:// scheme
  if (/^file:\/\//i.test(filePath)) {
    const err = new Error('E_PATH_TRAVERSAL: Absolute "file://" URI schemes are forbidden.');
    err.code = 'E_PATH_TRAVERSAL';
    throw err;
  }

  // 4. Reject Windows absolute drive letter paths (e.g. C:\Windows, D:/data)
  if (/^[a-zA-Z]:[\\\/]/i.test(filePath)) {
    const err = new Error('E_PATH_TRAVERSAL: Absolute drive letter paths are forbidden.');
    err.code = 'E_PATH_TRAVERSAL';
    throw err;
  }

  // Normalize separators to posix
  const normalized = filePath.replace(/\\/g, '/');

  // 5. Reject directory traversal '..' segments
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      const err = new Error('E_PATH_TRAVERSAL: Directory traversal ("..") is strictly forbidden.');
      err.code = 'E_PATH_TRAVERSAL';
      throw err;
    }
  }

  // 6. Strip leading and trailing slashes to keep path relative to bucket root
  const cleaned = segments.filter((s) => s.length > 0 && s !== '.').join('/');
  if (!cleaned) {
    const err = new Error('E_PATH_TRAVERSAL: Resulting storage path is empty.');
    err.code = 'E_PATH_TRAVERSAL';
    throw err;
  }

  return cleaned;
}

/**
 * Strips sensitive authentication tokens, passwords, and secret keys from logs and error strings.
 * Enforces zero-credential leak invariant.
 *
 * @param {string|Error} input - Error or message to redact
 * @returns {string} Redacted message
 */
function stripCredentials(input) {
  if (!input) return '';
  const message = typeof input === 'string' ? input : (input.message || String(input));

  return message
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]')
    .replace(/((?:key|token|secret|password)\s*[:=]\s*['"]?)[A-Za-z0-9_\-]{12,}(['"]?)/gi, '$1[REDACTED]$2')
    .replace(/(https?:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED]$2');
}

/**
 * Validates a storage adapter against the universal Zapwebp StorageAdapter contract.
 * Used for CI testing, runtime verification, and community adapter conformance.
 *
 * @param {any} adapter - Candidate storage adapter
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
function validateAdapterContract(adapter) {
  const errors = [];

  if (!adapter || typeof adapter !== 'object') {
    return { valid: false, errors: ['Adapter must be a non-null object.'] };
  }

  if (typeof adapter.name !== 'string' || !adapter.name.trim()) {
    errors.push('Adapter must have a non-empty string "name" property.');
  }

  if (typeof adapter.write !== 'function') {
    errors.push('Adapter must implement "write(bucket, path, bytes, opts): Promise<WriteResult>".');
  }

  if (typeof adapter.read !== 'function') {
    errors.push('Adapter must implement "read(bucket, path): Promise<Uint8Array>".');
  }

  if (typeof adapter.delete !== 'function') {
    errors.push('Adapter must implement "delete(bucket, path): Promise<void>".');
  }

  if (adapter.exists !== undefined && typeof adapter.exists !== 'function') {
    errors.push('Optional "exists(bucket, path)" must be a function if defined.');
  }

  if (adapter.list !== undefined && typeof adapter.list !== 'function') {
    errors.push('Optional "list(bucket, prefix)" must be a function if defined.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateStoragePath,
  stripCredentials,
  validateAdapterContract,
  validateSafeUrl,
  isPrivateIp,
};
