'use strict';

const { detectFormat } = require('@zapwebp/core');

const METADATA_CHUNK_TYPES = new Set([
  'eXIf', 'iTXt', 'tEXt', 'zTXt', 'tIME', 'pHYs', 'c2pa', 'jumb',
  'EXIF', 'XMP ', 'ICCP',
  'APP1', 'APP11', 'APP13', 'COM',
]);

/**
 * Walks container chunks for an image buffer.
 * @param {Buffer|Uint8Array} bytes
 * @returns {Array<{ type: string, size: number, offset: number, isMetadata: boolean }>}
 */
function parseChunks(bytes) {
  const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const chunks = [];
  if (!data || data.length < 8) return chunks;

  // 1. PNG Chunks
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    let offset = 8;
    while (offset + 8 <= data.length) {
      const length = data.readUInt32BE(offset);
      const type = data.subarray(offset + 4, offset + 8).toString('ascii');
      chunks.push({
        type,
        size: length,
        offset,
        isMetadata: METADATA_CHUNK_TYPES.has(type),
      });
      offset += 12 + length;
      if (type === 'IEND') break;
    }
    return chunks;
  }

  // 2. WebP RIFF Chunks
  if (data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
    chunks.push({ type: 'RIFF', size: 4, offset: 0, isMetadata: false });
    chunks.push({ type: 'WEBP', size: 4, offset: 8, isMetadata: false });
    let offset = 12;
    while (offset + 8 <= data.length) {
      const fourcc = data.subarray(offset, offset + 4).toString('ascii');
      const size = data.readUInt32LE(offset + 4);
      chunks.push({
        type: fourcc.trim(),
        size,
        offset,
        isMetadata: METADATA_CHUNK_TYPES.has(fourcc.trim()),
      });
      offset += 8 + size + (size % 2);
    }
    return chunks;
  }

  // 3. JPEG Markers
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) {
    chunks.push({ type: 'SOI', size: 2, offset: 0, isMetadata: false });
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) { offset++; continue; }
      const marker = data[offset + 1];
      if (marker === 0xda) {
        chunks.push({ type: 'SOS', size: 2, offset, isMetadata: false });
        break;
      }
      if (marker === 0xd9) {
        chunks.push({ type: 'EOI', size: 2, offset, isMetadata: false });
        break;
      }
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
      const length = data.readUInt16BE(offset + 2);
      const name = marker === 0xe1 ? 'APP1' : marker === 0xeb ? 'APP11' : marker === 0xed ? 'APP13' : marker === 0xfe ? 'COM' : `0x${marker.toString(16)}`;
      chunks.push({
        type: name,
        size: length,
        offset,
        isMetadata: METADATA_CHUNK_TYPES.has(name),
      });
      offset += 2 + length;
    }
    return chunks;
  }

  return chunks;
}

module.exports = {
  parseChunks,
  METADATA_CHUNK_TYPES,
};
