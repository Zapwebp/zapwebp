'use strict';

const metadata = require('../metadata');

/**
 * Registers a new metadata handler in the core metadata registry.
 * @param {import('../types').MetadataHandler} handler
 */
function registerMetadataHandler(handler) {
  metadata.metadataRegistry.register(handler);
}

/**
 * Returns all registered metadata handlers.
 * @returns {import('../types').MetadataHandler[]}
 */
function getMetadataHandlers() {
  return metadata.metadataRegistry.getAll();
}

module.exports = {
  metadataRegistry: metadata.metadataRegistry,
  registerMetadataHandler,
  getMetadataHandlers,
  cleanBytes: metadata.cleanBytes,
  detectMetadata: metadata.detectMetadata,
};
