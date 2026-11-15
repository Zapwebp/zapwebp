'use strict';

const Module = require('node:module');
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

const SENSITIVE_ENV_KEYS = [
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
];

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
 * Executes a function within an in-process capability sandbox.
 * Intercepts unauthorized module loading and network requests.
 *
 * @template T
 * @param {() => T|Promise<T>} fn
 * @param {object} [options]
 * @param {string} [options.pluginName='community-plugin']
 * @param {string[]} [options.permissions=[]]
 * @returns {Promise<T>}
 */
async function runInSandbox(fn, options = {}) {
  const pluginName = options.pluginName || 'community-plugin';
  const permissions = options.permissions || [];
  const allowNetwork = permissions.includes('network');

  const originalLoad = Module._load;
  const originalFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;

  // Mask sensitive environment variables
  const maskedEnv = {};
  if (typeof process !== 'undefined' && process.env) {
    for (const key of Object.keys(process.env)) {
      if (SENSITIVE_ENV_KEYS.some((sensitive) => key.toUpperCase().includes(sensitive))) {
        maskedEnv[key] = process.env[key];
        delete process.env[key];
      }
    }
  }

  // Intercept module loader
  Module._load = function (request, parent, isMain) {
    const normalized = request.startsWith('node:') ? request.slice(5) : request;

    if (RESTRICTED_FILESYSTEM_MODULES.includes(normalized) || RESTRICTED_FILESYSTEM_MODULES.includes(request)) {
      throw new ZapwebpError({
        code: 'E_PLUGIN_SANDBOX_VIOLATION',
        message: `Plugin "${pluginName}" attempted unauthorized access to restricted module "${request}". Community plugins receive bytes and return bytes only; direct filesystem and process access is forbidden.`,
        fix: 'Remove direct filesystem imports. Your plugin receives byte buffers directly in decode() or apply() arguments.',
        docs: 'https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation',
      });
    }

    if (!allowNetwork && (RESTRICTED_NETWORK_MODULES.includes(normalized) || RESTRICTED_NETWORK_MODULES.includes(request))) {
      throw new ZapwebpError({
        code: 'E_PLUGIN_SANDBOX_VIOLATION',
        message: `Plugin "${pluginName}" attempted unauthorized network access via "${request}". Network access is forbidden unless explicitly declared.`,
        fix: 'If this plugin is a remote storage adapter, declare zapwebp.permissions: ["network"] in package.json and ensure consent is granted.',
        docs: 'https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation',
      });
    }

    return originalLoad.apply(this, arguments);
  };

  // Intercept global fetch
  if (!allowNetwork && originalFetch) {
    globalThis.fetch = function () {
      return Promise.reject(
        new ZapwebpError({
          code: 'E_PLUGIN_SANDBOX_VIOLATION',
          message: `Plugin "${pluginName}" attempted unauthorized network access via fetch(). Network access is forbidden unless explicitly declared.`,
          fix: 'Declare zapwebp.permissions: ["network"] in package.json if network capability is required.',
          docs: 'https://zapwebp-docs.vercel.app/errors#e_plugin_sandbox_violation',
        })
      );
    };
  }

  try {
    const result = await fn();
    return result;
  } finally {
    Module._load = originalLoad;
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    // Restore environment
    if (typeof process !== 'undefined' && process.env) {
      for (const [key, val] of Object.entries(maskedEnv)) {
        process.env[key] = val;
      }
    }
  }
}

/**
 * Executes a plugin method inside a separate worker thread with isolated memory and environment.
 *
 * @param {string} pluginModulePath - Absolute path to plugin script
 * @param {string} method - Method name ('decode', 'encode', 'apply')
 * @param {any[]} args - Serializable arguments (e.g. [Uint8Array, options])
 * @param {object} [options]
 * @returns {Promise<any>}
 */
function executeInWorker(pluginModulePath, method, args, options = {}) {
  const pluginName = options.pluginName || path.basename(pluginModulePath);
  const permissions = options.permissions || [];
  const workerScript = path.resolve(__dirname, 'worker-runner.js');

  return new Promise((resolve, reject) => {
    // Sanitize environment passed to worker
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
 * Wraps a community TransformStep with capability validation and sandboxed execution.
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

      return runInSandbox(
        async () => {
          const transformed = await step.apply(image, transformOptions);
          if (!transformed || !transformed.data || !transformed.width || !transformed.height) {
            throw new ZapwebpError({
              code: 'E_PLUGIN_SANDBOX_VIOLATION',
              message: `Transform "${name}" returned an invalid RawImage. Plugins must return { data, width, height }.`,
              fix: 'Return a valid RawImage with non-empty pixel data and integer dimensions.',
            });
          }
          return transformed;
        },
        { pluginName: name, permissions: options.permissions || [] }
      );
    },
  };
}

/**
 * Wraps a community FormatHandler with capability assertions and sandboxed execution.
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

      return runInSandbox(
        async () => {
          return handler.decode(bytes, decodeOptions);
        },
        { pluginName: name, permissions: options.permissions || [] }
      );
    },
    async encode(image, encodeOptions = {}) {
      if (!image || !image.data) {
        throw new ZapwebpError({
          code: 'E_PLUGIN_SANDBOX_VIOLATION',
          message: `Encoder for "${name}" received an invalid image object without pixel data.`,
          fix: 'Pass a valid RawImage with uncompressed RGBA bytes.',
        });
      }

      return runInSandbox(
        async () => {
          return handler.encode(image, encodeOptions);
        },
        { pluginName: name, permissions: options.permissions || [] }
      );
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
