'use strict';

const sharp = require('sharp');
const { ZapwebpError } = require('@zapwebp/shared');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_ICO_ENTRIES = 20;
const MAX_DECODED_BYTES = 100 * 1024 * 1024; // 100 MB bounds

/**
 * @typedef {Object} IcoEntry
 * @property {number} width
 * @property {number} height
 * @property {number} colorCount
 * @property {number} planes
 * @property {number} bitCount
 * @property {number} bytesInRes
 * @property {number} imageOffset
 * @property {'png' | 'bmp'} format
 * @property {Buffer} data
 */

/**
 * @typedef {Object} ParsedIco
 * @property {'ico' | 'cur'} type
 * @property {number} count
 * @property {IcoEntry[]} entries
 */

/**
 * Parses an ICO or CUR container buffer into structured image entries.
 *
 * @param {Buffer | Uint8Array} input
 * @returns {ParsedIco}
 */
function parseIco(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);

  if (buffer.length < 6) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: 'ICO file is too small to contain a valid header (minimum 6 bytes).',
      fix: 'Verify the file is a complete, uncorrupted .ico image.',
    });
  }

  const reserved = buffer.readUInt16LE(0);
  const typeCode = buffer.readUInt16LE(2);
  const count = buffer.readUInt16LE(4);

  if (reserved !== 0) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: `Invalid ICO reserved field: expected 0, got ${reserved}.`,
      fix: 'Verify the file has a valid ICO container signature (0x0000).',
    });
  }

  if (typeCode !== 1 && typeCode !== 2) {
    throw new ZapwebpError({
      code: 'E_UNSUPPORTED_FORMAT',
      message: `Invalid ICO type: expected 1 (ICO) or 2 (CUR), got ${typeCode}.`,
      fix: 'Provide a valid ICO or CUR file.',
    });
  }

  if (count <= 0) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: 'ICO file contains 0 image entries.',
      fix: 'Ensure the ICO container contains at least one image.',
    });
  }

  if (count > MAX_ICO_ENTRIES) {
    throw new ZapwebpError({
      code: 'E_BOUNDS_EXCEEDED',
      message: `ICO container contains ${count} entries, exceeding safe limit of ${MAX_ICO_ENTRIES}.`,
      fix: 'Re-encode the ICO container with standard resolution targets (<= 20 entries).',
    });
  }

  const headerTableSize = 6 + count * 16;
  if (buffer.length < headerTableSize) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: `ICO file truncated: header table requires ${headerTableSize} bytes, but file is ${buffer.length} bytes.`,
      fix: 'Check the file source for truncation.',
    });
  }

  /** @type {IcoEntry[]} */
  const entries = [];

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    const rawWidth = buffer.readUInt8(entryOffset);
    const rawHeight = buffer.readUInt8(entryOffset + 1);
    const colorCount = buffer.readUInt8(entryOffset + 2);
    // reserved = buffer.readUInt8(entryOffset + 3);
    const planes = buffer.readUInt16LE(entryOffset + 4);
    const bitCount = buffer.readUInt16LE(entryOffset + 6);
    const bytesInRes = buffer.readUInt32LE(entryOffset + 8);
    const imageOffset = buffer.readUInt32LE(entryOffset + 12);

    if (bytesInRes === 0) {
      throw new ZapwebpError({
        code: 'E_CORRUPT_HEADER',
        message: `ICO entry ${i} specifies 0 image bytes.`,
        fix: 'Remove corrupt entries from the ICO container.',
      });
    }

    if (imageOffset + bytesInRes > buffer.length) {
      throw new ZapwebpError({
        code: 'E_CORRUPT_HEADER',
        message: `ICO entry ${i} data offset (${imageOffset} + ${bytesInRes} bytes) exceeds file size (${buffer.length} bytes).`,
        fix: 'File is truncated or corrupted.',
      });
    }

    const payload = buffer.subarray(imageOffset, imageOffset + bytesInRes);
    const isPng = payload.length >= 8 && payload.subarray(0, 8).equals(PNG_MAGIC);
    const format = isPng ? 'png' : 'bmp';

    let width = rawWidth === 0 ? 256 : rawWidth;
    let height = rawHeight === 0 ? 256 : rawHeight;

    // If BMP DIB, read true dimensions from BITMAPINFOHEADER if available
    if (!isPng && payload.length >= 40) {
      const dibHeaderSize = payload.readUInt32LE(0);
      if (dibHeaderSize >= 40) {
        const dibWidth = payload.readInt32LE(4);
        const dibHeight = payload.readInt32LE(8);
        if (dibWidth > 0) width = dibWidth;
        if (dibHeight !== 0) height = Math.abs(dibHeight) / 2; // In ICO DIB, biHeight is 2x actual height
      }
    }

    entries.push({
      width,
      height,
      colorCount,
      planes,
      bitCount,
      bytesInRes,
      imageOffset,
      format,
      data: payload,
    });
  }

  return {
    type: typeCode === 1 ? 'ico' : 'cur',
    count,
    entries,
  };
}

/**
 * Decodes a BMP DIB inside an ICO entry to raw RGBA pixels.
 *
 * @param {Buffer} dibBuffer
 * @param {number} expectedWidth
 * @param {number} expectedHeight
 * @returns {{ data: Uint8ClampedArray, width: number, height: number, channels: 4, alphaPreserved: boolean }}
 */
function decodeBmpDib(dibBuffer, expectedWidth, expectedHeight) {
  if (dibBuffer.length < 40) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: 'BMP DIB header in ICO entry is shorter than 40 bytes.',
      fix: 'Verify the ICO entry contains valid BMP BITMAPINFOHEADER.',
    });
  }

  const biSize = dibBuffer.readUInt32LE(0);
  const biWidth = dibBuffer.readInt32LE(4);
  const biHeight = dibBuffer.readInt32LE(8);
  const biPlanes = dibBuffer.readUInt16LE(12);
  const biBitCount = dibBuffer.readUInt16LE(14);
  const biCompression = dibBuffer.readUInt32LE(16);
  const biClrUsed = dibBuffer.readUInt32LE(32);

  const width = biWidth > 0 ? biWidth : expectedWidth;
  const height = biHeight !== 0 ? Math.floor(Math.abs(biHeight) / 2) : expectedHeight;

  if (width <= 0 || height <= 0 || width > 4096 || height > 4096) {
    throw new ZapwebpError({
      code: 'E_BOUNDS_EXCEEDED',
      message: `Invalid dimensions in ICO BMP DIB: ${width}x${height}.`,
      fix: 'ICO images must be between 1x1 and 4096x4096 pixels.',
    });
  }

  const totalPixels = width * height;
  const outBytes = totalPixels * 4;
  if (outBytes > MAX_DECODED_BYTES) {
    throw new ZapwebpError({
      code: 'E_BOUNDS_EXCEEDED',
      message: `Decoded image size (${outBytes} bytes) exceeds limit of ${MAX_DECODED_BYTES} bytes.`,
      fix: 'Use smaller icon dimensions.',
    });
  }

  const rgba = new Uint8ClampedArray(outBytes);

  // Palette handling for 1, 4, 8 bpp
  let paletteOffset = biSize;
  const paletteEntries = biClrUsed > 0 ? biClrUsed : (biBitCount <= 8 ? (1 << biBitCount) : 0);
  const palette = [];
  if (paletteEntries > 0) {
    for (let p = 0; p < paletteEntries; p++) {
      const pOffset = paletteOffset + p * 4;
      if (pOffset + 4 <= dibBuffer.length) {
        palette.push({
          b: dibBuffer[pOffset],
          g: dibBuffer[pOffset + 1],
          r: dibBuffer[pOffset + 2],
        });
      } else {
        palette.push({ b: 0, g: 0, r: 0 });
      }
    }
  }

  const xorDataOffset = paletteOffset + paletteEntries * 4;

  // Stride of XOR mask (rows are 4-byte padded)
  const xorRowStride = Math.floor((width * biBitCount + 31) / 32) * 4;
  const xorTotalSize = xorRowStride * height;

  // Stride of 1-bit AND mask (1 bit per pixel, rows 4-byte padded)
  const andRowStride = Math.floor((width + 31) / 32) * 4;
  const andDataOffset = xorDataOffset + xorTotalSize;

  let hasExplicitAlpha = false;

  if (biBitCount === 32) {
    // Check if any 4th byte is non-zero (Vista+ 32-bit ARGB)
    for (let y = 0; y < height; y++) {
      const rowOffset = xorDataOffset + (height - 1 - y) * xorRowStride;
      for (let x = 0; x < width; x++) {
        const src = rowOffset + x * 4;
        if (src + 3 < dibBuffer.length && dibBuffer[src + 3] > 0) {
          hasExplicitAlpha = true;
          break;
        }
      }
      if (hasExplicitAlpha) break;
    }
  }

  // Iterate rows (BMP rows are stored bottom-to-top)
  for (let y = 0; y < height; y++) {
    // BMP is bottom-up
    const srcRowY = height - 1 - y;
    const xorRowStart = xorDataOffset + srcRowY * xorRowStride;
    const andRowStart = andDataOffset + srcRowY * andRowStride;

    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      if (biBitCount === 32) {
        const src = xorRowStart + x * 4;
        if (src + 3 < dibBuffer.length) {
          b = dibBuffer[src];
          g = dibBuffer[src + 1];
          r = dibBuffer[src + 2];
          a = hasExplicitAlpha ? dibBuffer[src + 3] : 255;
        }
      } else if (biBitCount === 24) {
        const src = xorRowStart + x * 3;
        if (src + 2 < dibBuffer.length) {
          b = dibBuffer[src];
          g = dibBuffer[src + 1];
          r = dibBuffer[src + 2];
        }
      } else if (biBitCount === 8) {
        const src = xorRowStart + x;
        if (src < dibBuffer.length) {
          const colorIdx = dibBuffer[src];
          const c = palette[colorIdx] || { r: 0, g: 0, b: 0 };
          r = c.r;
          g = c.g;
          b = c.b;
        }
      } else if (biBitCount === 4) {
        const byteOffset = xorRowStart + (x >> 1);
        if (byteOffset < dibBuffer.length) {
          const byteVal = dibBuffer[byteOffset];
          const colorIdx = (x & 1) === 0 ? (byteVal >> 4) : (byteVal & 0x0f);
          const c = palette[colorIdx] || { r: 0, g: 0, b: 0 };
          r = c.r;
          g = c.g;
          b = c.b;
        }
      } else if (biBitCount === 1) {
        const byteOffset = xorRowStart + (x >> 3);
        if (byteOffset < dibBuffer.length) {
          const bitVal = (dibBuffer[byteOffset] >> (7 - (x & 7))) & 1;
          const c = palette[bitVal] || { r: 0, g: 0, b: 0 };
          r = c.r;
          g = c.g;
          b = c.b;
        }
      }

      // If not 32-bit with explicit alpha, read 1-bit AND mask for transparency
      if (!hasExplicitAlpha && andRowStart < dibBuffer.length) {
        const andByteOffset = andRowStart + (x >> 3);
        if (andByteOffset < dibBuffer.length) {
          const andBit = (dibBuffer[andByteOffset] >> (7 - (x & 7))) & 1;
          // In AND mask: 0 = opaque, 1 = transparent
          if (andBit === 1) {
            a = 0;
          }
        }
      }

      rgba[dstIdx] = r;
      rgba[dstIdx + 1] = g;
      rgba[dstIdx + 2] = b;
      rgba[dstIdx + 3] = a;
    }
  }

  return {
    data: rgba,
    width,
    height,
    channels: 4,
    alphaPreserved: true,
  };
}

/**
 * Decodes an ICO container into a RawImage.
 * By default, selects the largest resolution image in the container.
 *
 * @param {Buffer | Uint8Array} input
 * @param {Object} [options]
 * @param {number} [options.size] - Specific target dimension to extract (e.g. 32, 256)
 * @returns {Promise<{ data: Uint8ClampedArray, width: number, height: number, channels: 4, alphaPreserved: boolean }>}
 */
async function decodeIco(input, options = {}) {
  const parsed = parseIco(input);

  if (!parsed.entries.length) {
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: 'No readable images found in ICO container.',
      fix: 'Provide a valid ICO file containing at least one image.',
    });
  }

  // Find requested size or largest entry
  let selected = parsed.entries[0];

  if (options.size) {
    const match = parsed.entries.find((e) => e.width === options.size || e.height === options.size);
    if (match) selected = match;
  } else {
    // Sort descending by resolution (width * height), then bitCount
    const sorted = [...parsed.entries].sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      if (areaB !== areaA) return areaB - areaA;
      return b.bitCount - a.bitCount;
    });
    selected = sorted[0];
  }

  if (selected.format === 'png') {
    const { data: raw, info } = await sharp(selected.data, {
      limitInputPixels: 4096 * 4096,
      failOn: 'error',
    })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength),
      width: info.width,
      height: info.height,
      channels: 4,
      alphaPreserved: true,
    };
  }

  // BMP DIB decoding
  return decodeBmpDib(selected.data, selected.width, selected.height);
}

module.exports = {
  parseIco,
  decodeIco,
  decodeBmpDib,
  MAX_ICO_ENTRIES,
  PNG_MAGIC,
};
