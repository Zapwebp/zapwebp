'use strict';

const { ZapwebpError } = require('@zapwebp/shared');

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
    const { data: raw, info } = await sharp(bytes, { limitInputPixels: 4096 * 4096, pages: 1, animated: false, failOn: 'error' })
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
      message: 'GIF output encoding is not supported. Zapwebp converts GIF to modern web formats (WebP, PNG, AVIF).',
      fix: 'Choose one of: webp, png, avif, or jpeg.',
    });
  },
};

module.exports = {
  gifHandler,
};
