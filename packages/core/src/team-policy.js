'use strict';

const path = require('node:path');

const DEFAULT_TEAM_POLICY_TEMPLATE = {
  version: '1.0.0',
  policy: {
    targetFormat: 'webp',
    quality: { min: 75, max: 90 },
    clean: { required: true },
    formats: {
      accept: ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif'],
      reject: ['gif', 'tiff'],
    },
    limits: {
      maxInputBytes: 10485760, // 10 MB
      maxOutputBytes: 5242880,  // 5 MB
    },
    provenance: {
      required: true,
      includeTimestamp: true,
    },
  },
  enforcement: {
    onCi: 'block',
    onLocal: 'warn',
    onPrReview: 'requireApproval',
  },
  exceptions: [
    {
      path: 'public/legacy/*.svg',
      reason: 'Legacy assets, frozen',
      approvedBy: 'team-lead@company.com',
      expiresAt: '2027-06-01',
    },
  ],
};

/**
 * Converts a simple glob pattern to a RegExp.
 * Supports `*`, `**`, and file extensions.
 * 
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  const norm = String(glob || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const escaped = norm
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/(?<!\.)\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Validates a team policy configuration object.
 * 
 * @param {object} policy - Candidate policy object
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTeamPolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== 'object') {
    return { valid: false, errors: ['Policy must be a valid JSON object.'] };
  }

  if (!policy.version || typeof policy.version !== 'string') {
    errors.push('Property "version" is required and must be a string (e.g. "1.0.0").');
  }

  if (!policy.policy || typeof policy.policy !== 'object') {
    errors.push('Property "policy" is required and must be an object.');
  } else {
    const p = policy.policy;

    if (p.quality) {
      if (typeof p.quality !== 'object') {
        errors.push('policy.quality must be an object with min and max numbers.');
      } else {
        const { min, max } = p.quality;
        if (min !== undefined && (!Number.isInteger(min) || min < 1 || min > 100)) {
          errors.push('policy.quality.min must be an integer between 1 and 100.');
        }
        if (max !== undefined && (!Number.isInteger(max) || max < 1 || max > 100)) {
          errors.push('policy.quality.max must be an integer between 1 and 100.');
        }
        if (min !== undefined && max !== undefined && min > max) {
          errors.push(`policy.quality.min (${min}) cannot be greater than policy.quality.max (${max}).`);
        }
      }
    }

    if (p.clean && typeof p.clean.required !== 'boolean') {
      errors.push('policy.clean.required must be a boolean.');
    }

    if (p.formats) {
      if (p.formats.accept && !Array.isArray(p.formats.accept)) {
        errors.push('policy.formats.accept must be an array of format strings.');
      }
      if (p.formats.reject && !Array.isArray(p.formats.reject)) {
        errors.push('policy.formats.reject must be an array of format strings.');
      }
    }

    if (p.limits) {
      if (p.limits.maxInputBytes !== undefined && (!Number.isFinite(p.limits.maxInputBytes) || p.limits.maxInputBytes <= 0)) {
        errors.push('policy.limits.maxInputBytes must be a positive number.');
      }
      if (p.limits.maxOutputBytes !== undefined && (!Number.isFinite(p.limits.maxOutputBytes) || p.limits.maxOutputBytes <= 0)) {
        errors.push('policy.limits.maxOutputBytes must be a positive number.');
      }
    }
  }

  if (policy.enforcement) {
    const validCi = ['block', 'warn'];
    const validLocal = ['warn', 'block'];
    if (policy.enforcement.onCi && !validCi.includes(policy.enforcement.onCi)) {
      errors.push(`enforcement.onCi must be one of: ${validCi.join(', ')}.`);
    }
    if (policy.enforcement.onLocal && !validLocal.includes(policy.enforcement.onLocal)) {
      errors.push(`enforcement.onLocal must be one of: ${validLocal.join(', ')}.`);
    }
  }

  if (policy.exceptions) {
    if (!Array.isArray(policy.exceptions)) {
      errors.push('Property "exceptions" must be an array.');
    } else {
      policy.exceptions.forEach((exc, idx) => {
        if (!exc.path || typeof exc.path !== 'string') {
          errors.push(`exceptions[${idx}].path is required.`);
        }
        if (!exc.reason || typeof exc.reason !== 'string') {
          errors.push(`exceptions[${idx}].reason is required.`);
        }
        if (!exc.approvedBy || typeof exc.approvedBy !== 'string') {
          errors.push(`exceptions[${idx}].approvedBy is required.`);
        }
        if (!exc.expiresAt || Number.isNaN(Date.parse(exc.expiresAt))) {
          errors.push(`exceptions[${idx}].expiresAt must be a valid date string (e.g. "2027-06-01").`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Evaluates a single file and conversion options against a team policy.
 * 
 * @param {object} policyConfig - Validated team policy
 * @param {{ path: string, format: string, size?: number }} fileItem - File to evaluate
 * @param {object} [conversionOptions={}] - Desired conversion options
 * @param {object} [context={}] - Evaluation context (e.g. isCi)
 * @returns {{ allowed: boolean, violations: string[], exceptionApplied?: object }}
 */
function evaluateFilePolicy(policyConfig, fileItem, conversionOptions = {}, context = {}) {
  const normPath = String(fileItem.path || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const normFormat = String(fileItem.format || normPath.split('.').pop() || '').toLowerCase();
  const exceptions = Array.isArray(policyConfig.exceptions) ? policyConfig.exceptions : [];

  // 1. Check for Active Exceptions
  const now = Date.now();
  for (const exc of exceptions) {
    const rx = globToRegExp(exc.path);
    if (rx.test(normPath) || rx.test(normPath.split('/').pop())) {
      const expMs = Date.parse(exc.expiresAt);
      if (!Number.isNaN(expMs) && expMs > now) {
        return {
          allowed: true,
          violations: [],
          exceptionApplied: { ...exc },
        };
      }
    }
  }

  // 2. Evaluate Policy Rules
  const violations = [];
  const rules = policyConfig.policy || {};

  // Formats Check
  if (rules.formats) {
    const rejected = (rules.formats.reject || []).map((f) => f.toLowerCase());
    const accepted = (rules.formats.accept || []).map((f) => f.toLowerCase());

    if (rejected.includes(normFormat)) {
      violations.push(`Format "${normFormat}" is explicitly rejected by team policy.`);
    }
    if (accepted.length > 0 && !accepted.includes(normFormat)) {
      violations.push(`Format "${normFormat}" is not in the approved formats list [${accepted.join(', ')}].`);
    }
  }

  // Target Format Check
  if (rules.targetFormat && conversionOptions.target) {
    const target = String(conversionOptions.target).toLowerCase();
    const allowedTargets = Array.isArray(rules.targetFormat)
      ? rules.targetFormat.map((t) => t.toLowerCase())
      : [String(rules.targetFormat).toLowerCase()];
    if (!allowedTargets.includes(target)) {
      violations.push(`Target format "${target}" does not match required team target [${allowedTargets.join(', ')}].`);
    }
  }

  // Quality Range Check
  if (rules.quality && conversionOptions.quality !== undefined) {
    const q = Number(conversionOptions.quality);
    if (rules.quality.min !== undefined && q < rules.quality.min) {
      violations.push(`Quality ${q} is below team policy minimum of ${rules.quality.min}.`);
    }
    if (rules.quality.max !== undefined && q > rules.quality.max) {
      violations.push(`Quality ${q} exceeds team policy maximum of ${rules.quality.max}.`);
    }
  }

  // Clean Mode Check
  if (rules.clean && rules.clean.required && conversionOptions.clean === false) {
    violations.push('Clean Mode (metadata stripping) is required by team policy.');
  }

  // Input File Size Check
  if (rules.limits && rules.limits.maxInputBytes && fileItem.size) {
    if (fileItem.size > rules.limits.maxInputBytes) {
      violations.push(`Input size ${fileItem.size} bytes exceeds maximum allowed ${rules.limits.maxInputBytes} bytes.`);
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}

/**
 * Checks exception lifecycles and expiration statuses.
 * 
 * @param {object} policyConfig
 * @returns {{ active: object[], expired: object[] }}
 */
function checkExceptionsStatus(policyConfig) {
  const active = [];
  const expired = [];
  const now = Date.now();
  const exceptions = Array.isArray(policyConfig.exceptions) ? policyConfig.exceptions : [];

  for (const exc of exceptions) {
    const expMs = Date.parse(exc.expiresAt);
    const msRemaining = expMs - now;
    const days = Math.round(msRemaining / (1000 * 60 * 60 * 24));

    if (msRemaining > 0) {
      active.push({ ...exc, daysRemaining: days });
    } else {
      expired.push({ ...exc, daysExpired: Math.abs(days) });
    }
  }

  return { active, expired };
}

/**
 * Formats policy status into human-readable terminal output.
 * 
 * @param {object} policyConfig
 * @returns {string}
 */
function formatPolicyStatus(policyConfig) {
  const p = policyConfig.policy || {};
  const enf = policyConfig.enforcement || {};
  const { active, expired } = checkExceptionsStatus(policyConfig);

  const lines = [
    '🛡️  Zapwebp Team Policy Status',
    '──────────────────────────────────────────────────────',
    `Version:      ${policyConfig.version || '1.0.0'}`,
    `Target:       ${p.targetFormat || 'webp'}`,
    `Quality:      ${p.quality?.min || 75} – ${p.quality?.max || 90}`,
    `Clean Mode:   ${p.clean?.required ? 'Required' : 'Optional'}`,
    `Enforcement:  CI=${enf.onCi || 'block'}, Local=${enf.onLocal || 'warn'}`,
    '',
    `Active Exceptions (${active.length}):`,
  ];

  if (!active.length) {
    lines.push('  None');
  } else {
    for (const a of active) {
      lines.push(`  ✓ ${a.path} (${a.reason})`);
      lines.push(`    Approved by: ${a.approvedBy} · Expires in: ${a.daysRemaining} days (${a.expiresAt})`);
    }
  }

  if (expired.length > 0) {
    lines.push('');
    lines.push(`⚠️  Expired Exceptions (${expired.length}):`);
    for (const e of expired) {
      lines.push(`  ✗ ${e.path} (${e.reason})`);
      lines.push(`    Approved by: ${e.approvedBy} · EXPIRED ${e.daysExpired} days ago (${e.expiresAt})`);
    }
  }

  lines.push('──────────────────────────────────────────────────────');
  return lines.join('\n');
}

module.exports = {
  DEFAULT_TEAM_POLICY_TEMPLATE,
  validateTeamPolicy,
  evaluateFilePolicy,
  checkExceptionsStatus,
  formatPolicyStatus,
};
