'use strict';

/** @type {import('./registry').FormatHandler} */
const avifHandler = {
  name: 'avif',
  mimeTypes: Object.freeze(['image/avif']),
  extensions: Object.freeze(['.avif']),
  supportsAlpha: true,
  isInput: true,
  isOutput: true,

  detect(bytes) {
    if (!bytes || bytes.length < 12) return false;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
      const brands = buf.subarray(8, Math.min(buf.length, 4096)).toString('ascii');
      return brands.includes('avif') || brands.includes('avis');
    }
    return false;
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
      .avif({
        quality,
        lossless,
        effort: Math.max(0, Math.min(9, effort)),
      })
      .toBuffer();
  },
};

module.exports = {
  avifHandler,
};
