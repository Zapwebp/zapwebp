'use strict';

/** @type {import('./registry').FormatHandler} */
const gifHandler = {
  name: 'gif',
  mimeTypes: Object.freeze(['image/gif']),
  extensions: Object.freeze(['.gif']),
  supportsAlpha: true,
  isInput: true,
  isOutput: false,

  detect(bytes) {
    if (!bytes || bytes.length < 6) return false;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sig = buf.subarray(0, 6).toString('ascii');
    return sig === 'GIF87a' || sig === 'GIF89a';
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
    throw new Error('GIF output encoding is not supported. Zap converts GIF to modern web formats (WebP, PNG, AVIF).');
  },
};

module.exports = {
  gifHandler,
};
