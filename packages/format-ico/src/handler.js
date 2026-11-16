'use strict';

const { parseIco, decodeIco, MAX_ICO_ENTRIES } = require('./parse');
const { writeIco } = require('./write');
const { resolveIcoConfig, DEFAULT_CONFIG } = require('./config');

/**
 * Config-driven format handler for ICO and CUR image containers.
 * Conforms to the @zapwebp/core and @zapwebp/plugin-sdk FormatHandler interface.
 */
class IcoFormatHandler {
  name = 'ico';
  mimeTypes = Object.freeze(['image/x-icon', 'image/vnd.microsoft.icon']);
  extensions = Object.freeze(['.ico', '.cur']);
  supportsAlpha = true;
  isInput = true;
  isOutput = true;

  /**
   * @param {Partial<import('./config').IcoConfig>} [config]
   */
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Detects whether a byte stream is a valid ICO or CUR container.
   *
   * @param {Buffer | Uint8Array} bytes
   * @returns {boolean}
   */
  detect(bytes) {
    if (!bytes || bytes.length < 6) return false;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const reserved = buf.readUInt16LE(0);
    const type = buf.readUInt16LE(2);
    const count = buf.readUInt16LE(4);
    return reserved === 0 && (type === 1 || type === 2) && count > 0 && count <= MAX_ICO_ENTRIES;
  }

  /**
   * Decodes an ICO container into a RawImage (RGBA 32-bit).
   *
   * @param {Buffer | Uint8Array} bytes
   * @param {Object} [options]
   * @returns {Promise<{ data: Uint8ClampedArray, width: number, height: number, channels: 4, alphaPreserved: boolean }>}
   */
  async decode(bytes, options = {}) {
    const merged = { ...this.config, ...options };
    return decodeIco(bytes, merged);
  }

  /**
   * Encodes a RawImage or image buffer into an ICO container.
   *
   * @param {Buffer | { data: Uint8ClampedArray | Buffer, width: number, height: number }} image
   * @param {Partial<import('./config').IcoConfig>} [options]
   * @returns {Promise<Buffer>}
   */
  async encode(image, options = {}) {
    const merged = { ...this.config, ...options };
    return writeIco(image, merged);
  }
}

/** Default singleton format handler instance */
const icoHandler = new IcoFormatHandler();

module.exports = {
  IcoFormatHandler,
  icoHandler,
};
