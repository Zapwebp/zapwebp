'use strict';

/** @type {import('./registry').FormatHandler} */
const tiffHandler = {
  name: 'tiff',
  mimeTypes: Object.freeze(['image/tiff']),
  extensions: Object.freeze(['.tif', '.tiff']),
  supportsAlpha: true,
  isInput: true,
  isOutput: false,

  detect(bytes) {
    if (!bytes || bytes.length < 4) return false;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return (
      buf.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
      buf.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a])) ||
      buf.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2b, 0x00])) ||
      buf.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2b]))
    );
  },

  async decode(bytes) {
    const sharp = require('sharp');
    const { data: raw, info } = await sharp(bytes, { limitInputPixels: 4096 * 4096, pages: 1, animated: false })
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
    throw new Error('TIFF output encoding is not supported. Zap converts TIFF to modern web formats (WebP, PNG, AVIF).');
  },
};

module.exports = {
  tiffHandler,
};
