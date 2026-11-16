'use strict';

const sharp = require('sharp');
const { ZapwebpError } = require('@zapwebp/shared');
const { resolveIcoConfig, DEFAULT_CONFIG } = require('./config');
const { encodeBmpDib } = require('./bmp');

const DEFAULT_ICO_SIZES = DEFAULT_CONFIG.sizes;
const MAX_SIZES_COUNT = 20;

/**
 * Validates and normalizes target ICO sizes.
 *
 * @param {number[] | string} [sizesInput]
 * @returns {number[]}
 */
function normalizeSizes(sizesInput) {
  if (!sizesInput) return [...DEFAULT_ICO_SIZES];

  let rawList = sizesInput;
  if (typeof rawList === 'string') {
    rawList = rawList
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  }

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [...DEFAULT_ICO_SIZES];
  }

  const unique = Array.from(new Set(rawList.map(Number)))
    .filter((s) => Number.isInteger(s) && s >= 8 && s <= 512)
    .sort((a, b) => a - b);

  if (unique.length === 0) {
    throw new ZapwebpError({
      code: 'E_INVALID_CONFIG',
      message: 'Invalid icon sizes specified. Sizes must be integers between 8 and 512.',
      fix: 'Specify standard icon sizes like [16, 32, 48, 64, 128, 256].',
    });
  }

  if (unique.length > MAX_SIZES_COUNT) {
    throw new ZapwebpError({
      code: 'E_BOUNDS_EXCEEDED',
      message: `Cannot encode ICO with ${unique.length} sizes (max allowed is ${MAX_SIZES_COUNT}).`,
      fix: 'Reduce the number of icon sizes.',
    });
  }

  return unique;
}

/**
 * Assembles pre-rendered PNG or BMP image buffers into a valid ICO or CUR container.
 *
 * @param {Array<{ width: number, height: number, data: Buffer, bitCount?: number, hotspotX?: number, hotspotY?: number }>} images
 * @param {Object} [options]
 * @param {'ico' | 'cur'} [options.type] - Container type: 1 for ICO, 2 for CUR (default: 'ico')
 * @returns {Buffer}
 */
function buildIcoContainer(images, options = {}) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new ZapwebpError({
      code: 'E_INVALID_CONFIG',
      message: 'No images provided to build ICO container.',
      fix: 'Provide at least one image buffer.',
    });
  }

  const count = images.length;
  if (count > MAX_SIZES_COUNT) {
    throw new ZapwebpError({
      code: 'E_BOUNDS_EXCEEDED',
      message: `Image count (${count}) exceeds maximum allowed entries (${MAX_SIZES_COUNT}).`,
      fix: 'Provide fewer image entries.',
    });
  }

  const isCursor = options.type === 'cur';
  const headerSize = 6;
  const directorySize = 16 * count;
  let currentOffset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(isCursor ? 2 : 1, 2); // Type: 1 = ICO, 2 = CUR
  header.writeUInt16LE(count, 4); // Count

  const directoryEntries = [];
  const payloads = [];

  for (let i = 0; i < count; i++) {
    const img = images[i];
    const data = Buffer.isBuffer(img.data) ? img.data : Buffer.from(img.data);
    const widthByte = img.width >= 256 ? 0 : img.width;
    const heightByte = img.height >= 256 ? 0 : img.height;
    const bitCount = img.bitCount || 32;

    const entry = Buffer.alloc(16);
    entry.writeUInt8(widthByte, 0);
    entry.writeUInt8(heightByte, 1);
    entry.writeUInt8(0, 2); // Color count (0 for >= 8bpp)
    entry.writeUInt8(0, 3); // Reserved

    if (isCursor) {
      entry.writeUInt16LE(img.hotspotX || 0, 4); // Hotspot X for CUR
      entry.writeUInt16LE(img.hotspotY || 0, 6); // Hotspot Y for CUR
    } else {
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(bitCount, 6); // Bits per pixel
    }

    entry.writeUInt32LE(data.length, 8); // Size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset

    directoryEntries.push(entry);
    payloads.push(data);
    currentOffset += data.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...payloads]);
}

/**
 * Encodes an image into a high-resolution, multi-size ICO/CUR buffer using declarative config.
 *
 * @param {Buffer | { data: Uint8ClampedArray | Buffer, width: number, height: number }} source
 * @param {Partial<import('./config').IcoConfig>} [options]
 * @returns {Promise<Buffer>}
 */
async function writeIco(source, options = {}) {
  const config = resolveIcoConfig(options);

  let sharpFactory;

  // Handle RawImage object input from @zapwebp/core pipeline
  if (source && typeof source === 'object' && source.data && source.width && source.height) {
    const rawBuffer = Buffer.isBuffer(source.data)
      ? source.data
      : Buffer.from(source.data.buffer, source.data.byteOffset, source.data.byteLength);

    sharpFactory = () =>
      sharp(rawBuffer, {
        raw: {
          width: source.width,
          height: source.height,
          channels: 4,
        },
      });
  } else {
    // Buffer input (SVG, PNG, WebP, etc.)
    const inputBuf = Buffer.isBuffer(source) ? source : Buffer.from(source);
    sharpFactory = () =>
      sharp(inputBuf, {
        limitInputPixels: 4096 * 4096,
        failOn: 'error',
      });
  }

  const encodedImages = await Promise.all(
    config.sizes.map(async (size) => {
      const format = typeof config.format === 'function' ? config.format(size) : config.format;

      let pipeline = sharpFactory().resize(size, size, {
        fit: config.fit || 'contain',
        background: config.background && config.background !== 'transparent'
          ? config.background
          : { r: 0, g: 0, b: 0, alpha: 0 },
      });

      if (config.background && config.background !== 'transparent') {
        pipeline = pipeline.flatten({ background: config.background });
      }

      if (format === 'bmp') {
        const rawRes = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const bmpData = encodeBmpDib(rawRes.data, rawRes.info.width, rawRes.info.height);
        return {
          width: size,
          height: size,
          data: bmpData,
          bitCount: 32,
        };
      }

      // Default: PNG encoding
      const pngBuffer = await pipeline
        .png({
          compressionLevel: config.compressionLevel !== undefined ? config.compressionLevel : 9,
          adaptiveFiltering: true,
          palette: config.colorType === 'palette',
          colours: config.colorType === 'palette' ? (config.paletteSize || 256) : undefined,
        })
        .toBuffer();

      return {
        width: size,
        height: size,
        data: pngBuffer,
        bitCount: 32,
      };
    })
  );

  return buildIcoContainer(encodedImages, { type: config.type });
}

// Backwards-compatible alias
const encodeIco = writeIco;

module.exports = {
  writeIco,
  encodeIco,
  buildIcoContainer,
  normalizeSizes,
  DEFAULT_ICO_SIZES,
};
