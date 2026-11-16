'use strict';

/**
 * Worker Thread Runner for Sandboxed Plugin Execution
 * Executes in an isolated V8 thread with resource limits and restricted process environment.
 */

const { workerData, parentPort } = require('node:worker_threads');
const Module = require('node:module');

// Expose standard plugin-sdk helpers in worker global scope
try {
  const { createMockRawImage, safeDecode } = require('./index.js');
  globalThis.createMockRawImage = createMockRawImage;
  globalThis.safeDecode = safeDecode;
} catch (_) {}

const { pluginModulePath, pluginName, permissions = [], method, args = [], fnCode } = workerData || {};
const allowNetwork = Array.isArray(permissions) && permissions.includes('network');

const RESTRICTED_FILESYSTEM = [
  'fs',
  'node:fs',
  'fs/promises',
  'node:fs/promises',
  'child_process',
  'node:child_process',
];

const RESTRICTED_NETWORK = [
  'net',
  'node:net',
  'http',
  'node:http',
  'https',
  'node:https',
  'dgram',
  'node:dgram',
  'tls',
  'node:tls',
];

// Intercept Module._load ONLY inside this isolated worker thread
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const normalized = request.startsWith('node:') ? request.slice(5) : request;

  if (RESTRICTED_FILESYSTEM.includes(normalized) || RESTRICTED_FILESYSTEM.includes(request)) {
    throw new Error(`E_PLUGIN_SANDBOX_VIOLATION: Plugin "${pluginName}" attempted unauthorized access to restricted module "${request}". Community plugins receive bytes and return bytes only; direct filesystem and process access is forbidden.`);
  }

  if (!allowNetwork && (RESTRICTED_NETWORK.includes(normalized) || RESTRICTED_NETWORK.includes(request))) {
    throw new Error(`E_PLUGIN_SANDBOX_VIOLATION: Plugin "${pluginName}" attempted unauthorized network access via "${request}". Network access is forbidden unless explicitly declared.`);
  }

  return originalLoad.apply(this, arguments);
};

// Intercept global fetch ONLY inside this isolated worker thread
if (!allowNetwork && typeof globalThis.fetch === 'function') {
  globalThis.fetch = function () {
    return Promise.reject(new Error(`E_PLUGIN_SANDBOX_VIOLATION: Plugin "${pluginName}" attempted unauthorized network access via fetch(). Network access is forbidden unless explicitly declared.`));
  };
}

async function run() {
  try {
    let result;
    if (fnCode) {
      let targetFn;
      try {
        const obj = eval(`({ ${fnCode} })`);
        targetFn = Object.values(obj)[0];
      } catch (_) {
        targetFn = eval(`(${fnCode})`);
      }
      if (typeof targetFn !== 'function') {
        throw new Error(`Sandboxed code does not resolve to a function.`);
      }
      result = await targetFn(...args);
    } else if (pluginModulePath) {
      let mod = require(pluginModulePath);
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

      result = await targetFn(...args);
    } else {
      throw new Error('Neither pluginModulePath nor fnCode was provided to worker.');
    }

    parentPort.postMessage({ success: true, result });
  } catch (err) {
    const rawMessage = (err && err.message) || String(err || 'Worker plugin execution failed.');
    const isViolation = rawMessage.includes('E_PLUGIN_SANDBOX_VIOLATION') ||
      rawMessage.includes('restricted module') ||
      rawMessage.includes('unauthorized');

    const isFs = rawMessage.includes('restricted module') ||
      rawMessage.includes('filesystem') ||
      rawMessage.includes('node:fs') ||
      rawMessage.includes('child_process');

    const isNet = rawMessage.includes('network') ||
      rawMessage.includes('fetch()') ||
      rawMessage.includes('node:net') ||
      rawMessage.includes('node:http');

    const cleanMessage = rawMessage.replace(/^Error:\s*|^E_PLUGIN_SANDBOX_VIOLATION:\s*/, '');

    parentPort.postMessage({
      success: false,
      code: isViolation ? 'E_PLUGIN_SANDBOX_VIOLATION' : 'E_PLUGIN_EXECUTION_FAILED',
      message: cleanMessage,
      fix: isFs
        ? 'Remove direct filesystem imports. Your plugin receives byte buffers directly in decode() or apply() arguments.'
        : isNet
          ? 'Declare zapwebp.permissions: ["network"] in package.json if network capability is required.'
          : 'Review plugin execution code.',
      docs: 'https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation',
    });
  }
}

run();
