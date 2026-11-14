'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { safeRead } = require('./safe-read');
const { LensError } = require('./errors');

/**
 * Computes sha256 checksum for image bytes.
 * @param {Buffer|Uint8Array} bytes
 * @returns {string} Hex-encoded SHA-256
 */
function computeSha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/**
 * Verifies that a file matches an expected SHA-256 hash or manifest entry.
 *
 * @param {string} filePath - Path to file to verify
 * @param {{
 *   expectedSha256?: string,
 *   fromManifest?: string,
 *   maxBytes?: number,
 *   json?: boolean
 * }} [options]
 * @returns {Promise<{ file: string, sha256: string, expectedSha256: string, match: boolean }>}
 * @throws {LensError}
 */
async function verifyCommand(filePath, options = {}) {
  const bytes = await safeRead(filePath, options);
  const actualSha256 = computeSha256(bytes);

  let expectedSha256 = options.expectedSha256 ? options.expectedSha256.trim().toLowerCase() : null;

  if (options.fromManifest) {
    const manifestBytes = await safeRead(options.fromManifest, options);
    let manifest;
    try {
      manifest = JSON.parse(manifestBytes.toString('utf8'));
    } catch (err) {
      throw new LensError({
        code: 'E_INVALID_MANIFEST',
        message: `Failed to parse manifest JSON at ${options.fromManifest}: ${err.message}`,
        fix: 'Verify the manifest file contains valid JSON syntax.',
        cause: err,
      });
    }

    const baseName = path.basename(filePath);
    const resolvedPath = path.resolve(filePath);

    // Support standard Zapwebp manifest format or list/dictionary formats
    let entry = null;
    if (manifest.files && Array.isArray(manifest.files)) {
      entry = manifest.files.find((f) => f.path === filePath || f.path === baseName || f.file === baseName || path.resolve(f.path || f.file) === resolvedPath);
    } else if (manifest.entries && Array.isArray(manifest.entries)) {
      entry = manifest.entries.find((f) => f.path === filePath || f.path === baseName || f.file === baseName || path.resolve(f.path || f.file) === resolvedPath);
    } else if (manifest.files && typeof manifest.files === 'object') {
      entry = manifest.files[filePath] || manifest.files[baseName];
    } else if (Array.isArray(manifest)) {
      entry = manifest.find((f) => f.path === filePath || f.path === baseName || f.file === baseName);
    } else if (typeof manifest === 'object') {
      entry = manifest[filePath] || manifest[baseName];
    }

    if (!entry) {
      throw new LensError({
        code: 'E_MANIFEST_ENTRY_NOT_FOUND',
        message: `No manifest entry found for "${filePath}" in ${options.fromManifest}`,
        fix: 'Ensure the file is declared in the target manifest.',
      });
    }

    const hash = typeof entry === 'string' ? entry : (entry.sha256 || entry.hash || entry.checksum);
    if (!hash) {
      throw new LensError({
        code: 'E_MANIFEST_HASH_MISSING',
        message: `Manifest entry for "${filePath}" lacks a sha256 or hash property`,
        fix: 'Add a valid sha256 checksum to the manifest entry.',
      });
    }

    expectedSha256 = hash.trim().toLowerCase();
  }

  if (!expectedSha256) {
    throw new LensError({
      code: 'E_MISSING_EXPECTED_HASH',
      message: 'Either --expected-sha256 or --from-manifest must be provided to verify a file.',
      fix: 'Provide --expected-sha256 <hex> or --from-manifest <manifest.json>.',
    });
  }

  if (actualSha256 !== expectedSha256) {
    throw new LensError({
      code: 'E_VERIFY_MISMATCH',
      message: `Checksum mismatch for "${filePath}": expected ${expectedSha256}, got ${actualSha256}`,
      fix: 'The file has been modified or corrupted compared to the trusted specification.',
    });
  }

  const result = {
    file: filePath,
    sha256: actualSha256,
    expectedSha256,
    match: true,
  };

  if (!options.json) {
    process.stdout.write(`✅ Match: ${filePath} → sha256 ${actualSha256}\n`);
  }

  return result;
}

module.exports = {
  verifyCommand,
  computeSha256,
};
