'use strict';

/**
 * Sanitizes terminal outputs, logs, and error strings to prevent leaking absolute workspace paths or credentials.
 * @param {string} text
 * @param {string[]} [customSecrets=[]]
 * @returns {string}
 */
function sanitizeLog(text, customSecrets = []) {
  if (typeof text !== 'string') return String(text || '');

  let clean = text;

  // Mask explicitly provided secret strings (e.g. GitHub tokens)
  for (const secret of customSecrets) {
    if (typeof secret === 'string' && secret.length >= 8) {
      clean = clean.split(secret).join('[REDACTED]');
    }
  }

  // Mask common token and credential assignments
  clean = clean
    .replace(/(?:ghp|ghs|gho|ghu|github_pat)_[A-Za-z0-9_]{16,}/g, '[REDACTED]')
    .replace(/(?:bearer|token|key|secret|password|auth)\s*[:=]\s*['"]?[A-Za-z0-9_.\-+/]{8,}['"]?/gi, (match) => {
      const parts = match.split(/[:=]/);
      return `${parts[0]}: [REDACTED]`;
    })
    .replace(/(?:authorization:\s*bearer\s+)\S+/gi, 'Authorization: Bearer [REDACTED]');

  // Redact GitHub runner workspace directory paths (Linux, macOS, Windows)
  clean = clean
    .replace(/\/home\/runner\/work\/[^/\s]+\/[^/\s]+\/?/g, '<workspace>/')
    .replace(/\/Users\/runner\/work\/[^/\s]+\/[^/\s]+\/?/g, '<workspace>/')
    .replace(/[A-Z]:\\(?:Users|runneradmin)\\work\\[^\\\s]+\\[^\\\s]+\\?/gi, '<workspace>/');

  return clean;
}

module.exports = {
  sanitizeLog,
};

