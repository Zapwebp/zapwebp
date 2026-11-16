'use strict';

const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { ZapwebpError } = require('@zapwebp/shared');

const RESTRICTED_FILESYSTEM_MODULES = Object.freeze([
  'fs',
  'node:fs',
  'fs/promises',
  'node:fs/promises',
  'child_process',
  'node:child_process',
]);

const RESTRICTED_NETWORK_MODULES = Object.freeze([
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
]);

const SENSITIVE_ENV_KEYS = Object.freeze([
  'SSH_AUTH_SOCK',
  'SSH_AGENT_PID',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NPM_TOKEN',
  'PRIVATE_KEY',
  'SECRET',
  'PASSWORD',
  'TOKEN',
]);

/**
 * Validates a plugin manifest and permissions against user consent.
 *
 * @param {object} manifest - Plugin package.json or metadata object
 * @param {object} [options]
 * @param {boolean} [options.allowNetwork]
 * @param {boolean} [options.consentGranted]
 * @param {(pluginName: string, requested: string[]) => Promise<boolean>|boolean} [options.promptConsent]
 * @returns {Promise<{ allowed: boolean, permissions: string[] }>}
 */
async function validatePluginPermissions(manifest, options = {}) {
  const pluginName = manifest?.name || 'unknown-plugin';
  const declared = manifest?.zapwebp?.permissions || manifest?.permissions || [];
  const permissions = Array.isArray(declared) ? declared.map((p) => String(p).toLowerCase().trim()) : [];

  const requestsNetwork = permissions.includes('network');

  if (requestsNetwork) {
    if (options.allowNetwork === true || options.consentGranted === true) {
      return { allowed: true, permissions };
    }

    if (typeof options.promptConsent === 'function') {
      const consented = await options.promptConsent(pluginName, ['network']);
      if (consented) {
        return { allowed: true, permissions };
      }
    }

    throw new ZapwebpError({
      code: 'E_PLUGIN_SANDBOX_VIOLATION',
      message: `Plugin "${pluginName}" requests network access, but permission was not granted.`,
      fix: 'Run the command with --allow-network-plugin or consent to network access when prompted.',
      docs: 'https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation',
    });
  }

  return { allowed: true, permissions };
}

/**
 * Executes a plugin method or code inside a separate worker thread with isolated memory and environment.
 * Host process environment, Module._load, and globalThis are NEVER monkeypatched.
 *
 * @param {string|null} pluginModulePath - Absolute path to plugin script (or null if fnCode provided)
 * @param {string|null} [method] - Method name ('decode', 'encode', 'apply')
 * @param {any[]} [args=[]] - Serializable arguments (e.g. [Uint8Array, options])
 * @param {object} [options={}]
 * @param {string} [options.pluginName]
 * @param {string[]} [options.permissions]
 * @param {string} [options.fnCode] - Raw function string to execute inside worker
 * @returns {Promise<any>}
 */
function executeInWorker(pluginModulePath, method, args = [], options = {}) {
  const pluginName = options.pluginName || (typeof pluginModulePath === 'string' ? path.basename(pluginModulePath) : 'community-plugin');
  const permissions = options.permissions || [];
  const fnCode = options.fnCode;
  const workerScript = path.resolve(__dirname, 'worker-runner.js');

  return new Promise((resolve, reject) => {
    // Sanitize environment passed to worker thread
    const cleanEnv = {};
    if (typeof process !== 'undefined' && process.env) {
      for (const [k, v] of Object.entries(process.env)) {
        if (!SENSITIVE_ENV_KEYS.some((sensitive) => k.toUpperCase().includes(sensitive))) {
          cleanEnv[k] = v;
        }
      }
    }

    let worker;
    try {
      worker = new Worker(workerScript, {
        env: cleanEnv,
        resourceLimits: {
          maxOldGenerationSizeMb: 128,
          maxYoungGenerationSizeMb: 32,
        },
        workerData: {
          pluginModulePath,
          pluginName,
          permissions,
          method,
          args,
          fnCode,
        },
      });
    } catch (err) {
      return reject(err);
    }

    worker.on('message', (msg) => {
      if (msg.success) {
        resolve(msg.result);
      } else {
        const error = new ZapwebpError({
          code: msg.code || 'E_PLUGIN_SANDBOX_VIOLATION',
          message: msg.message || 'Worker plugin execution failed.',
          fix: msg.fix || 'Check plugin implementation.',
          docs: msg.docs || 'https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation',
        });
        reject(error);
      }
      worker.terminate();
    });

    worker.on('error', (err) => {
      reject(err);
      worker.terminate();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new ZapwebpError({
          code: 'E_PLUGIN_SANDBOX_VIOLATION',
          message: `Worker exited unexpectedly with code ${code}.`,
          fix: 'Verify plugin syntax and execution limits.',
        }));
      }
    });
  });
}

/**
 * Executes a function within an isolated Worker Thread.
 * Guarantees zero global mutation of the main process.
 *
 * @template T
 * @param {Function} fn
 * @param {object} [options]
 * @param {string} [options.pluginName='community-plugin']
 * @param {string[]} [options.permissions=[]]
 * @param {any[]} [options.args=[]]
 * @returns {Promise<T>}
 */
async function runInSandbox(fn, options = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('runInSandbox requires a function to execute.');
  }
  const pluginName = options.pluginName || 'community-plugin';
  const permissions = options.permissions || [];
  const args = options.args || [];

  return executeInWorker(null, null, args, {
    pluginName,
    permissions,
    fnCode: fn.toString(),
  });
}

/**
 * Wraps a community TransformStep with capability validation and sandboxed execution in worker.
 *
 * @param {object} step - Raw TransformStep { name, apply, metadata }
 * @param {object} [options]
 * @returns {object} Sandboxed TransformStep
 */
function sandboxedTransform(step, options = {}) {
  if (!step || typeof step !== 'object') {
    throw new TypeError('Transform step must be an object.');
  }
  const name = step.name || 'custom-transform';

  return {
    ...step,
    name,
    async apply(image, transformOptions = {}) {
      if (!image || !image.data || !Number.isInteger(image.width) || !Number.isInteger(image.height)) {
        throw new ZapwebpError({
          code: 'E_PLUGIN_SANDBOX_VIOLATION',
          message: `Transform "${name}" received an invalid RawImage. Input must contain data (bytes), width, and height.`,
          fix: 'Ensure the image pipeline passes valid uncompressed RGBA pixel buffers.',
        });
      }

      const transformed = await runInSandbox(step.apply, {
        pluginName: name,
        permissions: options.permissions || [],
        args: [image, transformOptions],
      });

      if (!transformed || !transformed.data || !transformed.width || !transformed.height) {
        throw new ZapwebpError({
          code: 'E_PLUGIN_SANDBOX_VIOLATION',
          message: `Transform "${name}" returned an invalid RawImage. Plugins must return { data, width, height }.`,
          fix: 'Return a valid RawImage with non-empty pixel data and integer dimensions.',
        });
      }
      return transformed;
    },
  };
}

/**
 * Wraps a community FormatHandler with capability assertions and sandboxed execution in worker.
 *
 * @param {object} handler - Raw FormatHandler
 * @param {object} [options]
 * @returns {object} Sandboxed FormatHandler
 */
function sandboxedFormatHandler(handler, options = {}) {
  if (!handler || typeof handler !== 'object') {
    throw new TypeError('Format handler must be an object.');
  }
  const name = handler.name || 'custom-format';

  return {
    ...handler,
    name,
    async decode(bytes, decodeOptions = {}) {
      if (!bytes || !bytes.length) {
        throw new ZapwebpError({
          code: 'E_EMPTY_FILE',
          message: `Decoder for "${name}" received an empty byte buffer.`,
          fix: 'Verify the source file has non-zero size.',
        });
      }

      return runInSandbox(handler.decode, {
        pluginName: name,
        permissions: options.permissions || [],
        args: [bytes, decodeOptions],
      });
    },
    async encode(image, encodeOptions = {}) {
      if (!image || !image.data) {
        throw new ZapwebpError({
          code: 'E_PLUGIN_SANDBOX_VIOLATION',
          message: `Encoder for "${name}" received an invalid image object without pixel data.`,
          fix: 'Pass a valid RawImage with uncompressed RGBA bytes.',
        });
      }

      return runInSandbox(handler.encode, {
        pluginName: name,
        permissions: options.permissions || [],
        args: [image, encodeOptions],
      });
    },
  };
}

module.exports = {
  validatePluginPermissions,
  runInSandbox,
  executeInWorker,
  sandboxedTransform,
  sandboxedFormatHandler,
  RESTRICTED_FILESYSTEM_MODULES,
  RESTRICTED_NETWORK_MODULES,
  SENSITIVE_ENV_KEYS,
};
