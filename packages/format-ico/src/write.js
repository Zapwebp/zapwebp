'use strict';

const sharp = require('sharp');
const { ZapwebpError } = require('@zapwebp/shared');

const DEFAULT_ICO_SIZES = [16, 32, 48, 64, 128, 256];
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
 * Assembles pre-rendered PNG or BMP image buffers into a valid ICO container.
 *
 * @param {Array<{ width: number, height: number, data: Buffer, bitCount?: number }>} images
 * @returns {Buffer}
 */
function buildIcoContainer(images) {
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

  const headerSize = 6;
  const directorySize = 16 * count;
  let currentOffset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type = 1 (ICO)
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
    entry.writeUInt8(0, 2); // Color count (0 for 32bpp)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(bitCount, 6); // Bits per pixel
    entry.writeUInt32LE(data.length, 8); // Size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset

    directoryEntries.push(entry);
    payloads.push(data);
    currentOffset += data.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...payloads]);
}

/**
 * Encodes an image into a high-resolution, multi-size ICO buffer.
 *
 * @param {Buffer | { data: Uint8ClampedArray | Buffer, width: number, height: number }} source
 * @param {Object} [options]
 * @param {number[] | string} [options.sizes] - Array or comma-separated list of sizes (e.g. [16, 32, 48, 256])
 * @param {string} [options.background] - Optional background color for flattening
 * @returns {Promise<Buffer>}
 */
async function encodeIco(source, options = {}) {
  const sizes = normalizeSizes(options.sizes);

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

  /** @type {Array<{ width: number, height: number, data: Buffer, bitCount: number }>} */
  const encodedImages = [];

  for (const size of sizes) {
    let pipeline = sharpFactory().resize(size, size, {
      fit: 'contain',
      background: options.background || { r: 0, g: 0, b: 0, alpha: 0 },
    });

    if (options.background) {
      pipeline = pipeline.flatten({ background: options.background });
    }

    const pngBuffer = await pipeline
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();

    encodedImages.push({
      width: size,
      height: size,
      data: pngBuffer,
      bitCount: 32,
    });
  }

  return buildIcoContainer(encodedImages);
}

module.exports = {
  encodeIco,
  buildIcoContainer,
  normalizeSizes,
  DEFAULT_ICO_SIZES,
};
