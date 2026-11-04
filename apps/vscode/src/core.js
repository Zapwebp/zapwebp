'use strict';

const { convertImage, outputName, scaleSuffix } = require('@zapwebp/core');

let initialized = false;

/**
 * Custom error class carrying explicit Zapwebp machine-readable error codes.
 */
class ZapError extends Error {
  /**
   * @param {'E_UNSAFE_SVG'|'E_UNSUPPORTED_FORMAT'|'E_WRITE_FAILED'|'E_CONVERSION_FAILED'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'ZapError';
    this.code = code;
  }
}

/**
 * Initializes the WASM / native conversion engine.
 * @returns {Promise<void>}
 */
async function init() {
  initialized = true;
}

/**
 * Converts an image buffer with transparency preservation and metadata stripping.
 * @param {Uint8Array|Buffer} bytes - Input image bytes or SVG string buffer.
 * @param {'webp'|'png'|'avif'|'jpeg'} [format='webp'] - Target format.
 * @param {number} [width=512] - Target pixel width.
 * @param {number} [quality=85] - Lossy quality level.
 * @param {boolean} [clean=true] - Whether to strip metadata.
 * @returns {Promise<Buffer>} - Converted image byte buffer.
 * @throws {ZapError}
 */
async function convertBuffer(bytes, format = 'webp', width = 512, quality = 85, clean = true) {
  await init();
  try {
    const result = await convertImage(bytes, {
      to: format,
      width,
      quality,
      clean,
      verify: true,
    });
    return result.data;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('active content') || msg.includes('script') || msg.includes('unsafe')) {
      throw new ZapError('E_UNSAFE_SVG', 'SVG contains active script elements or event handlers.');
    }
    if (msg.includes('Unsupported or unrecognized') || msg.includes('Unsupported format') || msg.includes('empty')) {
      throw new ZapError('E_UNSUPPORTED_FORMAT', msg);
    }
    throw new ZapError('E_CONVERSION_FAILED', msg);
  }
}

/**
 * Converts an image buffer to Retina scale variants (@1x, @2x, @3x).
 * @param {Uint8Array|Buffer} bytes - Input image bytes.
 * @param {string} sourceName - Source file basename (e.g. "logo.svg").
 * @param {number} [baseWidth=512] - Base width for @1x.
 * @param {number} [quality=85] - Lossy quality level.
 * @param {boolean} [clean=true] - Whether to strip metadata.
 * @returns {Promise<Array<{ scale: number, filename: string, data: Buffer }>>}
 */
async function convertScalesBuffer(bytes, sourceName, baseWidth = 512, quality = 85, clean = true) {
  await init();
  const scales = [1, 2, 3];
  const results = [];

  for (const scale of scales) {
    const width = Math.round(baseWidth * scale);
    const data = await convertBuffer(bytes, 'webp', width, quality, clean);
    const filename = outputName(sourceName, 'webp', scale);
    results.push({ scale, filename, data });
  }

  return results;
}

module.exports = {
  init,
  convertBuffer,
  convertScalesBuffer,
  outputName,
  scaleSuffix,
  ZapError,
};
