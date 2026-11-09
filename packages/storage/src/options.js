'use strict';

const { parseScales } = require('@zapwebp/core');
const { OUTPUT_FORMATS } = require('@zapwebp/shared');
const { validateAdapterContract } = require('./sanitize');

const DEFAULT_OPTIONS = Object.freeze({
  scale: Object.freeze([1]),
  baseWidth: 512,
  quality: 85,
  lossless: false,
  clean: true,
  maxBytes: 5 * 1024 * 1024, // 5 MB
  keepOriginal: false,
  outPrefix: '',
  onConflict: 'skip',
  emitManifest: true,
  background: undefined,
  defaultBackground: undefined,
  targetFormat: 'webp',
  strict: true,
  concurrency: 4,
});

const VALID_CONFLICT_STRATEGIES = new Set(['overwrite', 'skip', 'error']);
const VALID_PROVIDERS = new Set(['supabase', 'firebase', 'neocities', 'custom']);

/**
 * Validates and normalizes storage options against production constraints.
 * @param {import('./types').ZapwebpStorageOptions} [userOptions]
 * @returns {Required<import('./types').ZapwebpStorageOptions>}
 */
function resolveOptions(userOptions = {}) {
  if (userOptions !== null && typeof userOptions !== 'object') {
    throw new TypeError('Options must be a plain object.');
  }

  const raw = { ...userOptions };

  // 1. Multiplier scales
  const scale = userOptions.scale !== undefined
    ? parseScales(userOptions.scale)
    : [...DEFAULT_OPTIONS.scale];

  // 2. Base width
  let baseWidth = DEFAULT_OPTIONS.baseWidth;
  if (raw.baseWidth !== undefined) {
    const parsed = Number(raw.baseWidth);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4096) {
      throw new RangeError(`baseWidth must be an integer between 1 and 4096, received: ${raw.baseWidth}`);
    }
    baseWidth = parsed;
  }

  // 3. Quality
  let quality = DEFAULT_OPTIONS.quality;
  if (raw.quality !== undefined) {
    const parsed = Number(raw.quality);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new RangeError(`quality must be an integer between 1 and 100, received: ${raw.quality}`);
    }
    quality = parsed;
  }

  // 4. Max Bytes
  let maxBytes = DEFAULT_OPTIONS.maxBytes;
  if (raw.maxBytes !== undefined) {
    const parsed = Number(raw.maxBytes);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new RangeError(`maxBytes must be a positive number, received: ${raw.maxBytes}`);
    }
    maxBytes = Math.floor(parsed);
  }

  // 5. Conflict strategy
  let onConflict = DEFAULT_OPTIONS.onConflict;
  if (raw.onConflict !== undefined) {
    if (!VALID_CONFLICT_STRATEGIES.has(raw.onConflict)) {
      throw new TypeError(`onConflict must be one of "overwrite", "skip", "error", received: "${raw.onConflict}"`);
    }
    onConflict = raw.onConflict;
  }

  // 6. Output prefix
  let outPrefix = DEFAULT_OPTIONS.outPrefix;
  if (raw.outPrefix !== undefined && raw.outPrefix !== null) {
    if (typeof raw.outPrefix !== 'string') {
      throw new TypeError(`outPrefix must be a string, received: ${typeof raw.outPrefix}`);
    }
    outPrefix = raw.outPrefix.trim().replace(/^[\/\\]+|[\/\\]+$/g, '').replace(/\\/g, '/');
  }

  // 7. Target format & strict mode (Target Lock)
  let targetFormat = DEFAULT_OPTIONS.targetFormat;
  const rawTarget = raw.targetFormat || raw.lockTarget;
  if (rawTarget !== undefined) {
    const normalized = String(rawTarget).toLowerCase();
    if (!OUTPUT_FORMATS.includes(normalized)) {
      throw new TypeError(`targetFormat must be one of ${OUTPUT_FORMATS.join(', ')}, received: "${rawTarget}"`);
    }
    targetFormat = normalized;
  }
  const strict = raw.strict !== undefined ? Boolean(raw.strict) : DEFAULT_OPTIONS.strict;

  // 8. Concurrency
  let concurrency = DEFAULT_OPTIONS.concurrency;
  if (raw.concurrency !== undefined) {
    const parsed = Number(raw.concurrency);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 16) {
      throw new RangeError(`concurrency must be an integer between 1 and 16, received: ${raw.concurrency}`);
    }
    concurrency = parsed;
  }

  let transforms = Array.isArray(raw.transforms) ? [...raw.transforms] : [];
  if (raw.crop) {
    let cropTransformFn;
    try {
      const cropPkg = require('@zapwebp/crop');
      cropTransformFn = cropPkg.cropTransform;
    } catch {
      // Ignored if optional
    }
    if (cropTransformFn) {
      transforms.unshift(cropTransformFn(raw.crop));
    }
  }

  return {
    scale,
    baseWidth,
    quality,
    lossless: Boolean(raw.lossless),
    clean: raw.clean !== undefined ? Boolean(raw.clean) : DEFAULT_OPTIONS.clean,
    maxBytes,
    keepOriginal: Boolean(raw.keepOriginal),
    outPrefix,
    onConflict,
    emitManifest: raw.emitManifest !== undefined ? Boolean(raw.emitManifest) : DEFAULT_OPTIONS.emitManifest,
    background: typeof (raw.defaultBackground || raw.background) === 'string' ? (raw.defaultBackground || raw.background).trim() : undefined,
    defaultBackground: typeof (raw.defaultBackground || raw.background) === 'string' ? (raw.defaultBackground || raw.background).trim() : undefined,
    targetFormat,
    strict,
    concurrency,
    transforms: transforms.length > 0 ? transforms : undefined,
    policy: raw.policy || undefined,
  };
}

/**
 * Validates a unified StorageConfig object against the specification schema.
 * @param {import('./types').StorageConfig} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateStorageConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['StorageConfig must be an object.'] };
  }

  if (!config.provider || !VALID_PROVIDERS.has(config.provider)) {
    errors.push(`Invalid provider "${config.provider}". Must be one of: ${[...VALID_PROVIDERS].join(', ')}`);
  }

  if (typeof config.bucket !== 'string' || !config.bucket.trim()) {
    errors.push('StorageConfig requires a non-empty string "bucket" identifier.');
  }

  if (config.provider === 'neocities') {
    if (!config.credentials || !config.credentials.user || !config.credentials.password) {
      errors.push('Neocities provider requires "credentials.user" and "credentials.password".');
    }
  }

  if (config.provider === 'supabase' && !config.client) {
    errors.push('Supabase provider requires an initialized "client" instance.');
  }

  if (config.provider === 'firebase' && !config.client) {
    errors.push('Firebase provider requires an initialized FirebaseStorage "client" instance.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  DEFAULT_OPTIONS,
  VALID_CONFLICT_STRATEGIES,
  VALID_PROVIDERS,
  resolveOptions,
  validateStorageConfig,
  validateAdapterContract,
};
