'use strict';

const formats = require('../formats');

/**
 * Registers a new format handler in the core format registry.
 * @param {import('../types').FormatHandler} handler
 */
function registerFormat(handler) {
  formats.registry.register(handler);
}

/**
 * Returns all canonical format names currently registered.
 * @returns {string[]}
 */
function getFormats() {
  return formats.getAllHandlers().map((h) => h.name);
}

module.exports = {
  registry: formats.registry,
  registerFormat,
  getFormats,
  getHandlerByName: formats.getHandlerByName,
  getHandlerByMime: formats.getHandlerByMime,
  detectFormatHandler: formats.detectFormatHandler,
  getAllHandlers: formats.getAllHandlers,
};

