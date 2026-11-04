'use strict';

const { DEFAULT_OPTIONS, DEFAULT_CONVERSION_POLICY } = require('./defaults');
const {
  APP_ORIGIN,
  DEFAULT_PORT,
  DEFAULT_TIMEOUT_MS,
  MAX_DIMENSION,
  MAX_PIXELS,
  MAX_SVG_DEPTH,
  MAX_DATA_URI_BYTES,
  DEFAULT_CACHE_CONTROL,
  ZAPWEBP_USER_AGENT,
} = require('./constants');
const { ERROR_CATALOG, ZapwebpError } = require('./errors');
const i18n = require('./i18n');

const INPUT_FORMATS = Object.freeze(['svg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'tiff']);
const OUTPUT_FORMATS = Object.freeze(['webp', 'png', 'jpeg', 'avif']);
const ALPHA_FORMATS = Object.freeze(['svg', 'png', 'webp', 'avif', 'gif', 'tiff']);

const MIME_MAP = Object.freeze({
  svg: 'image/svg+xml',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
});

const EXT_MAP = Object.freeze({
  svg: ['.svg'],
  png: ['.png'],
  jpeg: ['.jpg', '.jpeg'],
  webp: ['.webp'],
  avif: ['.avif'],
  gif: ['.gif'],
  tiff: ['.tif', '.tiff'],
});

/**
 * Returns list of all supported from-to conversion direction pairs.
 * Used for dynamic routing, SEO landing pages, and sitemaps.
 */
function getSupportedPairs() {
  const pairs = [];
  for (const from of INPUT_FORMATS) {
    for (const to of OUTPUT_FORMATS) {
      if (from !== to) {
        pairs.push({ from, to, slug: `${from}-to-${to}` });
      }
    }
  }
  return Object.freeze(pairs);
}

const supportedPairs = getSupportedPairs();

/**
 * Checks whether an image format inherently supports alpha transparency.
 * @param {string} format
 * @returns {boolean}
 */
function supportsAlpha(format) {
  return ALPHA_FORMATS.includes(String(format).toLowerCase());
}

/**
 * Resolves standard MIME type for format name.
 * @param {string} format
 * @returns {string}
 */
function getMimeType(format) {
  const normalized = format === 'jpg' ? 'jpeg' : String(format).toLowerCase();
  return MIME_MAP[normalized] || 'application/octet-stream';
}

/**
 * Constructs canonical URL for a tool or documentation page.
 * @param {string} routePath
 * @returns {string}
 */
function getCanonicalUrl(routePath = '') {
  const cleaned = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return `${APP_ORIGIN}${cleaned}`;
}

module.exports = {
  APP_ORIGIN,
  DEFAULT_PORT,
  DEFAULT_TIMEOUT_MS,
  MAX_DIMENSION,
  MAX_PIXELS,
  MAX_SVG_DEPTH,
  MAX_DATA_URI_BYTES,
  DEFAULT_CACHE_CONTROL,
  ZAPWEBP_USER_AGENT,
  DEFAULT_OPTIONS,
  DEFAULT_CONVERSION_POLICY,
  ERROR_CATALOG,
  ZapwebpError,
  i18n,
  t: i18n.t,
  setLocale: i18n.setLocale,
  getLocale: i18n.getLocale,
  registerTranslations: i18n.registerTranslations,
  SUPPORTED_LOCALES: i18n.SUPPORTED_LOCALES,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  ALPHA_FORMATS,
  MIME_MAP,
  EXT_MAP,
  supportedPairs,
  getSupportedPairs,
  supportsAlpha,
  getMimeType,
  getCanonicalUrl,
};
