'use strict';

const sharp = require('sharp');

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** @type {import('./registry').FormatHandler} */
const pngHandler = {
  name: 'png',
  mimeTypes: Object.freeze(['image/png']),
  extensions: Object.freeze(['.png']),
  supportsAlpha: true,
  isInput: true,
  isOutput: true,

  detect(bytes) {
    if (!bytes || bytes.length < 8) return false;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return buf.subarray(0, 8).equals(PNG_HEADER);
  },

  async decode(bytes) {
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

  async encode(image, options = {}) {
    const raw = Buffer.isBuffer(image.data)
      ? image.data
      : Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);

    let pipeline = sharp(raw, {
      raw: {
        width: image.width,
        height: image.height,
        channels: 4,
      },
    });

    if (options.background) {
      pipeline = pipeline.flatten({ background: options.background });
    }

    const effort = options.effort !== undefined ? Number(options.effort) : 4;
    return pipeline
      .png({
        compressionLevel: Math.max(0, Math.min(9, effort)),
        adaptiveFiltering: true,
      })
      .toBuffer();
  },
};

module.exports = {
  pngHandler,
};
