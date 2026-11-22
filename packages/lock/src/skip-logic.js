'use strict';

/**
 * @typedef {object} LockMetadata
 * @property {string} version - Lock schema version
 * @property {string} inputSha256 - SHA-256 hash of original input bytes
 * @property {string} optionsSha256 - SHA-256 hash of canonical options
 * @property {string} engineVersion - Engine version that generated the lock
 * @property {string} targetFormat - Output format ('webp' | 'avif' | 'png' | 'jpeg' | etc.)
 * @property {string} convertedAt - ISO timestamp of conversion
 * @property {object} [optionsSummary] - Summary of conversion options
 */

/**
 * Evaluates whether an existing lock warrants skipping the conversion.
 * Allows intentional format changes (e.g. WebP -> AVIF or WebP -> PNG)
 * while skipping redundant identical requests (e.g. WebP -> WebP with same options).
 *
 * @param {LockMetadata} existingLock - The stored lock metadata
 * @param {object} [currentOptions={}] - The requested conversion options
 * @param {string} [currentInputSha256] - SHA-256 of the current input image
 * @param {object} [lockOptions={}] - Optional lock controls (force, invalidateOnEngineChange, engineVersion)
 * @param {function} [computeOptionsHashFn] - Function to compute options SHA-256
 * @param {string} [engineVersionConstant] - Fallback engine version
 * @returns {{ skip: boolean, reason: string }}
 */
function shouldSkipConversion(
  existingLock,
  currentOptions = {},
  currentInputSha256,
  lockOptions = {},
  computeOptionsHashFn,
  engineVersionConstant
) {
  if (!existingLock || typeof existingLock !== 'object') {
    return { skip: false, reason: 'no_lock_present' };
  }

  // 0. Force override: do not skip
  if (lockOptions.force || currentOptions.force) {
    return { skip: false, reason: 'forced' };
  }

  // 1. If input file changed, do not skip.
  if (currentInputSha256 && existingLock.inputSha256 && existingLock.inputSha256 !== currentInputSha256) {
    return { skip: false, reason: 'input_changed' };
  }

  // 2. If the requested target format is DIFFERENT from the locked format,
  //    do not skip. The user is intentionally creating a new derivative.
  const lockedFormat = (existingLock.targetFormat || existingLock.optionsSummary?.to || 'webp').toLowerCase().trim();
  const requestedFormat = (currentOptions.to || 'webp').toLowerCase().trim();
  if (lockedFormat !== requestedFormat) {
    return { skip: false, reason: 'new_target_format_requested' };
  }

  // 3. If the target format is the same, check the rest of the options hash.
  const computeHash = computeOptionsHashFn || require('./lock').computeOptionsHash;
  const currentOptionsSha256 = computeHash(currentOptions);
  if (existingLock.optionsSha256 && existingLock.optionsSha256 !== currentOptionsSha256) {
    return { skip: false, reason: 'options_changed' };
  }

  // 4. If engine version changed and invalidation is on, do not skip.
  const fallbackEngine = engineVersionConstant || require('./lock').ENGINE_VERSION;
  const activeEngineVersion = lockOptions.engineVersion || fallbackEngine;
  const invalidateOnEngineChange = lockOptions.invalidateOnEngineChange !== false && currentOptions.lock?.invalidateOnEngineChange !== false;
  if (
    invalidateOnEngineChange &&
    existingLock.engineVersion &&
    existingLock.engineVersion !== activeEngineVersion
  ) {
    return { skip: false, reason: 'engine_version_changed' };
  }

  // 5. Everything matches. Skip.
  return { skip: true, reason: 'identical_request' };
}

module.exports = {
  shouldSkipConversion,
};
