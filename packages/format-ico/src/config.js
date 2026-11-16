'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ZapwebpError } = require('@zapwebp/shared');
const { PRESETS } = require('./presets');

/**
 * @typedef {Object} IcoConfig
 * @property {number[]} sizes - Resolutions to generate in pixels
 * @property {'png' | 'bmp' | ((size: number) => 'png' | 'bmp')} format - Encoding format per size
 * @property {number} compressionLevel - PNG compression level (0-9)
 * @property {'rgba' | 'rgb' | 'palette'} colorType - Color model for encoding
 * @property {number} paletteSize - Palette color count when colorType is palette
 * @property {'contain' | 'cover' | 'fill'} fit - Resampling fit strategy
 * @property {string} background - Background color string or transparent
 * @property {boolean} clean - Strip metadata from embedded images
 * @property {'ico' | 'cur'} type - Container header type
 * @property {number} maxEntries - Maximum directory entries permitted
 * @property {number} maxImageBytes - Maximum decoded image bytes per entry
 * @property {number} maxTotalBytes - Maximum total decoded bytes across all entries
 */

/** @type {IcoConfig} */
const DEFAULT_CONFIG = Object.freeze({
  sizes: Object.freeze([16, 32, 48, 64, 128, 256]),
  format: (size) => (size <= 32 ? 'bmp' : 'png'),
  compressionLevel: 9,
  colorType: 'rgba',
  paletteSize: 256,
  fit: 'contain',
  background: 'transparent',
  clean: true,
  type: 'ico',
  maxEntries: 20,
  maxImageBytes: 100 * 1024 * 1024,
  maxTotalBytes: 500 * 1024 * 1024,
});

/**
 * Validates an ICO configuration object against schema and bounds.
 *
 * @param {IcoConfig} config
 * @throws {ZapwebpError}
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new ZapwebpError({
      code: 'E_INVALID_CONFIG',
      message: 'ICO configuration must be a valid object.',
      fix: 'Pass a valid IcoConfig object.',
    });
  }

  if (!Array.isArray(config.sizes) || config.sizes.length === 0) {
    throw new ZapwebpError({
      code: 'E_ICO_NO_SIZES',
      message: 'E_ICO_NO_SIZES: At least one icon size is required in configuration.',
      fix: 'Specify sizes: [16, 32, 48, 64, 128, 256].',
    });
  }

  const maxEntries = Number.isFinite(config.maxEntries) ? config.maxEntries : 20;
  if (config.sizes.length > maxEntries) {
    throw new ZapwebpError({
      code: 'E_ICO_TOO_MANY_ENTRIES',
      message: `E_ICO_TOO_MANY_ENTRIES: Max ${maxEntries} entries allowed, received ${config.sizes.length}.`,
      fix: `Reduce the sizes array to at most ${maxEntries} resolutions.`,
    });
  }

  for (const s of config.sizes) {
    if (typeof s !== 'number' || !Number.isInteger(s) || s < 1 || s > 512) {
      throw new ZapwebpError({
        code: 'E_ICO_INVALID_SIZE',
        message: `E_ICO_INVALID_SIZE: Size "${s}" is invalid. Sizes must be integers between 1 and 512 pixels.`,
        fix: 'Ensure all requested sizes are between 1 and 512.',
      });
    }
  }

  if (config.compressionLevel !== undefined) {
    if (
      typeof config.compressionLevel !== 'number' ||
      !Number.isInteger(config.compressionLevel) ||
      config.compressionLevel < 0 ||
      config.compressionLevel > 9
    ) {
      throw new ZapwebpError({
        code: 'E_INVALID_CONFIG',
        message: `compressionLevel must be an integer between 0 and 9, received ${config.compressionLevel}.`,
        fix: 'Specify a compressionLevel between 0 (none) and 9 (maximum).',
      });
    }
  }

  if (config.type && config.type !== 'ico' && config.type !== 'cur') {
    throw new ZapwebpError({
      code: 'E_INVALID_CONFIG',
      message: `Invalid ICO type "${config.type}". Expected "ico" or "cur".`,
      fix: 'Set type to "ico" or "cur".',
    });
  }
}

/**
 * Loads ICO configuration overrides from environment variables.
 *
 * @returns {Partial<IcoConfig>}
 */
function loadFromEnv() {
  const env = process.env;
  /** @type {Partial<IcoConfig>} */
  const overrides = {};

  if (env.ZAPWEBP_ICO_SIZES) {
    overrides.sizes = env.ZAPWEBP_ICO_SIZES
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  }

  if (env.ZAPWEBP_ICO_FORMAT) {
    const fmt = env.ZAPWEBP_ICO_FORMAT.trim().toLowerCase();
    if (fmt === 'png' || fmt === 'bmp') {
      overrides.format = fmt;
    }
  }

  if (env.ZAPWEBP_ICO_COMPRESSION) {
    const comp = Number.parseInt(env.ZAPWEBP_ICO_COMPRESSION.trim(), 10);
    if (Number.isFinite(comp)) {
      overrides.compressionLevel = Math.max(0, Math.min(comp, 9));
    }
  }

  if (env.ZAPWEBP_ICO_MAX_ENTRIES) {
    const maxE = Number.parseInt(env.ZAPWEBP_ICO_MAX_ENTRIES.trim(), 10);
    if (Number.isFinite(maxE) && maxE > 0) {
      overrides.maxEntries = maxE;
    }
  }

  return overrides;
}

/**
 * Loads project-level ICO configuration from zapwebp.config.json.
 *
 * @param {string} [searchDir]
 * @returns {Partial<IcoConfig>}
 */
function loadFromConfigFile(searchDir = process.cwd()) {
  try {
    const configPath = path.resolve(searchDir, 'zapwebp.config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.ico === 'object' && parsed.ico !== null) {
        return parsed.ico;
      }
    }
  } catch {}
  return {};
}

/**
 * Resolves and merges a full IcoConfig object from defaults, config file, environment, presets, and overrides.
 *
 * @param {Partial<IcoConfig> & { preset?: string, customSizes?: number[] }} [overrides]
 * @param {string} [cwd]
 * @returns {IcoConfig}
 */
function resolveIcoConfig(overrides = {}, cwd = process.cwd()) {
  const fileConfig = loadFromConfigFile(cwd);
  const envConfig = loadFromEnv();

  let presetConfig = {};
  const requestedPreset = overrides.preset || fileConfig.preset;
  if (requestedPreset && PRESETS[requestedPreset]) {
    presetConfig = PRESETS[requestedPreset];
  }

  const cleanOverrides = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined && v !== null) cleanOverrides[k] = v;
  }

  const rawMerged = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    ...presetConfig,
    ...cleanOverrides,
  };

  let targetSizes = rawMerged.sizes;
  if (!targetSizes) {
    targetSizes = [...DEFAULT_CONFIG.sizes];
  }

  // Handle customSizes if supplied
  if (Array.isArray(cleanOverrides.customSizes) && cleanOverrides.customSizes.length > 0) {
    targetSizes = [...targetSizes, ...cleanOverrides.customSizes];
  }

  // Ensure sizes is a sorted array of unique integers
  if (typeof targetSizes === 'string') {
    targetSizes = targetSizes
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  }

  rawMerged.sizes = Array.from(new Set(targetSizes.map(Number)))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);

  validateConfig(rawMerged);
  return rawMerged;
}

module.exports = {
  DEFAULT_CONFIG,
  validateConfig,
  loadFromEnv,
  loadFromConfigFile,
  resolveIcoConfig,
};
