'use strict';

const { ZapwebpError } = require('@zapwebp/shared');

/**
 * Encodes an RGBA raw pixel buffer into a Windows ICO BMP DIB stream (XOR image + AND transparency mask).
 *
 * @param {Uint8ClampedArray | Buffer} rgba - Raw 32-bit RGBA pixel buffer
 * @param {number} width - Image pixel width
 * @param {number} height - Image pixel height
 * @returns {Buffer} - Formatted BMP DIB Buffer ready for embedding in an ICONDIRENTRY
 */
function encodeBmpDib(rgba, width, height) {
  if (!rgba || width <= 0 || height <= 0) {
    throw new ZapwebpError({
      code: 'E_INVALID_IMAGE',
      message: 'Invalid dimensions or buffer for BMP DIB encoding.',
      fix: 'Provide valid width, height, and RGBA pixel buffer.',
    });
  }

  const rawBuffer = Buffer.isBuffer(rgba) ? rgba : Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);

  const headerSize = 40; // BITMAPINFOHEADER size
  const bitCount = 32;

  // Stride of XOR mask (4 bytes per pixel for 32bpp, naturally 4-byte aligned)
  const xorRowStride = Math.floor((width * bitCount + 31) / 32) * 4;
  const xorTotalSize = xorRowStride * height;

  // Stride of 1-bit AND mask (1 bit per pixel, rows 4-byte aligned)
  const andRowStride = Math.floor((width + 31) / 32) * 4;
  const andTotalSize = andRowStride * height;

  const totalDIBSize = headerSize + xorTotalSize + andTotalSize;
  const dib = Buffer.alloc(totalDIBSize);

  // 1. Write BITMAPINFOHEADER (40 bytes)
  dib.writeUInt32LE(headerSize, 0); // biSize
  dib.writeInt32LE(width, 4); // biWidth
  dib.writeInt32LE(height * 2, 8); // biHeight: DOUBLED for ICO XOR + AND mask
  dib.writeUInt16LE(1, 12); // biPlanes
  dib.writeUInt16LE(bitCount, 14); // biBitCount (32 bpp ARGB)
  dib.writeUInt32LE(0, 16); // biCompression = BI_RGB (uncompressed)
  dib.writeUInt32LE(xorTotalSize + andTotalSize, 20); // biSizeImage
  dib.writeInt32LE(0, 24); // biXPelsPerMeter
  dib.writeInt32LE(0, 28); // biYPelsPerMeter
  dib.writeUInt32LE(0, 32); // biClrUsed
  dib.writeUInt32LE(0, 36); // biClrImportant

  const xorDataOffset = headerSize;
  const andDataOffset = headerSize + xorTotalSize;

  // 2. Populate XOR mask (bottom-to-top BGRA) and AND mask (1 = transparent, 0 = opaque)
  for (let y = 0; y < height; y++) {
    // BMP scanlines are bottom-to-top
    const srcRowY = y;
    const bmpRowY = height - 1 - y;

    const xorRowStart = xorDataOffset + bmpRowY * xorRowStride;
    const andRowStart = andDataOffset + bmpRowY * andRowStride;

    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRowY * width + x) * 4;
      const r = rawBuffer[srcIdx];
      const g = rawBuffer[srcIdx + 1];
      const b = rawBuffer[srcIdx + 2];
      const a = rawBuffer[srcIdx + 3];

      // Write BGRA to XOR mask
      const dstXor = xorRowStart + x * 4;
      dib[dstXor] = b;
      dib[dstXor + 1] = g;
      dib[dstXor + 2] = r;
      dib[dstXor + 3] = a;

      // Write bit to AND mask (1 bit per pixel: 1 if alpha is 0, 0 if opaque)
      if (a === 0) {
        const byteIndex = andRowStart + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        dib[byteIndex] |= 1 << bitOffset;
      }
    }
  }

  return dib;
}

module.exports = {
  encodeBmpDib,
};
