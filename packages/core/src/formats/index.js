'use strict';

const {
  FormatRegistry,
  registry,
  registerFormat,
  getHandlerByName,
  getHandlerByMime,
  getHandlerByExtension,
  detectFormatHandler,
  getAllHandlers,
} = require('./registry');

const { svgHandler } = require('./svg');
const { pngHandler } = require('./png');
const { jpegHandler } = require('./jpeg');
const { webpHandler } = require('./webp');
const { avifHandler } = require('./avif');
const { gifHandler } = require('./gif');
const { tiffHandler } = require('./tiff');

// Register all core built-in format handlers
registry.register(svgHandler);
registry.register(pngHandler);
registry.register(jpegHandler);
registry.register(webpHandler);
registry.register(avifHandler);
registry.register(gifHandler);
registry.register(tiffHandler);

module.exports = {
  FormatRegistry,
  registry,
  registerFormat,
  getHandlerByName,
  getHandlerByMime,
  getHandlerByExtension,
  detectFormatHandler,
  getAllHandlers,
  svgHandler,
  pngHandler,
  jpegHandler,
  webpHandler,
  avifHandler,
  gifHandler,
  tiffHandler,
};
