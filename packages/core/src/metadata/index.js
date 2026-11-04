'use strict';

const {
  MetadataRegistry,
  metadataRegistry,
  registerMetadataHandler,
  getMetadataHandlers,
  getMetadataHandlerByName,
  cleanBytes,
} = require('./registry');

const { exifHandler } = require('./exif');
const { xmpHandler } = require('./xmp');
const { c2paHandler } = require('./c2pa');
const { pngTextHandler } = require('./png-text');
const { iccHandler } = require('./icc');

// Register all core default metadata handlers
metadataRegistry.register(exifHandler);
metadataRegistry.register(xmpHandler);
metadataRegistry.register(c2paHandler);
metadataRegistry.register(pngTextHandler);
metadataRegistry.register(iccHandler);

module.exports = {
  MetadataRegistry,
  metadataRegistry,
  registerMetadataHandler,
  getMetadataHandlers,
  getMetadataHandlerByName,
  cleanBytes,
  exifHandler,
  xmpHandler,
  c2paHandler,
  pngTextHandler,
  iccHandler,
};
