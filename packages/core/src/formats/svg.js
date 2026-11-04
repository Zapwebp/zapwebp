'use strict';

const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

/**
 * Validates an SVG input buffer or string.
 * @param {Buffer | Uint8Array | string} input
 * @returns {string}
 */
function validateSvgString(input) {
  const svg = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  if (Buffer.byteLength(svg) === 0 || !/<svg(?:\s|\/?>)/i.test(svg)) {
    throw new Error('This file does not contain a valid SVG document.');
  }
  if (/<(?:script|foreignObject)\b/i.test(svg) || /\bon\w+\s*=/i.test(svg)) {
    throw new Error('This SVG contains active content and cannot be converted.');
  }
  if (/<!ENTITY\b/i.test(svg)) {
    throw new Error('Custom XML entities are not supported.');
  }
  if (/<!DOCTYPE\b/i.test(svg)) {
    throw new Error('DOCTYPE declarations are not supported.');
  }
  return svg;
}

/**
 * Extracts intrinsic dimensions from an SVG.
 * @param {string} svg
 * @returns {{ width?: number, height?: number }}
 */
function getSvgDimensions(svg) {
  const widthMatch = svg.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i);
  const heightMatch = svg.match(/\bheight=["']([0-9.]+)(?:px)?["']/i);
  const viewBoxMatch = svg.match(/\bviewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.]+)\s+([0-9.]+)\s*["']/i);
  const width = widthMatch ? parseFloat(widthMatch[1]) : viewBoxMatch ? parseFloat(viewBoxMatch[3]) : undefined;
  const height = heightMatch ? parseFloat(heightMatch[1]) : viewBoxMatch ? parseFloat(viewBoxMatch[4]) : undefined;
  return { width, height };
}

/** @type {import('./registry').FormatHandler} */
const svgHandler = {
  name: 'svg',
  mimeTypes: Object.freeze(['image/svg+xml']),
  extensions: Object.freeze(['.svg']),
  supportsAlpha: true,
  isInput: true,
  isOutput: false,

  detect(bytes) {
    if (!bytes || !bytes.length) return false;
    const sample = bytes.subarray(0, Math.min(bytes.length, 4096)).toString('utf8').replace(/^\uFEFF/, '').trimStart();
    return /<svg(?:\s|\/?>)/i.test(sample) || /^<\?xml[\s\S]*?<svg(?:\s|\/?>)/i.test(sample);
  },

  async decode(bytes) {
    const svg = validateSvgString(bytes);
    const dims = getSvgDimensions(svg);
    const width = dims.width || 2048;
    const height = dims.height || 2048;
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'original' },
      background: 'rgba(0, 0, 0, 0)',
    });
    const pngBuffer = resvg.render().asPng();
    const { data: raw, info } = await sharp(pngBuffer, { limitInputPixels: 4096 * 4096 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength),
      width: info.width,
      height: info.height,
    };
  },

  async encode() {
    throw new Error('SVG output encoding from raster is not supported. Zap converts SVG to modern raster formats (WebP, PNG, AVIF).');
  },
};

module.exports = {
  svgHandler,
  validateSvgString,
  getSvgDimensions,
};
