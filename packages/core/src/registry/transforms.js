'use strict';

/**
 * @typedef {Object} TransformStep
 * @property {string} name - Canonical transform step identifier
 * @property {(image: import('../types').RawImage, options?: any) => Promise<import('../types').RawImage>} apply - Transformation executor
 */

class TransformRegistry {
  constructor() {
    /** @type {Map<string, TransformStep>} */
    this._transforms = new Map();
  }

  /**
   * Registers a transform step.
   * @param {TransformStep} transform
   */
  register(transform) {
    if (!transform || typeof transform !== 'object') {
      throw new TypeError('Transform step must be an object.');
    }
    if (!transform.name || typeof transform.name !== 'string') {
      throw new TypeError('Transform step must declare a string name.');
    }
    if (typeof transform.apply !== 'function') {
      throw new TypeError(`Transform step "${transform.name}" must implement an apply() function.`);
    }
    this._transforms.set(transform.name.toLowerCase(), transform);
  }

  /**
   * Retrieves a registered transform by name.
   * @param {string} name
   * @returns {TransformStep | undefined}
   */
  getByName(name) {
    if (!name) return undefined;
    return this._transforms.get(String(name).toLowerCase());
  }

  /**
   * Returns all registered transforms.
   * @returns {TransformStep[]}
   */
  getAll() {
    return Array.from(this._transforms.values());
  }
}

const transformRegistry = new TransformRegistry();

/**
 * Registers a new transform step in the core registry.
 * @param {TransformStep} transform
 */
function registerTransform(transform) {
  transformRegistry.register(transform);
}

/**
 * Gets all registered transforms.
 * @returns {TransformStep[]}
 */
function getTransforms() {
  return transformRegistry.getAll();
}

module.exports = {
  TransformRegistry,
  transformRegistry,
  registerTransform,
  getTransforms,
  getTransformByName: (name) => transformRegistry.getByName(name),
};

