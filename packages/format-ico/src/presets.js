'use strict';

/**
 * Standard ICO configuration presets.
 * Presets are declarative configuration objects representing common deployment targets.
 */
const PRESETS = Object.freeze({
  default: Object.freeze({
    sizes: Object.freeze([16, 32, 48, 64, 128, 256]),
    format: (size) => (size <= 32 ? 'bmp' : 'png'),
  }),

  favicon: Object.freeze({
    sizes: Object.freeze([16, 32, 48]),
    format: (size) => (size <= 32 ? 'bmp' : 'png'),
  }),

  windows: Object.freeze({
    sizes: Object.freeze([16, 32, 48, 256]),
    format: 'bmp',
  }),

  'high-res': Object.freeze({
    sizes: Object.freeze([64, 128, 256, 512]),
    format: 'png',
  }),

  legacy: Object.freeze({
    sizes: Object.freeze([16, 32]),
    format: 'bmp',
  }),

  'app-icon': Object.freeze({
    sizes: Object.freeze([32, 64, 128, 256, 512]),
    format: 'png',
  }),

  cursor: Object.freeze({
    type: 'cur',
    sizes: Object.freeze([32, 64]),
    format: 'png',
  }),
});

module.exports = {
  PRESETS,
};
