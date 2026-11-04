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
    maxInputBytes: 5 * 1024 * 1024,
    maxOutputBytes: undefined,
    targetOutputBytes: undefined,
  }),
  formats: Object.freeze({
    accept: Object.freeze([]),
    reject: Object.freeze([]),
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

