'use strict';

const { createError } = require('../errors');
const { getSharp, normalizeOptions, checkDimensions } = require('../index');

/**
 * Encodes a RawImage into target compressed format bytes.
 *
 * @param {import('../types').RawImage} image - Raw RGBA image
 * @param {string} toFormat - Target format ('webp', 'png', 'jpeg', 'avif', etc.)
 * @param {object} [options] - Encoding options
 * @returns {Promise<Uint8Array>}
 */
async function encode(image, toFormat, options = {}) {
  if (!image || !image.data || !Number.isInteger(image.width) || !Number.isInteger(image.height)) {
    throw createError('E_CORRUPT_HEADER', 'image must be an object with data (RGBA bytes), width, and height.');
  }

  checkDimensions(image.width, image.height);
  const target = String(toFormat || 'webp').toLowerCase();
  const opts = normalizeOptions({ ...options, to: target });

  const raw = Buffer.isBuffer(image.data)
    ? image.data
    : Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);

  let hasAlpha = Boolean(image.hasAlpha);
  if (!image.hasAlpha) {
    for (let i = 3; i < raw.length; i += 4) {
      if (raw[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
  }

  if (target === 'jpeg' && hasAlpha && !opts.background) {
    throw createError(
      'E_ALPHA_NOT_REPRESENTABLE',
      'JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.'
    );
  }

  let pipeline = getSharp()(raw, {
    raw: {
      width: image.width,
      height: image.height,
      channels: 4,
    },
  });

  if (opts.width || opts.height) {
    pipeline = pipeline.resize({
      width: opts.width,
      height: opts.height,
      fit: opts.fit,
      withoutEnlargement: false,
    });
  }

  if (opts.background && hasAlpha) {
    pipeline = pipeline.flatten({ background: opts.background });
  }

  if (!opts.stripMetadata) {
    pipeline = pipeline.withMetadata();
  }

  switch (target) {
    case 'webp':
      pipeline = pipeline.webp({
        quality: opts.quality,
        lossless: opts.lossless,
        effort: 4,
      });
      break;
    case 'avif':
      pipeline = pipeline.avif({
        quality: opts.quality,
        lossless: opts.lossless,
        effort: 4,
      });
      break;
    case 'png':
      pipeline = pipeline.png({
        compressionLevel: 9,
      });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality: opts.quality,
        mozjpeg: true,
      });
      break;
    default:
      throw createError('E_UNSUPPORTED_FORMAT', `Unsupported output encoding target "${target}".`);
  }

  const encodedBuffer = await pipeline.toBuffer();
  return new Uint8Array(encodedBuffer.buffer, encodedBuffer.byteOffset, encodedBuffer.byteLength);
}

module.exports = {
  encode,
};

