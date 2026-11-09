'use strict';

const { createError } = require('../errors');

const SVG_DANGER_RE = /<(?:script|foreignObject)\b|\bon\w+\s*=|javascript:|<\!ENTITY|<\!DOCTYPE|@import/i;

/**
 * Checks SVG markup for dangerous active elements, scripts, and XML entity injections.
 * Enforces Zero-Trust Vector Ingestion.
 *
 * @param {Uint8Array|Buffer|string} input - Raw SVG bytes or string
 * @returns {{ safe: boolean, reason?: string, detail?: string }}
 */
function checkSvgSafety(input) {
  if (!input) {
    return { safe: false, reason: 'Empty SVG input' };
  }

  let text;
  if (typeof input === 'string') {
    text = input;
  } else if (Buffer.isBuffer(input)) {
    text = input.toString('utf8');
  } else if (input instanceof Uint8Array) {
    text = Buffer.from(input.buffer, input.byteOffset, input.byteLength).toString('utf8');
  } else {
    return { safe: false, reason: 'Invalid SVG input format' };
  }

  const match = text.match(SVG_DANGER_RE);
  if (match) {
    return {
      safe: false,
      reason: 'E_UNSAFE_SVG',
      detail: `SVG contains prohibited active or external pattern: "${match[0]}"`,
    };
  }

  return { safe: true };
}

/**
 * Validates SVG and throws a standardized ZapwebpError if unsafe.
 *
 * @param {Uint8Array|Buffer|string} input
 * @param {{ allowUnsafe?: boolean }} [options]
 * @throws {ZapwebpError}
 */
function assertSvgSafety(input, options = {}) {
  const check = checkSvgSafety(input);
  if (!check.safe) {
    if (options.allowUnsafe) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[Zapwebp Warning]: ${check.detail || check.reason}`);
      }
      return;
    }
    throw createError('E_UNSAFE_SVG', check.detail || 'SVG contains active scripts or external references.');
  }
}

module.exports = {
  checkSvgSafety,
  assertSvgSafety,
};

