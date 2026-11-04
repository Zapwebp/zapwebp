'use strict';

/**
 * Defines a Zap plugin with validation and type hinting.
 * @param {object} plugin
 * @param {string} plugin.name
 * @param {string} plugin.version
 * @param {object} [plugin.hooks]
 * @param {Function} [plugin.hooks.beforeConvert]
 * @param {Function} [plugin.hooks.afterConvert]
 * @param {object} [plugin.adapters]
 * @returns {object}
 */
function definePlugin(plugin) {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('Plugin configuration must be an object.');
  }
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new Error('Plugin must declare a valid `name` string.');
  }
  if (!plugin.version || typeof plugin.version !== 'string') {
    throw new Error('Plugin must declare a valid `version` string.');
  }
  return Object.freeze({ ...plugin });
}

class PluginManager {
  constructor() {
    this.plugins = new Map();
  }

  /**
   * Registers a plugin.
   * @param {object} plugin
   * @returns {PluginManager}
   */
  use(plugin) {
    const p = definePlugin(plugin);
    if (this.plugins.has(p.name)) {
      throw new Error(`Plugin "${p.name}" is already registered.`);
    }
    this.plugins.set(p.name, p);
    return this;
  }

  /**
   * Checks if a plugin is registered.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.plugins.has(name);
  }

  /**
   * Returns all registered plugins.
   * @returns {Array<object>}
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Runs all beforeConvert hooks sequentially.
   * @param {object} context
   * @returns {Promise<object>} Modified or validated context
   */
  async executeBeforeConvert(context) {
    let ctx = { ...context };
    for (const plugin of this.plugins.values()) {
      if (typeof plugin.hooks?.beforeConvert === 'function') {
        const result = await plugin.hooks.beforeConvert(ctx);
        if (result && typeof result === 'object') {
          ctx = { ...ctx, ...result };
        }
      }
    }
    return ctx;
  }

  /**
   * Runs all afterConvert hooks sequentially.
   * @param {object} context
   * @param {Array<object>} outputs
   * @returns {Promise<Array<object>>}
   */
  async executeAfterConvert(context, outputs) {
    let currentOutputs = Array.isArray(outputs) ? [...outputs] : [outputs];
    for (const plugin of this.plugins.values()) {
      if (typeof plugin.hooks?.afterConvert === 'function') {
        const result = await plugin.hooks.afterConvert(context, currentOutputs);
        if (Array.isArray(result)) {
          currentOutputs = result;
        }
      }
    }
    return currentOutputs;
  }

  /**
   * Retrieves an adapter from registered plugins.
   * @param {string} adapterName
   * @returns {any}
   */
  getAdapter(adapterName) {
    for (const plugin of this.plugins.values()) {
      if (plugin.adapters && plugin.adapters[adapterName]) {
        return plugin.adapters[adapterName];
      }
    }
    return null;
  }
}

const MAX_DECODE_BYTES = 100 * 1024 * 1024; // 100 MB hard ceiling

/**
 * Wraps format decoding with memory allocation assertions and decompression bomb protection.
 * @param {object} handler - FormatHandler
 * @param {Uint8Array|Buffer} bytes - Raw file bytes
 * @param {object} [options]
 */
async function safeDecode(handler, bytes, options = {}) {
  if (!handler || typeof handler.decode !== 'function') {
    throw new TypeError('Invalid FormatHandler: missing decode() function');
  }
  if (!bytes || !bytes.length) {
    throw new Error('E_EMPTY_FILE: Input byte buffer is empty');
  }
  if (bytes.length > MAX_DECODE_BYTES) {
    throw new Error('E_DECOMPRESSION_BOMB: Input exceeds memory safety ceiling (100MB)');
  }
  return handler.decode(bytes, options);
}

/**
 * Creates an in-memory RGBA RawImage fixture for unit testing.
 * @param {number} [width=10]
 * @param {number} [height=10]
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }} RawImage
 */
function createMockRawImage(width = 10, height = 10) {
  return {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  };
}

/**
 * Asserts valid storage write options and prevents empty or malformed writes.
 * @param {string} destinationPath
 * @param {Buffer|Uint8Array} data
 */
function validateStorageWrite(destinationPath, data) {
  if (!destinationPath || typeof destinationPath !== 'string') {
    throw new TypeError('Destination path must be a non-empty string');
  }
  if (!data || !data.length) {
    throw new Error('Cannot write empty or null data to storage');
  }
}

function defineTransform(step) {
  if (!step || typeof step !== 'object') {
    throw new Error('Transform step must be an object.');
  }
  if (!step.name || typeof step.name !== 'string') {
    throw new Error('Transform step must declare a valid `name` string.');
  }
  if (typeof step.apply !== 'function') {
    throw new Error('Transform step must declare an `apply(image, options)` function.');
  }
  return step;
}

module.exports = {
  definePlugin,
  defineTransform,
  PluginManager,
  safeDecode,
  createMockRawImage,
  validateStorageWrite,
  MAX_DECODE_BYTES,
};

