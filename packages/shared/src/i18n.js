'use strict';

const SUPPORTED_LOCALES = Object.freeze(['en', 'tl']);
let activeLocale = 'en';

/** @type {Map<string, Record<string, string>>} */
const localeCache = new Map();

// Built-in basic strings for immediate fallback
localeCache.set('en', {
  'dropzone.placeholder': 'Drop, paste, or browse',
  'dropzone.hint': 'Images, URLs, or SVG code',
  'button.convert': 'Convert',
  'button.cancel': 'Cancel',
  'button.batch': 'Batch',
  'button.download': 'Download',
  'button.crop': 'Crop',
  'settings.quality': 'Quality',
  'settings.clean': 'Clean Mode',
  'crop.title': 'Crop Image',
  'toast.success': '{{count}} file(s) converted',
  'toast.error': 'Error: {{message}}',
  'cli.help': 'Convert and optimize common image formats from your terminal.',
});

localeCache.set('tl', {
  'dropzone.placeholder': 'I-drop, i-paste, o i-browse',
  'dropzone.hint': 'Mga larawan, URL, o SVG code',
  'button.convert': 'I-convert',
  'button.cancel': 'Kanselahin',
  'button.batch': 'Maramihan',
  'button.download': 'I-download',
  'button.crop': 'I-crop',
  'settings.quality': 'Kalidad',
  'settings.clean': 'Malinis na Mode',
  'crop.title': 'I-crop ang Imahe',
  'toast.success': '{{count}} (na) file ang na-convert',
  'toast.error': 'May error: {{message}}',
  'cli.help': 'I-convert at i-optimize ang mga format ng imahe mula sa iyong terminal.',
});

/**
 * Sets the active locale.
 * @param {string} locale - e.g. 'en', 'tl'
 */
function setLocale(locale) {
  if (!locale) return;
  const normalized = String(locale).toLowerCase().split(/[-_]/)[0];
  if (SUPPORTED_LOCALES.includes(normalized)) {
    activeLocale = normalized;
  }
}

/**
 * Gets the current active locale.
 * @returns {string}
 */
function getLocale() {
  return activeLocale;
}

/**
 * Loads translations into cache for a given locale.
 * @param {string} locale
 * @param {Record<string, string>} strings
 */
function registerTranslations(locale, strings) {
  if (!locale || !strings || typeof strings !== 'object') return;
  const current = localeCache.get(locale) || {};
  localeCache.set(locale, { ...current, ...strings });
}

/**
 * Translates a key with variable interpolation and fallback to English.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
function t(key, vars = {}) {
  const current = localeCache.get(activeLocale) || {};
  const english = localeCache.get('en') || {};
  let text = current[key] ?? english[key] ?? key;

  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }

  return text;
}

module.exports = {
  SUPPORTED_LOCALES,
  setLocale,
  getLocale,
  registerTranslations,
  t,
};
