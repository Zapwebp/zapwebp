'use strict';

const { createError } = require('../errors');
const { checkDimensions } = require('../index');

/**
 * Executes an ordered chain of TransformStep plugins across a RawImage.
 *
 * @param {import('../types').RawImage} image - Input raw RGBA image
 * @param {import('../types').TransformStep[]} transforms - Array of transform steps
 * @param {object} [options]
 * @returns {Promise<import('../types').RawImage>}
 */
async function applyTransforms(image, transforms = [], options = {}) {
  let current = image;

  for (const step of transforms) {
    if (!step || typeof step.apply !== 'function') {
      continue;
    }

    const transformed = await step.apply(current, options);
    if (!transformed || !transformed.data || !transformed.width || !transformed.height) {
      throw createError('E_TRANSFORM_FAILED', `Transform "${step.name || 'unknown'}" returned an invalid RawImage.`);
    }

    checkDimensions(transformed.width, transformed.height);
    current = transformed;
  }

  return current;
}

module.exports = {
  applyTransforms,
};

