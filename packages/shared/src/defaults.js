'use strict';

/**
 * Standard Default Options for Zapwebp Conversions
 * Single source of truth for configuration defaults across all packages.
 */
const DEFAULT_OPTIONS = Object.freeze({
  scale: Object.freeze([1]),
  baseWidth: 512,
  quality: 85,
  effort: 4,
  lossless: false,
  clean: true,
  stripMetadata: true,
  outDir: 'public/icons',
  maxBytes: 5 * 1024 * 1024,
  onConflict: 'skip',
  emitManifest: true,
  fit: 'contain',
  to: 'webp',
  lockTarget: undefined,
  strict: true,
  keepOriginal: true,
  deleteOnDownload: false,
  cleanupDelay: 'immediate',
  sameFormat: 'passthrough',
  sizeMode: 'compress',
  minInputBytes: undefined,
  minOutputBytes: undefined,
});

/**
 * Standard Default Conversion Policy for Zapwebp
 * Enforced uniformly across CLI, Storage Adapters, REST API, MCP, and Build Plugins.
 */
const DEFAULT_CONVERSION_POLICY = Object.freeze({
  quality: Object.freeze({
    mode: 'lossy',
    default: 85,
    perFormat: Object.freeze({}),
  }),
  limits: Object.freeze({
    minInputBytes: undefined,
    maxInputBytes: 5 * 1024 * 1024,
    minOutputBytes: undefined,
    maxOutputBytes: undefined,
    targetOutputBytes: undefined,
  }),
  formats: Object.freeze({
    accept: Object.freeze([]),
    reject: Object.freeze([]),
    sameFormat: 'passthrough',
  }),
  size: Object.freeze({
    mode: 'compress',
  }),
  advanced: Object.freeze({
    effort: 4,
    stripMetadata: true,
    preserveColorProfile: false,
  }),
});

module.exports = {
  DEFAULT_OPTIONS,
  DEFAULT_CONVERSION_POLICY,
};

