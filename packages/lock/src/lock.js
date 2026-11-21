'use strict';

const crypto = require('node:crypto');

const LOCK_VERSION = '1';
const ENGINE_VERSION = '2.26.0';
const LOCK_KEYWORD = 'zapwebp:lock';

// Precomputed CRC32 table for PNG chunk writing
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/**
 * Computes a deterministic SHA-256 hash of conversion options.
 * Two calls with identical conversion parameters produce the exact same hash.
 *
 * @param {object} [options={}]
 * @returns {string} Hex SHA-256 hash
 */
function computeOptionsHash(options = {}) {
  const canonical = {
    background: options.background ? String(options.background).toLowerCase().trim() : null,
    clean: Boolean(options.clean),
    fit: options.fit ? String(options.fit).toLowerCase().trim() : 'cover',
    height: options.height ? Number(options.height) : null,
    lossless: Boolean(options.lossless),
    plugins: Array.isArray(options.plugins)
      ? options.plugins.map((p) => (typeof p === 'string' ? p : p?.name)).filter(Boolean).sort()
      : [],
    quality: options.quality !== undefined ? Number(options.quality) : 85,
    to: options.to ? String(options.to).toLowerCase().trim() : 'webp',
    transforms: Array.isArray(options.transforms)
      ? options.transforms.map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean).sort()
      : [],
    width: options.width ? Number(options.width) : null,
  };

  const serialized = JSON.stringify(canonical, Object.keys(canonical).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Creates the standard `zapwebp:lock` fingerprint block.
 *
 * @param {object} params
 * @param {Buffer|Uint8Array} params.input - Raw input bytes
 * @param {object} params.options - Conversion options
 * @param {string} [params.engineVersion] - Core engine version
 * @returns {object} Lock fingerprint structure
 */
function createLockFingerprint({ input, options = {}, engineVersion = ENGINE_VERSION, convertedAt }) {
  const inputBuf = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  const inputSha256 = crypto.createHash('sha256').update(inputBuf).digest('hex');
  const optionsSha256 = computeOptionsHash(options);

  return {
    'zapwebp:lock': {
      version: LOCK_VERSION,
      inputSha256,
      optionsSha256,
      engineVersion,
      convertedAt: convertedAt || options.convertedAt || (process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString() : '1970-01-01T00:00:00.000Z'),
      optionsSummary: {
        to: options.to ? String(options.to).toLowerCase() : 'webp',
        quality: options.quality !== undefined ? Number(options.quality) : 85,
        clean: Boolean(options.clean),
        lossless: Boolean(options.lossless),
        width: options.width ? Number(options.width) : undefined,
        height: options.height ? Number(options.height) : undefined,
        background: options.background || undefined,
      },
    },
  };
}

/**
 * Embeds a `zapwebp:lock` fingerprint into an image binary container.
 *
 * Supported formats:
 * - WebP: ZAPL RIFF chunk
 * - PNG: zapwebp:lock tEXt chunk
 * - JPEG: zapwebp:lock: COM marker
 * - SVG: <metadata id="zapwebp-lock">
 *
 * @param {Buffer|Uint8Array} buffer
 * @param {string} format
 * @param {object} lockData
 * @returns {Buffer}
 */
function writeLock(buffer, format, lockData) {
  if (!buffer || !buffer.length) return Buffer.from([]);
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const fmt = (format || '').toLowerCase();
  const jsonStr = JSON.stringify(lockData);

  // 1. WebP: RIFF ZAPL Chunk
  if (fmt === 'webp' && buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF') {
    const payload = Buffer.from(jsonStr, 'utf8');
    const chunkLen = payload.length;
    const pad = chunkLen % 2;
    const chunk = Buffer.alloc(8 + chunkLen + pad);
    chunk.write('ZAPL', 0, 4, 'ascii');
    chunk.writeUInt32LE(chunkLen, 4);
    payload.copy(chunk, 8);

    const out = Buffer.concat([buf, chunk]);
    out.writeUInt32LE(out.length - 8, 4); // Update RIFF container size
    return out;
  }

  // 2. PNG: tEXt chunk with keyword "zapwebp:lock"
  if (fmt === 'png' && buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    const keyword = LOCK_KEYWORD;
    const textData = Buffer.concat([
      Buffer.from(keyword + '\0', 'latin1'),
      Buffer.from(jsonStr, 'utf8'),
    ]);

    const chunkLen = Buffer.alloc(4);
    chunkLen.writeUInt32BE(textData.length, 0);

    const chunkType = Buffer.from('tEXt', 'ascii');
    const crcData = Buffer.concat([chunkType, textData]);
    const chunkCrc = Buffer.alloc(4);
    chunkCrc.writeUInt32BE(crc32(crcData), 0);

    const tExtChunk = Buffer.concat([chunkLen, chunkType, textData, chunkCrc]);

    // Insert before IEND
    const iendOffset = buf.lastIndexOf(Buffer.from('IEND', 'ascii'));
    if (iendOffset >= 4) {
      const beforeIend = buf.subarray(0, iendOffset - 4);
      const iendAndAfter = buf.subarray(iendOffset - 4);
      return Buffer.concat([beforeIend, tExtChunk, iendAndAfter]);
    }
  }

  // 3. JPEG: COM segment starting with "zapwebp:lock:"
  if ((fmt === 'jpeg' || fmt === 'jpg') && buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    const payload = Buffer.from(`${LOCK_KEYWORD}:${jsonStr}`, 'utf8');
    if (payload.length <= 65530) {
      const markerLen = payload.length + 2;
      const comMarker = Buffer.alloc(4 + payload.length);
      comMarker[0] = 0xff;
      comMarker[1] = 0xfe; // COM
      comMarker.writeUInt16BE(markerLen, 2);
      payload.copy(comMarker, 4);

      return Buffer.concat([buf.subarray(0, 2), comMarker, buf.subarray(2)]);
    }
  }

  // 4. SVG: <metadata id="zapwebp-lock">
  if (fmt === 'svg') {
    const str = buf.toString('utf8');
    const tag = `<metadata id="zapwebp-lock"><script type="application/json">${jsonStr}</script></metadata>`;
    const closingTagIndex = str.lastIndexOf('</svg>');
    if (closingTagIndex !== -1) {
      const updated = str.slice(0, closingTagIndex) + tag + str.slice(closingTagIndex);
      return Buffer.from(updated, 'utf8');
    }
    return Buffer.concat([buf, Buffer.from(tag, 'utf8')]);
  }

  return buf;
}

/**
 * Reads and parses a `zapwebp:lock` block from an image buffer if present.
 *
 * @param {Buffer|Uint8Array} buffer
 * @param {string} [format]
 * @returns {object|null} Stored lock object or null
 */
function readLock(buffer, format) {
  if (!buffer || !buffer.length) return null;
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const fmt = (format || detectFormat(buf) || '').toLowerCase();

  try {
    // 1. WebP: Search for ZAPL chunk
    if (fmt === 'webp' && buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF') {
      let offset = 12;
      while (offset + 8 <= buf.length) {
        const fourcc = buf.toString('ascii', offset, offset + 4);
        const chunkSize = buf.readUInt32LE(offset + 4);
        const chunkEnd = offset + 8 + chunkSize;
        if (fourcc === 'ZAPL' && chunkEnd <= buf.length) {
          const payload = buf.subarray(offset + 8, chunkEnd).toString('utf8');
          const parsed = JSON.parse(payload);
          return parsed['zapwebp:lock'] || parsed;
        }
        offset += 8 + chunkSize + (chunkSize & 1);
      }
    }

    // 2. PNG: Search for tEXt / iTXt chunk with keyword "zapwebp:lock"
    if (fmt === 'png' && buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      let offset = 8;
      while (offset + 8 <= buf.length) {
        const length = buf.readUInt32BE(offset);
        const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
        if (type === 'tEXt' || type === 'iTXt') {
          const chunkData = buf.subarray(offset + 8, Math.min(offset + 8 + length, buf.length));
          const nullIdx = chunkData.indexOf(0x00);
          if (nullIdx !== -1) {
            const keyword = chunkData.subarray(0, nullIdx).toString('latin1');
            if (keyword === LOCK_KEYWORD) {
              const text = chunkData.subarray(nullIdx + 1).toString('utf8');
              const parsed = JSON.parse(text);
              return parsed['zapwebp:lock'] || parsed;
            }
          }
        }
        offset += 12 + length;
      }
    }

    // 3. JPEG: Scan for COM marker starting with "zapwebp:lock:"
    if ((fmt === 'jpeg' || fmt === 'jpg') && buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset < buf.length) {
        if (buf[offset] !== 0xff) break;
        while (buf[offset] === 0xff) offset++;
        if (offset >= buf.length) break;

        const marker = buf[offset++];
        if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
        if (offset + 2 > buf.length) break;

        const length = buf.readUInt16BE(offset);
        const segEnd = offset + length;
        if (segEnd > buf.length) break;

        if (marker === 0xfe) { // COM
          const payload = buf.subarray(offset + 2, segEnd).toString('utf8');
          if (payload.startsWith(`${LOCK_KEYWORD}:`)) {
            const jsonText = payload.slice(LOCK_KEYWORD.length + 1);
            const parsed = JSON.parse(jsonText);
            return parsed['zapwebp:lock'] || parsed;
          }
        }

        offset = segEnd;
      }
    }

    // 4. SVG: Search for <metadata id="zapwebp-lock">
    if (fmt === 'svg' || (buf.length >= 4 && buf.toString('utf8', 0, 100).includes('<svg'))) {
      const str = buf.toString('utf8');
      const match = str.match(/<metadata id="zapwebp-lock">\s*<script type="application\/json">([\s\S]*?)<\/script>\s*<\/metadata>/i);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        return parsed['zapwebp:lock'] || parsed;
      }
    }
  } catch {
    // Malformed lock block is treated as no lock
    return null;
  }

  return null;
}

/**
 * Format sniffer helper.
 * @param {Buffer} buf
 * @returns {string|null}
 */
function detectFormat(buf) {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('utf8', 0, 100).includes('<svg')) return 'svg';
  return null;
}

/**
 * Evaluates whether an existing output file or buffer satisfies the current conversion request.
 *
 * @param {Buffer|Uint8Array} existingBuffer - The existing output image to test
 * @param {Buffer|Uint8Array} [currentInputBuffer] - The current source image to convert
 * @param {object} [currentOptions={}] - The requested conversion options
 * @param {object} [lockOptions={}] - Lock plugin options
 * @param {boolean} [lockOptions.force=false] - Force re-conversion
 * @param {boolean} [lockOptions.invalidateOnEngineChange=true] - Invalidate when engine version changes
 * @param {string} [lockOptions.engineVersion] - Active engine version
 * @returns {object} Validation result
 */
function verifyLock(
  existingBuffer,
  currentInputBuffer,
  currentOptions = {},
  lockOptions = {}
) {
  const force = Boolean(lockOptions.force || currentOptions.force);
  if (force) {
    return {
      enabled: true,
      detected: false,
      match: false,
      skipped: false,
      reason: 'forced',
    };
  }

  if (!existingBuffer || !existingBuffer.length) {
    return {
      enabled: true,
      detected: false,
      match: false,
      skipped: false,
      reason: 'no_existing_file',
    };
  }

  const existingLock = readLock(existingBuffer);
  if (!existingLock) {
    return {
      enabled: true,
      detected: false,
      match: false,
      skipped: false,
      reason: 'no_lock_present',
    };
  }

  const activeEngineVersion = lockOptions.engineVersion || ENGINE_VERSION;
  const invalidateOnEngineChange = lockOptions.invalidateOnEngineChange !== false;

  // 1. Engine Version verification
  if (invalidateOnEngineChange && existingLock.engineVersion && existingLock.engineVersion !== activeEngineVersion) {
    return {
      enabled: true,
      detected: true,
      match: false,
      skipped: false,
      reason: 'engine_version_mismatch',
      storedEngineVersion: existingLock.engineVersion,
      currentEngineVersion: activeEngineVersion,
      lock: existingLock,
    };
  }

  // 2. Options Hash verification
  const currentOptionsHash = computeOptionsHash(currentOptions);
  if (existingLock.optionsSha256 && existingLock.optionsSha256 !== currentOptionsHash) {
    return {
      enabled: true,
      detected: true,
      match: false,
      skipped: false,
      reason: 'options_hash_mismatch',
      storedOptionsHash: existingLock.optionsSha256,
      currentOptionsHash,
      lock: existingLock,
    };
  }

  // 3. Input Hash verification (if source buffer provided)
  if (currentInputBuffer && currentInputBuffer.length) {
    const inputBuf = Buffer.isBuffer(currentInputBuffer) ? currentInputBuffer : Buffer.from(currentInputBuffer);
    const currentInputHash = crypto.createHash('sha256').update(inputBuf).digest('hex');
    if (existingLock.inputSha256 && existingLock.inputSha256 !== currentInputHash) {
      return {
        enabled: true,
        detected: true,
        match: false,
        skipped: false,
        reason: 'input_hash_mismatch',
        storedInputHash: existingLock.inputSha256,
        currentInputHash,
        lock: existingLock,
      };
    }
  }

  // All checks passed -> Skip conversion
  return {
    enabled: true,
    detected: true,
    match: true,
    skipped: true,
    reason: 'options_hash_match',
    inputSha256: existingLock.inputSha256,
    optionsSha256: existingLock.optionsSha256,
    engineVersion: existingLock.engineVersion,
    convertedAt: existingLock.convertedAt,
    optionsSummary: existingLock.optionsSummary,
    lock: existingLock,
  };
}

/**
 * Creates the `@zapwebp/lock` plugin object conforming to Zapwebp Plugin SDK.
 *
 * @param {object} [pluginOptions={}]
 * @returns {object}
 */
function createLockPlugin(pluginOptions = {}) {
  const defaultOpts = {
    enabled: true,
    force: false,
    invalidateOnEngineChange: true,
    engineVersion: ENGINE_VERSION,
    ...pluginOptions,
  };

  return {
    name: '@zapwebp/lock',
    version: '1.0.0',
    hooks: {
      /**
       * Before conversion hook: checks if destination or source has a valid matching lock.
       */
      async beforeConvert(context) {
        if (!defaultOpts.enabled || context.force || defaultOpts.force) {
          return context;
        }

        const existing = context.existingBuffer || context.destinationBuffer;
        if (existing) {
          const verification = verifyLock(
            existing,
            context.input,
            context.options,
            defaultOpts
          );

          if (verification.match) {
            return {
              ...context,
              skipConversion: true,
              output: existing,
              lock: verification,
            };
          }
        }

        return context;
      },

      /**
       * After conversion hook: injects the cryptographic lock fingerprint into the output.
       */
      async afterConvert(context, outputs) {
        if (!defaultOpts.enabled || context.noLock || context.skipConversion) {
          return outputs;
        }

        const outList = Array.isArray(outputs) ? outputs : [outputs];
        return outList.map((out) => {
          if (!out || !out.data || !out.format) return out;

          const fingerprint = createLockFingerprint({
            input: context.input,
            options: context.options,
            engineVersion: defaultOpts.engineVersion,
          });

          const lockedData = writeLock(out.data, out.format, fingerprint);
          return {
            ...out,
            data: lockedData,
            size: lockedData.length,
            lock: {
              enabled: true,
              detected: false,
              match: false,
              skipped: false,
              ...fingerprint['zapwebp:lock'],
            },
          };
        });
      },
    },
  };
}

module.exports = {
  LOCK_VERSION,
  ENGINE_VERSION,
  LOCK_KEYWORD,
  computeOptionsHash,
  createLockFingerprint,
  writeLock,
  readLock,
  verifyLock,
  createLockPlugin,
};
