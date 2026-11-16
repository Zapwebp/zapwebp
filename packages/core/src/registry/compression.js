'use strict';

/**
 * @typedef {Object} CompressionHandler
 * @property {string} name - Canonical compressor identifier
 * @property {(image: any, options: any) => Promise<any>} compress - Compression executor
 */

class CompressionRegistry {
  constructor() {
    /** @type {Map<string, CompressionHandler>} */
    this._compressors = new Map();
  }

  /**
   * Registers a compressor handler.
   * @param {CompressionHandler} compressor
   */
  register(compressor) {
    if (!compressor || typeof compressor !== 'object') {
      throw new TypeError('Compressor must be an object.');
    }
    if (!compressor.name || typeof compressor.name !== 'string') {
      throw new TypeError('Compressor must declare a string name.');
    }
    if (typeof compressor.compress !== 'function') {
      throw new TypeError(`Compressor "${compressor.name}" must implement a compress() function.`);
    }
    this._compressors.set(compressor.name.toLowerCase(), compressor);
  }

  /**
   * Retrieves a registered compressor by name.
   * @param {string} [name='compressor']
   * @returns {CompressionHandler | undefined}
   */
  getByName(name = 'compressor') {
    if (!name) return undefined;
    return this._compressors.get(String(name).toLowerCase());
  }

  /**
   * Returns all registered compressors.
   * @returns {CompressionHandler[]}
   */
  getAll() {
    return Array.from(this._compressors.values());
  }
}

const compressionRegistry = new CompressionRegistry();

/**
 * Registers a compression handler in the core registry.
 * @param {CompressionHandler} handler
 */
function registerCompressor(handler) {
  compressionRegistry.register(handler);
}

/**
 * Gets a registered compressor by name.
 * @param {string} [name='compressor']
 * @returns {CompressionHandler | undefined}
 */
function getCompressor(name = 'compressor') {
  return compressionRegistry.getByName(name);
}

/**
 * Gets all registered compressors.
 * @returns {CompressionHandler[]}
 */
function getCompressors() {
  return compressionRegistry.getAll();
}

module.exports = {
  CompressionRegistry,
  compressionRegistry,
  registerCompressor,
  getCompressor,
  getCompressors,
};
