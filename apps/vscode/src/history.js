'use strict';

/**
 * @typedef {Object} ZapPreference
 * @property {string} sourceFormat
 * @property {string} targetFormat
 * @property {number[]} [multipliers]
 * @property {number} lastUsed
 */

const STORAGE_KEY = 'zapwebp.preferences';
let memoryPreferences = [];

/**
 * Loads preferences from global state or in-memory cache.
 * @param {import('vscode').ExtensionContext} [context]
 * @returns {ZapPreference[]}
 */
function loadPreferences(context) {
  if (context && context.globalState && typeof context.globalState.get === 'function') {
    const stored = context.globalState.get(STORAGE_KEY, []);
    if (Array.isArray(stored)) {
      memoryPreferences = stored;
      return stored;
    }
  }
  return memoryPreferences;
}

/**
 * Persists a user's target format choice for a specific source format.
 * @param {import('vscode').ExtensionContext} [context]
 * @param {{ sourceFormat: string, targetFormat: string, multipliers?: number[] }} pref
 */
function rememberPreference(context, pref) {
  if (!pref || !pref.sourceFormat || !pref.targetFormat) return;

  const source = pref.sourceFormat.toLowerCase();
  const target = pref.targetFormat.toLowerCase();
  const multipliers = Array.isArray(pref.multipliers) ? pref.multipliers : undefined;

  let current = loadPreferences(context);

  // Remove previous entry matching source format to keep latest at index 0
  current = current.filter((p) => p.sourceFormat.toLowerCase() !== source);

  current.unshift({
    sourceFormat: source,
    targetFormat: target,
    multipliers,
    lastUsed: Date.now(),
  });

  // Cap at 20 preferences
  current = current.slice(0, 20);
  memoryPreferences = current;

  if (context && context.globalState && typeof context.globalState.update === 'function') {
    context.globalState.update(STORAGE_KEY, current).catch(() => {});
  }
}

/**
 * Retrieves the last-used target format for a given source format.
 * @param {import('vscode').ExtensionContext} [context]
 * @param {string} sourceFormat
 * @returns {string|null}
 */
function getPreferredTarget(context, sourceFormat) {
  if (!sourceFormat) return null;
  const source = sourceFormat.toLowerCase();
  const current = loadPreferences(context);
  const found = current.find((p) => p.sourceFormat.toLowerCase() === source);
  return found ? found.targetFormat : null;
}

/**
 * Retrieves the full last-used preference for a given source format.
 * @param {import('vscode').ExtensionContext} [context]
 * @param {string} sourceFormat
 * @returns {ZapPreference|null}
 */
function getPreferredPreference(context, sourceFormat) {
  if (!sourceFormat) return null;
  const source = sourceFormat.toLowerCase();
  const current = loadPreferences(context);
  const found = current.find((p) => p.sourceFormat.toLowerCase() === source);
  return found || null;
}

/**
 * Clears preferences (useful for testing or settings reset).
 * @param {import('vscode').ExtensionContext} [context]
 */
function clearPreferences(context) {
  memoryPreferences = [];
  if (context && context.globalState && typeof context.globalState.update === 'function') {
    context.globalState.update(STORAGE_KEY, []).catch(() => {});
  }
}

module.exports = {
  rememberPreference,
  getPreferredTarget,
  getPreferredPreference,
  loadPreferences,
  clearPreferences,
};
