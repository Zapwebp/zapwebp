'use strict';

const { ZapwebpError } = require('@zapwebp/shared');
const { getSharp, getResvg, validateSvg, svgDimensions, checkDimensions, MAX_PIXELS } = require('../index');

/**
 * Decodes input image bytes into uncompressed RGBA pixel bytes.
 *
 * @param {Uint8Array|Buffer} input - Input image bytes
 * @param {string} format - Input format
 * @param {object} [options]
 * @returns {Promise<import('../types').RawImage>}
 */
async function decode(input, format, options = {}) {
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const fmt = String(format || '').toLowerCase();
  let source = data;

  if (fmt === 'svg') {
    const svg = validateSvg(data);
    const dims = svgDimensions(svg);
    const width = dims.width || 2048;
    const height = dims.height || 2048;
    checkDimensions(width, height);
    const ResvgClass = getResvg();
    source = new ResvgClass(svg, { fitTo: { mode: 'original' }, background: 'rgba(0, 0, 0, 0)' }).render().asPng();
  }

  const pipeline = getSharp()(source, {
    limitInputPixels: MAX_PIXELS,
    pages: 1,
    animated: false,
    failOn: 'error',
  }).ensureAlpha();

  const { data: raw, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  checkDimensions(info.width, info.height);

  let hasAlpha = false;
  for (let i = 3; i < raw.length; i += 4) {
    if (raw[i] < 255) {
      hasAlpha = true;
      break;
    }
  }

  return {
    data: new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength),
    width: info.width,
    height: info.height,
    channels: 4,
    hasAlpha,
    format: fmt,
  };
}

module.exports = {
  decode,
};

