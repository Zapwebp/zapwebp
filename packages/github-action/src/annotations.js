'use strict';

const { sanitizeLog } = require('./sanitize');

/**
 * Formats options object into GitHub Actions workflow command key=value parameters.
 * @param {object} [options={}]
 * @returns {string}
 */
function formatOptions(options = {}) {
  const parts = [];
  if (options.file) parts.push(`file=${options.file.replace(/\\/g, '/')}`);
  if (options.title) parts.push(`title=${options.title}`);
  if (options.line) parts.push(`line=${options.line}`);
  if (options.col) parts.push(`col=${options.col}`);
  return parts.length > 0 ? ` ${parts.join(',')}` : '';
}

/**
 * Emits a structured workflow error annotation.
 * @param {string} message
 * @param {object} [options={}]
 */
function error(message, options = {}) {
  const cleanMsg = sanitizeLog(message);
  const optStr = formatOptions(options);
  console.log(`::error${optStr}::${cleanMsg}`);
}

/**
 * Emits a structured workflow notice annotation.
 * @param {string} message
 * @param {object} [options={}]
 */
function notice(message, options = {}) {
  const cleanMsg = sanitizeLog(message);
  const optStr = formatOptions(options);
  console.log(`::notice${optStr}::${cleanMsg}`);
}

/**
 * Emits a structured workflow warning annotation.
 * @param {string} message
 * @param {object} [options={}]
 */
function warning(message, options = {}) {
  const cleanMsg = sanitizeLog(message);
  const optStr = formatOptions(options);
  console.log(`::warning${optStr}::${cleanMsg}`);
}

/**
 * Emits an error annotation and marks process exit code as 1.
 * @param {string} message
 */
function setFailed(message) {
  error(message);
  process.exitCode = 1;
}

module.exports = {
  error,
  notice,
  warning,
  setFailed,
  formatOptions,
};

