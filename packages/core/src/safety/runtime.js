'use strict';

const { ZapwebpError } = require('@zapwebp/shared');

const PROHIBITED_NETWORK_MODULES = Object.freeze([
  'node:net',
  'net',
  'node:http',
  'http',
  'node:https',
  'https',
  'node:dgram',
  'dgram',
]);

/**
 * Detects the runtime execution environment.
 * @returns {'node' | 'browser' | 'worker' | 'unknown'}
 */
function detectEnvironment() {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'node';
  }
  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    return 'worker';
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }
  return 'unknown';
}

/**
 * Asserts runtime isolation for the core conversion engine.
 * Ensures the core engine has not loaded networking primitives.
 * @throws {ZapwebpError}
 */
function assertRuntimeIsolation() {
  const env = detectEnvironment();
  if (env === 'node' && typeof require !== 'undefined' && require.cache) {
    for (const mod of PROHIBITED_NETWORK_MODULES) {
      try {
        const resolved = require.resolve(mod);
        if (require.cache[resolved]) {
          throw new ZapwebpError({
            code: 'E_UNSAFE_RUNTIME',
            message: `Prohibited network module "${mod}" was loaded into the core conversion runtime.`,
            fix: 'The core conversion engine runs 100% offline in-memory. Remove network imports from the conversion path.',
          });
        }
      } catch (err) {
        if (err && err.code === 'E_UNSAFE_RUNTIME') {
          throw err;
        }
        // Module not found or unresolvable; safe.
      }
    }
  }
  return true;
}

module.exports = {
  detectEnvironment,
  assertRuntimeIsolation,
  PROHIBITED_NETWORK_MODULES,
};
