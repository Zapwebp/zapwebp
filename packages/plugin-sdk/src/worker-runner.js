'use strict';

/**
 * Worker Thread Runner for Sandboxed Plugin Execution
 * Executes in an isolated V8 thread with resource limits and restricted process environment.
 */

const { workerData, parentPort } = require('node:worker_threads');
const Module = require('node:module');

const { pluginModulePath, pluginName, permissions = [], method, args = [] } = workerData;
const allowNetwork = permissions.includes('network');

const RESTRICTED_FILESYSTEM = ['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'child_process', 'node:child_process'];
const RESTRICTED_NETWORK = ['net', 'node:net', 'http', 'node:http', 'https', 'node:https', 'dgram', 'node:dgram'];

// Intercept Module._load inside the worker thread
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const normalized = request.startsWith('node:') ? request.slice(5) : request;

  if (RESTRICTED_FILESYSTEM.includes(normalized) || RESTRICTED_FILESYSTEM.includes(request)) {
    throw new Error(`E_PLUGIN_SANDBOX_VIOLATION: Plugin "${pluginName}" attempted unauthorized filesystem access via "${request}".`);
  }

  if (!allowNetwork && (RESTRICTED_NETWORK.includes(normalized) || RESTRICTED_NETWORK.includes(request))) {
    throw new Error(`E_PLUGIN_SANDBOX_VIOLATION: Plugin "${pluginName}" attempted unauthorized network access via "${request}".`);
  }

  return originalLoad.apply(this, arguments);
};

// Intercept global fetch inside the worker
if (!allowNetwork && typeof globalThis.fetch === 'function') {
  globalThis.fetch = function () {
    return Promise.reject(new Error(`E_PLUGIN_SANDBOX_VIOLATION: Plugin "${pluginName}" attempted unauthorized network access via fetch().`));
  };
}

async function run() {
  try {
    let mod = require(pluginModulePath);
    // If default export
    if (mod && mod.default) {
      mod = mod.default;
    }

    let targetFn;
    if (typeof mod === 'function' && !method) {
      targetFn = mod;
    } else if (mod && typeof mod[method] === 'function') {
      targetFn = mod[method].bind(mod);
    } else if (typeof mod.apply === 'function' && method === 'apply') {
      targetFn = mod.apply.bind(mod);
    } else {
      throw new Error(`Plugin method "${method}" is not a function.`);
    }

    const result = await targetFn(...args);
    parentPort.postMessage({ success: true, result });
  } catch (err) {
    const isViolation = err.message && err.message.includes('E_PLUGIN_SANDBOX_VIOLATION');
    parentPort.postMessage({
      success: false,
      code: isViolation ? 'E_PLUGIN_SANDBOX_VIOLATION' : 'E_PLUGIN_EXECUTION_FAILED',
      message: err.message,
      fix: isViolation
        ? 'Community plugins receive bytes and return bytes only. Do not access restricted host APIs.'
        : 'Review plugin execution code.',
    });
  }
}

run();
