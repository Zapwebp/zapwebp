'use strict';

/**
 * @typedef {import('../index').RawImage} RawImage
 * @typedef {import('../index').ConvertOptions} ConvertOptions
 */

/**
 * @typedef {Object} FormatHandler
 * @property {string} name - Canonical name (e.g. 'webp', 'png', 'svg')
 * @property {readonly string[]} mimeTypes - Associated MIME types
 * @property {readonly string[]} extensions - Associated file extensions (with leading dot)
 * @property {boolean} supportsAlpha - Whether format supports transparency
 * @property {boolean} isInput - Whether format can be read/decoded
 * @property {boolean} isOutput - Whether format can be targeted for output encoding
 * @property {(bytes: Uint8Array | Buffer) => boolean} detect - Byte sniffer
 * @property {(bytes: Uint8Array | Buffer, options?: object) => Promise<RawImage>} decode - Decodes to RGBA
 * @property {(image: RawImage, options?: object) => Promise<Buffer | Uint8Array>} encode - Encodes raw RGBA
 */

class FormatRegistry {
  constructor() {
    /** @type {Map<string, FormatHandler>} */
    this._byName = new Map();
    /** @type {Map<string, FormatHandler>} */
    this._byMime = new Map();
    /** @type {Map<string, FormatHandler>} */
    this._byExt = new Map();
    /** @type {Set<FormatHandler>} */
    this._handlers = new Set();
  }

  /**
   * Registers a new format handler.
   * @param {FormatHandler} handler
   */
  register(handler) {
    if (!handler || typeof handler !== 'object') {
      throw new TypeError('Format handler must be an object.');
    }
    if (!handler.name || typeof handler.name !== 'string') {
      throw new TypeError('Format handler must have a valid string name.');
    }
    const name = handler.name.toLowerCase();
    this._byName.set(name, handler);
    this._handlers.add(handler);

    if (Array.isArray(handler.mimeTypes)) {
      for (const mime of handler.mimeTypes) {
        this._byMime.set(mime.toLowerCase(), handler);
      }
    }

    if (Array.isArray(handler.extensions)) {
      for (const ext of handler.extensions) {
        const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
        this._byExt.set(normalized, handler);
      }
    }
  }

  /**
   * Gets a format handler by name.
   * @param {string} name
   * @returns {FormatHandler | undefined}
   */
  getByName(name) {
    if (!name) return undefined;
    return this._byName.get(String(name).toLowerCase());
  }

  /**
   * Gets a format handler by MIME type.
   * @param {string} mime
   * @returns {FormatHandler | undefined}
   */
  getByMime(mime) {
    if (!mime) return undefined;
    return this._byMime.get(String(mime).toLowerCase().split(';')[0].trim());
  }

  /**
   * Gets a format handler by file extension.
   * @param {string} ext
   * @returns {FormatHandler | undefined}
   */
  getByExtension(ext) {
    if (!ext) return undefined;
    const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return this._byExt.get(normalized);
  }

  /**
   * Detects the format handler matching the input byte signature.
   * @param {Uint8Array | Buffer} bytes
   * @returns {FormatHandler | null}
   */
  detect(bytes) {
    if (!bytes || !bytes.length) return null;
    for (const handler of this._handlers) {
      if (typeof handler.detect === 'function') {
        try {
          if (handler.detect(bytes)) {
            return handler;
          }
        } catch {
          // Continue scanning next handler
        }
      }
    }
    return null;
  }

  /**
   * Returns all registered format handlers.
   * @returns {FormatHandler[]}
   */
  getAll() {
    return Array.from(this._handlers);
  }

  /**
   * Returns an array of supported input format names.
   * @returns {string[]}
   */
  getSupportedInputs() {
    return Array.from(this._handlers)
      .filter((h) => h.isInput)
      .map((h) => h.name);
  }

  /**
   * Returns an array of supported output format names.
   * @returns {string[]}
   */
  getSupportedOutputs() {
    return Array.from(this._handlers)
      .filter((h) => h.isOutput)
      .map((h) => h.name);
  }
}

const registry = new FormatRegistry();

module.exports = {
  FormatRegistry,
  registry,
  registerFormat: (handler) => registry.register(handler),
  getHandlerByName: (name) => registry.getByName(name),
  getHandlerByMime: (mime) => registry.getByMime(mime),
  getHandlerByExtension: (ext) => registry.getByExtension(ext),
  detectFormatHandler: (bytes) => registry.detect(bytes),
  getAllHandlers: () => registry.getAll(),
};
