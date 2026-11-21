'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LOCALES = ['en', 'tl'];
const supportedLocalesSet = new Set(DEFAULT_LOCALES);
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
 * Automatically discovers and loads translation catalogs from the /locales directory.
 */
function loadFilesystemCatalogs() {
  try {
    const candidates = [
      path.resolve(__dirname, '../../../locales'),
      path.resolve(__dirname, '../../locales'),
      path.resolve(process.cwd(), 'locales'),
    ];

    let localesDir = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        localesDir = c;
        break;
      }
    }

    if (!localesDir) return;

    const entries = fs.readdirSync(localesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const locale = entry.name.toLowerCase();
        supportedLocalesSet.add(locale);
        const subDir = path.join(localesDir, entry.name);
        const jsonFiles = fs.readdirSync(subDir).filter((f) => f.endsWith('.json'));

        for (const jf of jsonFiles) {
          try {
            const raw = fs.readFileSync(path.join(subDir, jf), 'utf8');
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
              registerTranslations(locale, data);
            }
          } catch {}
        }
      }
    }
  } catch {}
}

loadFilesystemCatalogs();

/**
 * Proxy array providing dynamic supported locales list.
 */
const SUPPORTED_LOCALES = new Proxy(DEFAULT_LOCALES, {
  get(target, prop) {
    const list = Array.from(supportedLocalesSet);
    if (prop === 'includes') {
      return (val) => supportedLocalesSet.has(String(val).toLowerCase());
    }
    if (prop === 'length') {
      return list.length;
    }
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return list[Number(prop)];
    }
    return Reflect.get(list, prop);
  },
});

/**
 * Returns array of all active supported locale codes.
 * @returns {string[]}
 */
function getSupportedLocales() {
  return Array.from(supportedLocalesSet);
}

/**
 * Sets the active locale.
 * @param {string} locale - e.g. 'en', 'tl', or any registered community locale
 */
function setLocale(locale) {
  if (!locale) return;
  const normalized = String(locale).toLowerCase().split(/[-_]/)[0];
  if (supportedLocalesSet.has(normalized)) {
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
 * Loads translations into cache for a given locale and dynamically enables the locale.
 * @param {string} locale
 * @param {Record<string, string>} strings
 */
function registerTranslations(locale, strings) {
  if (!locale || !strings || typeof strings !== 'object') return;
  const normalized = String(locale).toLowerCase().split(/[-_]/)[0];
  supportedLocalesSet.add(normalized);
  const current = localeCache.get(normalized) || {};
  localeCache.set(normalized, { ...current, ...strings });
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
  getSupportedLocales,
  setLocale,
  getLocale,
  registerTranslations,
  t,
};
