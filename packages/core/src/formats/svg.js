'use strict';

const { ZapwebpError } = require('@zapwebp/shared');

/**
 * Validates an SVG input buffer or string.
 * @param {Buffer | Uint8Array | string} input
 * @returns {string}
 */
function validateSvgString(input) {
  const svg = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  if (Buffer.byteLength(svg) === 0 || !/<svg(?:\s|\/?>)/i.test(svg)) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: 'This file does not contain a valid SVG document.',
      fix: 'Verify the file begins with an <svg> tag and is well-formed XML.',
    });
  }
  if (/<(?:script|foreignObject)\b/i.test(svg) || /\bon\w+\s*=/i.test(svg) || /javascript:/i.test(svg)) {
    throw new ZapwebpError({
      code: 'E_UNSAFE_SVG',
      message: 'This SVG contains active content and cannot be converted.',
      fix: 'Remove <script>, inline on* handlers, or javascript: URI schemes before converting.',
    });
  }
  if (/<!ENTITY\b/i.test(svg)) {
    throw new ZapwebpError({
      code: 'E_UNSAFE_SVG',
      message: 'Custom XML entities are not supported.',
      fix: 'Remove <!ENTITY> declarations from the SVG markup.',
    });
  }
  if (/<!DOCTYPE\b/i.test(svg)) {
    throw new ZapwebpError({
      code: 'E_UNSAFE_SVG',
      message: 'DOCTYPE declarations are not supported.',
      fix: 'Remove <!DOCTYPE> declarations from the SVG markup.',
    });
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

let _cachedResvg = null;
function getResvg() {
  if (_cachedResvg) return _cachedResvg;
  try {
    const mod = require('@resvg/resvg-js');
    _cachedResvg = mod.Resvg || mod;
    return _cachedResvg;
  } catch (err) {
    throw new ZapwebpError({
      code: 'E_ENGINE_UNAVAILABLE',
      message: 'Native resvg engine is not available: ' + (err && err.message ? err.message : String(err)),
      fix: 'Install @resvg/resvg-js or ensure native prebuilts are compiled for this architecture.',
    });
  }
}

let _cachedSharp = null;
function getSharp() {
  if (_cachedSharp) return _cachedSharp;
  try {
    _cachedSharp = require('sharp');
    return _cachedSharp;
  } catch (err) {
    throw new ZapwebpError({
      code: 'E_ENGINE_UNAVAILABLE',
      message: 'Native sharp engine is not available: ' + (err && err.message ? err.message : String(err)),
      fix: 'Install sharp via "npm install sharp" or ensure native prebuilts are compiled for this architecture.',
    });
  }
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

  async decode(bytes, options = {}) {
    const Resvg = getResvg();
    const sharp = getSharp();
    const svg = validateSvgString(bytes);
    const dims = getSvgDimensions(svg);

    // Target-width direct rasterization (Optimization 3)
    let fitTo = { mode: 'original' };
    if (options.width && options.height) {
      fitTo = { mode: 'width', value: options.width };
    } else if (options.width) {
      fitTo = { mode: 'width', value: options.width };
    } else if (options.height) {
      fitTo = { mode: 'height', value: options.height };
    }

    const resvg = new Resvg(svg, {
      fitTo,
      background: options.background || 'rgba(0, 0, 0, 0)',
    });
    const pngBuffer = resvg.render().asPng();
    const { data: raw, info } = await sharp(pngBuffer, { limitInputPixels: 4096 * 4096, failOn: 'error' })
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
    throw new ZapwebpError({
      code: 'E_UNSUPPORTED_FORMAT',
      message: 'SVG output encoding from raster is not supported. Zapwebp converts SVG to modern raster formats (WebP, PNG, AVIF).',
      fix: 'Choose webp, png, avif, or jpeg as output target.',
    });
  },
};

module.exports = {
  svgHandler,
  validateSvgString,
  getSvgDimensions,
};
