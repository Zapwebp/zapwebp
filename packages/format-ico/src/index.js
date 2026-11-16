'use strict';

const { definePlugin } = require('@zapwebp/plugin-sdk');
const { DEFAULT_CONFIG, validateConfig, loadFromEnv, loadFromConfigFile, resolveIcoConfig } = require('./config');
const { PRESETS } = require('./presets');
const { encodeBmpDib } = require('./bmp');
const { IcoFormatHandler, icoHandler } = require('./handler');
const { parseIco, decodeIco, decodeBmpDib, MAX_ICO_ENTRIES, PNG_MAGIC } = require('./parse');
const { writeIco, encodeIco, buildIcoContainer, normalizeSizes, DEFAULT_ICO_SIZES } = require('./write');
const { generateFaviconSuite } = require('./favicon');

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
  // Handler & Plugin
  IcoFormatHandler,
  icoHandler,
  plugin,

  // Configuration & Presets
  DEFAULT_CONFIG,
  PRESETS,
  validateConfig,
  loadFromEnv,
  loadFromConfigFile,
  resolveIcoConfig,

  // Parsing & Decoding
  parseIco,
  decodeIco,
  decodeBmpDib,

  // Writing & Encoding
  writeIco,
  encodeIco,
  encodeBmpDib,
  buildIcoContainer,

  // Favicon Workflow
  generateFaviconSuite,

  // Constants & Utilities
  normalizeSizes,
  DEFAULT_ICO_SIZES,
  MAX_ICO_ENTRIES,
  PNG_MAGIC,
};
