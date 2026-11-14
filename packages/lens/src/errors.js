'use strict';

/**
 * Standard structured Lens error.
 * Includes standardized error code, human message, actionable suggested fix, and documentation reference.
 */
class LensError extends Error {
  /**
   * @param {{ code: string, message: string, fix: string, docs?: string, cause?: any }} options
   */
  constructor(options) {
    super(options.message);
    this.name = 'LensError';
    this.code = options.code;
    this.fix = options.fix;
    this.docs = options.docs || `https://zapwebp.vercel.app/errors#${options.code}`;
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      fix: this.fix,
      docs: this.docs,
    };
  }
}

/**
 * Formats a LensError for terminal presentation.
 * @param {LensError|Error} err
 * @returns {string}
 */
function formatLensError(err) {
  if (err instanceof LensError) {
    const lines = [
      `⚡ lens! ${err.code}: ${err.message}`,
      `   → ${err.fix}`,
      `   → ${err.docs}`,
    ];
    return lines.join('\n') + '\n';
  }
  return `⚡ lens! E_UNKNOWN: ${err.message || String(err)}\n`;
}

module.exports = {
  LensError,
  formatLensError,
};
