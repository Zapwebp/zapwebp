'use strict';

const { ZapwebpError, ERROR_CATALOG } = require('@zapwebp/shared');

/**
 * Creates a standardized ZapwebpError with error code, message, fix, and documentation link.
 * Enforces Discipline 5: No silent failures.
 *
 * @param {string} code - Error code identifier
 * @param {string} [customMessage] - Optional custom context message
 * @param {object} [details] - Additional contextual properties
 * @returns {ZapwebpError}
 */
function createError(code, customMessage, details = {}) {
  const definition = ERROR_CATALOG[code] || {};
  const message = customMessage || definition.message || `An error occurred with code ${code}`;
  const fix = details.fix || definition.fix || 'Check input parameters or see documentation.';
  const docs = details.docs || definition.docs || `https://zapwebp-docs.vercel.app/errors#${code.toLowerCase()}`;

  return new ZapwebpError({
    code,
    message,
    fix,
    docs,
    ...details,
  });
}

module.exports = {
  ZapwebpError,
  ERROR_CATALOG,
  createError,
};
