'use strict';

/**
 * Browser Web Worker Plugin Sandbox
 * Executes community plugins within an isolated Web Worker context with zero access
 * to document, window, cookies, or localStorage.
 */

/**
 * Generates an isolated Web Worker script URL for plugin execution.
 * @param {string} pluginSourceCode - JavaScript source code of the plugin
 * @returns {string} Blob URL
 */
function createWorkerScriptUrl(pluginSourceCode) {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Browser Web Worker sandbox requires Blob and URL support in the environment.');
  }

  const workerCode = `
'use strict';

// Self-contained sandboxed worker scope
// Explicitly block access to cookies, localStorage, or DOM if somehow inherited
delete self.localStorage;
delete self.sessionStorage;
delete self.document;

let pluginInstance = null;

try {
  const exports = {};
  const module = { exports };
  ${pluginSourceCode}
  pluginInstance = module.exports.default || module.exports;
} catch (err) {
  self.postMessage({ id: null, error: 'E_PLUGIN_SANDBOX_VIOLATION: Plugin failed to initialize in sandbox: ' + err.message });
}

self.onmessage = async function(e) {
  const { id, method, args } = e.data || {};
  if (!pluginInstance) {
    self.postMessage({ id, error: 'E_PLUGIN_SANDBOX_VIOLATION: Plugin not initialized.' });
    return;
  }

  try {
    const fn = (method && typeof pluginInstance[method] === 'function') ? pluginInstance[method] : pluginInstance;
    const result = await fn(...(args || []));
    self.postMessage({ id, success: true, result });
  } catch (err) {
    self.postMessage({ id, error: err.message || 'Plugin execution failed in worker.' });
  }
};
`;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

module.exports = {
  createWorkerScriptUrl,
};
