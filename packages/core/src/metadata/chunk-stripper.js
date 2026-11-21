'use strict';

/**
 * Non-destructive metadata chunk stripping for JPEG, WebP, PNG, and SVG containers.
 * Manipulates binary container structures directly without pixel decompression or re-encoding.
 */

/**
 * Strips metadata segments (APP1, APP2, APP13, COM) from JPEG containers.
 * Preserves SOI, JFIF (APP0), Adobe (APP14), DQT, DHT, SOF, and entropy scan data (SOS).
 *
 * @param {Buffer} buf
 * @param {object} [options]
 * @param {boolean} [options.keepIcc=false]
 * @returns {Buffer}
 */
function stripJpegMetadata(buf, { keepIcc = false } = {}) {
  if (!Buffer.isBuffer(buf) || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return buf;
  }

  const chunks = [buf.subarray(0, 2)]; // Keep SOI
  let offset = 2;

  while (offset < buf.length) {
    if (buf[offset] !== 0xff) break;
    while (buf[offset] === 0xff) offset++; // Skip fill bytes
    if (offset >= buf.length) break;

    const marker = buf[offset++];
    if (marker === 0xd8) continue; // SOI

    if (marker === 0xd9) { // EOI
      chunks.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    if (marker === 0xda) { // SOS (Start of Scan) - remainder is compressed entropy stream
      chunks.push(buf.subarray(offset - 2));
      break;
    }

    if (offset + 2 > buf.length) break;
    const length = buf.readUInt16BE(offset);
    const segEnd = offset + length;
    if (segEnd > buf.length) break;

    let drop = false;
    // APP1 (EXIF / XMP)
    if (marker === 0xe1) {
      drop = true;
    }
    // APP2 (ICC Profile)
    else if (marker === 0xe2 && !keepIcc) {
      drop = true;
    }
    // APP13 (Photoshop IRB / IPTC)
    else if (marker === 0xed) {
      drop = true;
    }
    // COM (Comment) - preserve zapwebp engine metadata (lock / custom)
    else if (marker === 0xfe) {
      const payload = buf.subarray(offset + 2, segEnd).toString('utf8');
      if (payload.startsWith('zapwebp:lock:') || payload.startsWith('zapwebp:custom:')) {
        drop = false;
      } else {
        drop = true;
      }
    }

    if (!drop) {
      chunks.push(buf.subarray(offset - 2, segEnd));
    }

    offset = segEnd;
  }

  return Buffer.concat(chunks);
}

/**
 * Strips metadata chunks (EXIF, XMP, ICCP) from WebP RIFF containers.
 * Preserves VP8/VP8L pixel payload and updates VP8X header flags.
 *
 * @param {Buffer} buf
 * @param {object} [options]
 * @param {boolean} [options.keepIcc=false]
 * @returns {Buffer}
 */
function stripWebpMetadata(buf, { keepIcc = false } = {}) {
  if (
    !Buffer.isBuffer(buf) ||
    buf.length < 12 ||
    buf.toString('ascii', 0, 4) !== 'RIFF' ||
    buf.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return buf;
  }

  const keptChunks = [];
  let offset = 12;

  while (offset + 8 <= buf.length) {
    const fourcc = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize & 1);
    const chunkEnd = offset + 8 + paddedSize;
    if (chunkEnd > buf.length) break;

    if (fourcc === 'EXIF' || fourcc === 'XMP ' || (fourcc === 'ICCP' && !keepIcc)) {
      // Drop metadata chunk
    } else if (fourcc === 'VP8X') {
      const vp8xChunk = Buffer.from(buf.subarray(offset, chunkEnd));
      // Byte 8 within chunk is flags (offset 0-3: VP8X, 4-7: size, 8: flags)
      if (vp8xChunk.length > 8) {
        let flags = vp8xChunk[8];
        flags &= ~(1 << 3); // Clear XMP (bit 3)
        flags &= ~(1 << 2); // Clear EXIF (bit 2)
        if (!keepIcc) flags &= ~(1 << 0); // Clear ICCP (bit 0)
        vp8xChunk[8] = flags;
      }
      keptChunks.push(vp8xChunk);
    } else {
      keptChunks.push(buf.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;
  }

  const payload = Buffer.concat(keptChunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(payload.length + 4, 4);
  header.write('WEBP', 8, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

/**
 * Strips metadata chunks (eXIf, tEXt, iTXt, zTXt, iCCP) from PNG containers.
 * Preserves IHDR, PLTE, IDAT, tRNS, and IEND.
 *
 * @param {Buffer} buf
 * @param {object} [options]
 * @param {boolean} [options.keepIcc=false]
 * @returns {Buffer}
 */
function stripPngMetadata(buf, { keepIcc = false } = {}) {
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!Buffer.isBuffer(buf) || buf.length < 8 || !buf.subarray(0, 8).equals(pngSig)) {
    return buf;
  }

  const kept = [buf.subarray(0, 8)];
  let offset = 8;

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buf.length) break;

    if (
      type === 'eXIf' ||
      type === 'zTXt' ||
      type === 'tIME' ||
      type === 'pHYs' ||
      (type === 'iCCP' && !keepIcc)
    ) {
      // Drop metadata chunk
    } else if (type === 'tEXt' || type === 'iTXt') {
      const chunkData = buf.subarray(offset + 8, chunkEnd);
      const nullIdx = chunkData.indexOf(0x00);
      const keyword = nullIdx !== -1 ? chunkData.subarray(0, nullIdx).toString('latin1') : '';
      if (keyword === 'zapwebp:lock' || keyword === 'zapwebp:custom') {
        kept.push(buf.subarray(offset, chunkEnd));
      }
      // other non-engine text chunks dropped
    } else {
      kept.push(buf.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;
  }

  return Buffer.concat(kept);
}

/**
 * Strips XML metadata blocks from SVG text buffers.
 *
 * @param {Buffer} buf
 * @returns {Buffer}
 */
function stripSvgMetadata(buf) {
  if (!Buffer.isBuffer(buf)) return buf;
  const str = buf.toString('utf8');
  if (!str.includes('<svg')) return buf;

  const cleaned = str
    .replace(/<metadata(?!\s+id="zapwebp-(?:lock|custom)")[\s\S]*?<\/metadata>/gi, '')
    .replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, '');

  return Buffer.from(cleaned, 'utf8');
}

/**
 * Strips container metadata non-destructively for any supported image format.
 *
 * @param {Buffer|Uint8Array} bytes
 * @param {object} [options]
 * @returns {Buffer}
 */
function stripContainerMetadata(bytes, options = {}) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const keepIcc = Array.isArray(options.keep) && options.keep.map((k) => String(k).toLowerCase()).includes('icc');

  // JPEG
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    return stripJpegMetadata(buf, { keepIcc });
  }

  // WebP
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return stripWebpMetadata(buf, { keepIcc });
  }

  // PNG
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return stripPngMetadata(buf, { keepIcc });
  }

  // SVG
  if (buf.subarray(0, 1024).toString('utf8').includes('<svg')) {
    return stripSvgMetadata(buf);
  }

  return buf;
}

module.exports = {
  stripJpegMetadata,
  stripWebpMetadata,
  stripPngMetadata,
  stripSvgMetadata,
  stripContainerMetadata,
};
