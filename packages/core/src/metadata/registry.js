'use strict';

const sharp = require('sharp');
const { ZapwebpError } = require('@zapwebp/shared');

/**
 * @typedef {Object} MetadataField
 * @property {string} type - 'EXIF', 'XMP', 'C2PA', 'PNG-tEXt', 'ICC', etc.
 * @property {string} key
 * @property {string} value
 * @property {number} [offset]
 */

/**
 * @typedef {Object} MetadataHandler
 * @property {string} name
 * @property {(bytes: Uint8Array | Buffer) => Promise<MetadataField[]>} inspect
 * @property {(bytes: Uint8Array | Buffer, options?: object) => Promise<Uint8Array | Buffer>} strip
 */

class MetadataRegistry {
  constructor() {
    /** @type {Map<string, MetadataHandler>} */
    this._handlers = new Map();
  }

  /**
   * Registers a metadata handler.
   * @param {MetadataHandler} handler
   */
  register(handler) {
    if (!handler || typeof handler !== 'object') {
      throw new TypeError('Metadata handler must be an object.');
    }
    if (!handler.name || typeof handler.name !== 'string') {
      throw new TypeError('Metadata handler must declare a string name.');
    }
    if (typeof handler.inspect !== 'function' || typeof handler.strip !== 'function') {
      throw new TypeError(`Metadata handler "${handler.name}" must implement inspect() and strip().`);
    }
    this._handlers.set(handler.name.toLowerCase(), handler);
  }

  /**
   * Gets a handler by name.
   * @param {string} name
   * @returns {MetadataHandler | undefined}
   */
  getByName(name) {
    if (!name) return undefined;
    return this._handlers.get(String(name).toLowerCase());
  }

  /**
   * Returns all registered handlers.
   * @returns {MetadataHandler[]}
   */
  getAll() {
    return Array.from(this._handlers.values());
  }

  /**
   * Runs inspection across all active handlers.
   * @param {Uint8Array | Buffer} bytes
   * @param {object} [options]
   * @param {string[]} [options.strip] - Handler names to apply
   * @param {string[]} [options.keep] - Handler names to skip
   * @returns {Promise<MetadataField[]>}
   */
  async inspect(bytes, options = {}) {
    const active = this._resolveHandlers(options);
    const fields = [];
    for (const handler of active) {
      try {
        const found = await handler.inspect(bytes);
        if (Array.isArray(found)) fields.push(...found);
      } catch {
        // Continue inspection across handlers
      }
    }
    return fields;
  }

  /**
   * Strips metadata using registered handlers with Zero-Trust verification.
   * @param {Uint8Array | Buffer} bytes
   * @param {object} [options]
   * @returns {Promise<{ output: Buffer, removed: MetadataField[], kept: MetadataField[] }>}
   */
  async clean(bytes, options = {}) {
    const activeHandlers = this._resolveHandlers(options);
    const removed = [];
    const kept = [];

    // 1. Initial Inspection
    for (const handler of this.getAll()) {
      const isTarget = activeHandlers.some((h) => h.name.toLowerCase() === handler.name.toLowerCase());
      try {
        const found = await handler.inspect(bytes);
        if (Array.isArray(found) && found.length) {
          if (isTarget) {
            removed.push(...found);
          } else {
            kept.push(...found);
          }
        }
      } catch {
        // Proceed with available handlers
      }
    }

    if (removed.length === 0) {
      const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      return { output: buf, removed: [], kept };
    }

    // 2. Strip pass
    let current = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    for (const handler of activeHandlers) {
      try {
        const stripped = await handler.strip(current, options);
        current = Buffer.isBuffer(stripped) ? stripped : Buffer.from(stripped);
      } catch (err) {
        throw new ZapwebpError({
          code: 'E_CLEAN_FAILED',
          message: `Metadata handler "${handler.name}" failed: ${err.message}`,
        });
      }
    }

    // 3. Decodability Gate: verify image container did not get corrupted
    try {
      if (current.length >= 16) {
        // Check raster parseability
        await sharp(current, { failOn: 'none' }).metadata();
      }
    } catch {
      // If sharp cannot inspect (e.g., SVG or vector), verify valid string
      const str = current.toString('utf8');
      if (!str.includes('<svg')) {
        throw new ZapwebpError({
          code: 'E_CORRUPT_CONTAINER',
          message: 'Output image became unreadable following metadata stripping.',
        });
      }
    }

    // 4. Zero-Trust Verification Pass: Re-inspect to assert metadata is gone
    for (const handler of activeHandlers) {
      const remaining = await handler.inspect(current).catch(() => []);
      if (Array.isArray(remaining) && remaining.length > 0) {
        throw new ZapwebpError({
          code: 'E_CLEAN_FAILED',
          message: `Zero-Trust verification failed: Handler "${handler.name}" left ${remaining.length} metadata item(s) in container.`,
          fix: 'Review metadata handler strip implementation.',
        });
      }
    }

    return { output: current, removed, kept };
  }

  /**
   * Resolves active handlers based on --strip and --keep filters.
   * @private
   */
  _resolveHandlers(options = {}) {
    const all = this.getAll();
    const keep = Array.isArray(options.keep) ? options.keep.map((k) => k.toLowerCase()) : [];
    const strip = Array.isArray(options.strip) ? options.strip.map((s) => s.toLowerCase()) : [];

    if (strip.length > 0) {
      return all.filter((h) => strip.includes(h.name.toLowerCase()) && !keep.includes(h.name.toLowerCase()));
    }
    if (keep.length > 0) {
      return all.filter((h) => !keep.includes(h.name.toLowerCase()));
    }
    return all;
  }
}

const metadataRegistry = new MetadataRegistry();

module.exports = {
  MetadataRegistry,
  metadataRegistry,
  registerMetadataHandler: (handler) => metadataRegistry.register(handler),
  getMetadataHandlers: () => metadataRegistry.getAll(),
  getMetadataHandlerByName: (name) => metadataRegistry.getByName(name),
  cleanBytes: (bytes, options) => metadataRegistry.clean(bytes, options),
};
