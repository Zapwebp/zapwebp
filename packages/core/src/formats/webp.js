'use strict';

/** @type {import('./registry').FormatHandler} */
const webpHandler = {
  name: 'webp',
  mimeTypes: Object.freeze(['image/webp']),
  extensions: Object.freeze(['.webp']),
  supportsAlpha: true,
  isInput: true,
  isOutput: true,

  detect(bytes) {
    if (!bytes || bytes.length < 12) return false;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
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

  async encode(image, options = {}) {
    const sharp = require('sharp');
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

    const quality = options.quality !== undefined ? Math.max(1, Math.min(100, Number(options.quality))) : 85;
    const effort = options.effort !== undefined ? Number(options.effort) : 4;
    const lossless = Boolean(options.lossless);

    return pipeline
      .webp({
        quality,
        alphaQuality: 100,
        lossless,
        effort: Math.round((effort * 6) / 9),
      })
      .toBuffer();
  },
};

module.exports = {
  webpHandler,
};
