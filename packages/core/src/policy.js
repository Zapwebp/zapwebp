'use strict';

const { DEFAULT_CONVERSION_POLICY, ZapwebpError } = require('@zapwebp/shared');

/**
 * Normalizes and validates a ConversionPolicy configuration object.
 * @param {object} [customPolicy]
 * @param {object} [optionsFallback]
 * @returns {object}
 */
function resolvePolicy(customPolicy = {}, optionsFallback = {}) {
  const policy = customPolicy || {};

  // 1. Quality
  const qualityConfig = policy.quality || {};
  let mode = qualityConfig.mode || (optionsFallback.lossless ? 'lossless' : undefined);
  if (!mode) mode = DEFAULT_CONVERSION_POLICY.quality.mode;
  if (!['lossy', 'lossless', 'auto'].includes(mode)) {
    throw new Error(`Policy quality.mode must be 'lossy', 'lossless', or 'auto' (received "${mode}").`);
  }

  const defaultQuality = qualityConfig.default !== undefined
    ? Number(qualityConfig.default)
    : (optionsFallback.quality !== undefined ? Number(optionsFallback.quality) : DEFAULT_CONVERSION_POLICY.quality.default);

  if (!Number.isInteger(defaultQuality) || defaultQuality < 1 || defaultQuality > 100) {
    throw new Error('Policy quality.default must be an integer between 1 and 100.');
  }

  const perFormat = {};
  if (qualityConfig.perFormat && typeof qualityConfig.perFormat === 'object') {
    for (const [fmt, q] of Object.entries(qualityConfig.perFormat)) {
      const normalizedFmt = fmt.toLowerCase() === 'jpg' ? 'jpeg' : fmt.toLowerCase();
      const numQ = Number(q);
      if (Number.isInteger(numQ) && numQ >= 1 && numQ <= 100) {
        perFormat[normalizedFmt] = numQ;
      }
    }
  }

  // 2. Limits
  const limitsConfig = policy.limits || {};
  const minInputBytes = limitsConfig.minInputBytes !== undefined
    ? Number(limitsConfig.minInputBytes)
    : (optionsFallback.minInputBytes !== undefined ? Number(optionsFallback.minInputBytes) : undefined);

  if (minInputBytes !== undefined && (!Number.isFinite(minInputBytes) || minInputBytes < 0)) {
    throw new Error('Policy limits.minInputBytes must be a non-negative number.');
  }

  const maxInputBytes = limitsConfig.maxInputBytes !== undefined
    ? Number(limitsConfig.maxInputBytes)
    : (optionsFallback.maxBytes !== undefined ? Number(optionsFallback.maxBytes) : DEFAULT_CONVERSION_POLICY.limits.maxInputBytes);

  if (!Number.isFinite(maxInputBytes) || maxInputBytes <= 0) {
    throw new Error('Policy limits.maxInputBytes must be a positive number.');
  }

  if (minInputBytes !== undefined && minInputBytes > maxInputBytes) {
    throw new Error(`Policy limits.minInputBytes (${minInputBytes}) cannot exceed maxInputBytes (${maxInputBytes}).`);
  }

  const minOutputBytes = limitsConfig.minOutputBytes !== undefined
    ? Number(limitsConfig.minOutputBytes)
    : (optionsFallback.minOutputBytes !== undefined ? Number(optionsFallback.minOutputBytes) : undefined);

  if (minOutputBytes !== undefined && (!Number.isFinite(minOutputBytes) || minOutputBytes < 0)) {
    throw new Error('Policy limits.minOutputBytes must be a non-negative number.');
  }

  const maxOutputBytes = limitsConfig.maxOutputBytes !== undefined
    ? Number(limitsConfig.maxOutputBytes)
    : (optionsFallback.maxOutputBytes !== undefined ? Number(optionsFallback.maxOutputBytes) : undefined);

  if (maxOutputBytes !== undefined && (!Number.isFinite(maxOutputBytes) || maxOutputBytes <= 0)) {
    throw new Error('Policy limits.maxOutputBytes must be a positive number.');
  }

  if (minOutputBytes !== undefined && maxOutputBytes !== undefined && minOutputBytes > maxOutputBytes) {
    throw new Error(`Policy limits.minOutputBytes (${minOutputBytes}) cannot exceed maxOutputBytes (${maxOutputBytes}).`);
  }

  const targetOutputBytes = limitsConfig.targetOutputBytes !== undefined
    ? Number(limitsConfig.targetOutputBytes)
    : (optionsFallback.targetOutputBytes !== undefined ? Number(optionsFallback.targetOutputBytes) : undefined);

  // 3. Formats Allowlist / Denylist & Same-Format Action
  const formatsConfig = policy.formats || {};
  const sameFormatRaw = formatsConfig.sameFormat || optionsFallback.sameFormat || DEFAULT_CONVERSION_POLICY.formats.sameFormat;
  const sameFormat = ['passthrough', 'reencode', 'reject'].includes(sameFormatRaw) ? sameFormatRaw : 'passthrough';

  const normalizeList = (list, fallbackStr) => {
    if (Array.isArray(list)) {
      return list.map((f) => String(f).toLowerCase().trim() === 'jpg' ? 'jpeg' : String(f).toLowerCase().trim()).filter(Boolean);
    }
    if (typeof list === 'string') {
      return list.split(',').map((f) => f.toLowerCase().trim() === 'jpg' ? 'jpeg' : f.toLowerCase().trim()).filter(Boolean);
    }
    if (fallbackStr && typeof fallbackStr === 'string') {
      return fallbackStr.split(',').map((f) => f.toLowerCase().trim() === 'jpg' ? 'jpeg' : f.toLowerCase().trim()).filter(Boolean);
    }
    return [];
  };

  const accept = normalizeList(formatsConfig.accept, optionsFallback.accept);
  const reject = normalizeList(formatsConfig.reject, optionsFallback.reject);

  // 4. Size Mode
  const sizeConfig = policy.size || {};
  const sizeModeRaw = sizeConfig.mode || optionsFallback.sizeMode || (optionsFallback.strict ? 'strict' : undefined) || DEFAULT_CONVERSION_POLICY.size.mode;
  const sizeMode = ['strict', 'compress', 'flexible'].includes(sizeModeRaw) ? sizeModeRaw : 'compress';

  // 5. Advanced
  const advancedConfig = policy.advanced || {};
  const effort = advancedConfig.effort !== undefined
    ? Number(advancedConfig.effort)
    : (optionsFallback.effort !== undefined ? Number(optionsFallback.effort) : DEFAULT_CONVERSION_POLICY.advanced.effort);

  const stripMetadata = advancedConfig.stripMetadata !== undefined
    ? Boolean(advancedConfig.stripMetadata)
    : (optionsFallback.clean !== undefined ? Boolean(optionsFallback.clean) : DEFAULT_CONVERSION_POLICY.advanced.stripMetadata);

  const preserveColorProfile = advancedConfig.preserveColorProfile !== undefined
    ? Boolean(advancedConfig.preserveColorProfile)
    : DEFAULT_CONVERSION_POLICY.advanced.preserveColorProfile;

  return {
    quality: {
      mode,
      default: defaultQuality,
      perFormat,
    },
    limits: {
      minInputBytes,
      maxInputBytes,
      minOutputBytes,
      maxOutputBytes,
      targetOutputBytes,
    },
    formats: {
      accept,
      reject,
      sameFormat,
    },
    size: {
      mode: sizeMode,
    },
    advanced: {
      effort,
      stripMetadata,
      preserveColorProfile,
    },
  };
}

/**
 * Validates input buffer against policy size limits and format allowlist before decoding.
 * Throws structured ZapwebpError on policy violations.
 * 
 * @param {object} params
 * @param {object} params.policy
 * @param {Buffer} params.data
 * @param {string} params.detectedFormat
 */
function checkPolicyInput({ policy, data, detectedFormat }) {
  if (!policy || !data) return;

  // 1. Min Input Bytes (before decode memory allocation)
  if (policy.limits?.minInputBytes && data.length < policy.limits.minInputBytes) {
    throw new ZapwebpError({
      code: 'E_INPUT_TOO_SMALL',
      message: `Input is ${data.length} bytes, minimum required is ${policy.limits.minInputBytes} bytes.`,
      fix: 'Provide an image file meeting the minimum size requirement.',
      inputBytes: data.length,
      minBytes: policy.limits.minInputBytes,
      suggestedFix: {
        minInputBytes: data.length,
        reason: 'Input is smaller than the minimum allowed ingress bytes.',
      },
    });
  }

  // 2. Max Input Bytes (before decode memory allocation)
  if (policy.limits?.maxInputBytes && data.length > policy.limits.maxInputBytes) {
    throw new ZapwebpError({
      code: 'E_INPUT_TOO_LARGE',
      message: `Input is ${data.length} bytes, max is ${policy.limits.maxInputBytes}.`,
      fix: 'Compress the file, or increase maxInputBytes.',
      inputBytes: data.length,
      maxBytes: policy.limits.maxInputBytes,
      suggestedFix: {
        maxInputBytes: Math.ceil(data.length * 1.05),
        reason: 'Input exceeds maximum allowed ingress bytes.',
      },
    });
  }

  // 2. Format Allowlist & Denylist
  const fmt = (detectedFormat || '').toLowerCase() === 'jpg' ? 'jpeg' : (detectedFormat || '').toLowerCase();
  const acceptList = policy.formats?.accept || [];
  const rejectList = policy.formats?.reject || [];

  if (fmt) {
    // If accept list is non-empty, format MUST be explicitly accepted
    if (acceptList.length > 0 && !acceptList.includes(fmt)) {
      throw new ZapwebpError({
        code: 'E_FORMAT_REJECTED',
        message: `Format "${fmt}" is not in the accept list.`,
        fix: `Add "${fmt}" to accept, or upload a supported format.`,
        detected: fmt,
        allowed: acceptList,
        suggestedFix: {
          accept: [...acceptList, fmt],
          reason: `Format "${fmt}" was rejected because it is not in the policy allowlist.`,
        },
      });
    }

    // If format is in reject list, fail even if accepted
    if (rejectList.includes(fmt)) {
      throw new ZapwebpError({
        code: 'E_FORMAT_REJECTED',
        message: `Format "${fmt}" is in the reject list.`,
        fix: `Remove "${fmt}" from reject, or upload a different file.`,
        detected: fmt,
        rejected: rejectList,
        suggestedFix: {
          reject: rejectList.filter((f) => f !== fmt),
          reason: `Format "${fmt}" was rejected by policy denylist.`,
        },
      });
    }
  }
}

/**
 * Calculates effective quality and lossless options according to policy mode and decision tree.
 * 
 * @param {object} params
 * @param {object} params.policy
 * @param {string} params.inputFormat
 * @param {number} params.inputBytes
 * @param {boolean} params.hasAlpha
 * @param {string} params.targetFormat
 * @returns {{ quality: number, lossless: boolean, mode: string, targetQuality: number }}
 */
function evaluateQuality({ policy, inputFormat, inputBytes = 0, hasAlpha = false, targetFormat = 'webp' }) {
  const normInput = (inputFormat || '').toLowerCase() === 'jpg' ? 'jpeg' : (inputFormat || '').toLowerCase();
  const normTarget = (targetFormat || '').toLowerCase() === 'jpg' ? 'jpeg' : (targetFormat || '').toLowerCase();

  let mode = policy.quality.mode;
  let quality = policy.quality.default;
  let lossless = false;

  if (mode === 'lossless') {
    lossless = true;
    quality = 100;
  } else if (mode === 'auto') {
    if (normInput === 'svg') {
      lossless = true;
      quality = 100;
    } else if (normInput === 'png' && inputBytes < 100000) {
      lossless = true;
      quality = 100;
    } else if (normInput === 'jpeg') {
      lossless = false;
      quality = 75;
    } else if (hasAlpha) {
      lossless = false;
      quality = 90;
    } else {
      lossless = false;
      quality = 80;
    }
  } else {
    // 'lossy'
    lossless = false;
    quality = policy.quality.default;
  }

  // Per-format overrides
  if (policy.quality.perFormat) {
    if (policy.quality.perFormat[normInput] !== undefined) {
      quality = policy.quality.perFormat[normInput];
    } else if (policy.quality.perFormat[normTarget] !== undefined) {
      quality = policy.quality.perFormat[normTarget];
    }
  }

  // Clamping
  quality = Math.max(1, Math.min(100, Math.round(quality)));

  // JPEG does not support lossless
  if (normTarget === 'jpeg') {
    lossless = false;
  }

  return {
    quality,
    lossless,
    mode,
    targetQuality: quality,
  };
}

module.exports = {
  resolvePolicy,
  checkPolicyInput,
  evaluateQuality,
};

