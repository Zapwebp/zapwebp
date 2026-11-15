'use strict';

const { definePlugin } = require('@zapwebp/plugin-sdk');
const { parseIco, decodeIco, decodeBmpDib, MAX_ICO_ENTRIES, PNG_MAGIC } = require('./parse');
const { encodeIco, buildIcoContainer, normalizeSizes, DEFAULT_ICO_SIZES } = require('./write');
const { generateFaviconSuite } = require('./favicon');

/**
 * Zapwebp format handler for ICO and CUR image containers.
 * Conforms to the @zapwebp/core FormatHandler interface.
 */
const icoHandler = {
  name: 'ico',
  mimeTypes: Object.freeze(['image/x-icon', 'image/vnd.microsoft.icon']),
  extensions: Object.freeze(['.ico', '.cur']),
  supportsAlpha: true,
  isInput: true,
  isOutput: true,

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
  },

  /**
   * Decodes an ICO container into a RawImage (RGBA 32-bit).
   *
   * @param {Buffer | Uint8Array} bytes
   * @param {Object} [options]
   * @returns {Promise<{ data: Uint8ClampedArray, width: number, height: number, channels: 4, alphaPreserved: boolean }>}
   */
  async decode(bytes, options = {}) {
    return decodeIco(bytes, options);
  },

  /**
   * Encodes a RawImage or image buffer into a multi-resolution ICO file.
   *
   * @param {Buffer | { data: Uint8ClampedArray | Buffer, width: number, height: number }} image
   * @param {Object} [options]
   * @returns {Promise<Buffer>}
   */
  async encode(image, options = {}) {
    return encodeIco(image, options);
  },
};

/**
 * Official Zapwebp Plugin wrapper for @zapwebp/format-ico.
 */
const plugin = definePlugin({
  name: '@zapwebp/format-ico',
  version: '1.0.0',
  description: 'High-resolution multi-size ICO/CUR format handler and favicon suite generator for Zapwebp',
  formatHandlers: [icoHandler],
});

module.exports = {
  icoHandler,
  plugin,
  parseIco,
  decodeIco,
  decodeBmpDib,
  encodeIco,
  buildIcoContainer,
  generateFaviconSuite,
  normalizeSizes,
  DEFAULT_ICO_SIZES,
  MAX_ICO_ENTRIES,
  PNG_MAGIC,
};
