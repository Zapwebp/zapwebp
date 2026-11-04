'use strict';

const sharp = require('sharp');

/** @type {import('./registry').FormatHandler} */
const jpegHandler = {
  name: 'jpeg',
  mimeTypes: Object.freeze(['image/jpeg', 'image/jpg']),
  extensions: Object.freeze(['.jpg', '.jpeg']),
  supportsAlpha: false,
  isInput: true,
  isOutput: true,

  detect(bytes) {
    if (!bytes || bytes.length < 3) return false;
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
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
    if (options.lossless) {
      throw new Error('JPEG output does not support lossless encoding.');
    }

    const raw = Buffer.isBuffer(image.data)
      ? image.data
      : Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);

    // Check for transparency
    let hasAlpha = false;
    for (let i = 3; i < raw.length; i += 4) {
      if (raw[i] < 255) {
        hasAlpha = true;
        break;
      }
    }

    if (hasAlpha && !options.background) {
      throw new Error('JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.');
    }

    let pipeline = sharp(raw, {
      raw: {
        width: image.width,
        height: image.height,
        channels: 4,
      },
    });

    if (options.background && hasAlpha) {
      pipeline = pipeline.flatten({ background: options.background });
    }

    const quality = options.quality !== undefined ? Math.max(1, Math.min(100, Number(options.quality))) : 85;
    return pipeline
      .jpeg({
        quality,
        mozjpeg: true,
      })
      .toBuffer();
  },
};

module.exports = {
  jpegHandler,
};
