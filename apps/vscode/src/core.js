'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');

let coreModule = null;
let coreAttempted = false;

function getCore() {
  if (coreAttempted) return coreModule;
  coreAttempted = true;
  try {
    coreModule = require('@zapwebp/core');
  } catch {
    coreModule = null;
  }
  return coreModule;
}

let initialized = false;

/**
 * Custom error class carrying explicit Zapwebp machine-readable error codes.
 */
class ZapError extends Error {
  /**
   * @param {'E_UNSAFE_SVG'|'E_UNSUPPORTED_FORMAT'|'E_WRITE_FAILED'|'E_CONVERSION_FAILED'|'E_ENGINE_UNAVAILABLE'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'ZapError';
    this.code = code;
  }
}

/**
 * Derives filename scale suffix, e.g. "@2x" or "".
 * @param {number} scale
 * @returns {string}
 */
function scaleSuffix(scale) {
  if (scale === 1 || scale === undefined || scale === null) return '';
  return `@${scale}x`;
}

/**
 * Derives output filename based on source, extension, and scale.
 * @param {string} sourcePath
 * @param {string} [extension='webp']
 * @param {number} [scale=1]
 * @returns {string}
 */
function outputName(sourcePath, extension = 'webp', scale = 1) {
  const parts = sourcePath.replace(/\\/g, '/').split('/');
  const filename = parts.pop() || 'image';
  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  const suffix = scaleSuffix(scale);
  const ext = extension === 'jpeg' ? 'jpg' : extension.replace(/^\./, '');
  return `${base}${suffix}.${ext}`;
}

/**
 * Initializes the conversion engine.
 * @returns {Promise<void>}
 */
async function init() {
  initialized = true;
}

/**
 * Pre-conversion SVG security check preventing script execution.
 * @param {Buffer|Uint8Array|string} bytes
 */
function validateSvgSecurity(bytes) {
  const str = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  if (str.includes('<svg') || str.includes('<?xml')) {
    if (/<(?:script|foreignObject)\b/i.test(str) || /\bon\w+\s*=/i.test(str) || /javascript:/i.test(str)) {
      throw new ZapError('E_UNSAFE_SVG', 'SVG contains active script elements or event handlers.');
    }
    if (/<!ENTITY\b/i.test(str)) {
      throw new ZapError('E_UNSAFE_SVG', 'Custom XML entities are not supported.');
    }
  }
}

/**
 * CLI fallback runner for environments without native Node addons.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} options
 * @returns {Promise<string>}
 */
async function convertViaCli(inputPath, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const { to = 'webp', quality = 85, clean = true, width, height } = options;
    const args = [inputPath, '-o', outputPath, '--to', to, '--quality', String(quality)];
    if (clean) args.push('--clean');
    else args.push('--no-clean');
    if (width) args.push('--width', String(width));
    if (height) args.push('--height', String(height));

    const zapBin = process.platform === 'win32' ? 'zap.cmd' : 'zap';
    execFile(zapBin, args, (err) => {
      if (!err && fs.existsSync(outputPath)) {
        return resolve(outputPath);
      }
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      execFile(npxCmd, ['--yes', 'zapwebp', ...args], (npxErr) => {
        if (!npxErr && fs.existsSync(outputPath)) {
          return resolve(outputPath);
        }
        reject(new ZapError('E_CONVERSION_FAILED', (npxErr || err).message));
      });
    });
  });
}

/**
 * Converts an image buffer with transparency preservation and metadata stripping.
 * @param {Uint8Array|Buffer} bytes - Input image bytes or SVG string buffer.
 * @param {'webp'|'png'|'avif'|'jpeg'} [format='webp'] - Target format.
 * @param {number} [width=512] - Target pixel width.
 * @param {number} [quality=85] - Lossy quality level.
 * @param {boolean} [clean=true] - Whether to strip metadata.
 * @returns {Promise<Buffer>} - Converted image byte buffer.
 * @throws {ZapError}
 */
async function convertBuffer(bytes, format = 'webp', width = 512, quality = 85, clean = true) {
  await init();
  validateSvgSecurity(bytes);

  const core = getCore();
  if (core && typeof core.convertImage === 'function') {
    try {
      const result = await core.convertImage(bytes, {
        to: format,
        width,
        quality,
        clean,
        verify: true,
      });
      return result.data;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (msg.includes('active content') || msg.includes('script') || msg.includes('unsafe')) {
        throw new ZapError('E_UNSAFE_SVG', 'SVG contains active script elements or event handlers.');
      }
      if (msg.includes('Unsupported or unrecognized') || msg.includes('Unsupported format') || msg.includes('empty')) {
        throw new ZapError('E_UNSUPPORTED_FORMAT', msg);
      }
      if (err.code !== 'E_ENGINE_UNAVAILABLE' && !msg.includes('sharp')) {
        throw new ZapError('E_CONVERSION_FAILED', msg);
      }
    }
  }

  // CLI fallback via temporary file pair
  const tmpDir = os.tmpdir();
  const id = `zap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = format === 'jpeg' ? 'jpg' : format;
  const inPath = path.join(tmpDir, `${id}.input`);
  const outPath = path.join(tmpDir, `${id}.${ext}`);

  try {
    await fs.promises.writeFile(inPath, bytes);
    await convertViaCli(inPath, outPath, { to: format, width, quality, clean });
    return await fs.promises.readFile(outPath);
  } catch (err) {
    throw new ZapError('E_CONVERSION_FAILED', err.message || 'CLI conversion failed.');
  } finally {
    try { await fs.promises.unlink(inPath); } catch {}
    try { await fs.promises.unlink(outPath); } catch {}
  }
}

/**
 * Converts an image buffer to Retina scale variants (@1x, @2x, @3x).
 * @param {Uint8Array|Buffer} bytes - Input image bytes.
 * @param {string} sourceName - Source file basename (e.g. "logo.svg").
 * @param {number} [baseWidth=512] - Base width for @1x.
 * @param {number} [quality=85] - Lossy quality level.
 * @param {boolean} [clean=true] - Whether to strip metadata.
 * @returns {Promise<Array<{ scale: number, filename: string, data: Buffer }>>}
 */
async function convertScalesBuffer(bytes, sourceName, baseWidth = 512, quality = 85, clean = true) {
  await init();
  validateSvgSecurity(bytes);
  const scales = [1, 2, 3];
  const results = [];

  for (const scale of scales) {
    const width = Math.round(baseWidth * scale);
    const data = await convertBuffer(bytes, 'webp', width, quality, clean);
    const filename = outputName(sourceName, 'webp', scale);
    results.push({ scale, filename, data });
  }

  return results;
}

/**
 * Direct file conversion utility for workspace paths.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} [options]
 * @returns {Promise<{ sourceSize: number, outputSize: number }>}
 */
async function convertFile(inputPath, outputPath, options = {}) {
  const bytes = await fs.promises.readFile(inputPath);
  const format = options.to || 'webp';
  const out = await convertBuffer(bytes, format, options.width, options.quality, options.clean);
  await fs.promises.writeFile(outputPath, out);
  return {
    sourceSize: bytes.byteLength,
    outputSize: out.byteLength,
  };
}

module.exports = {
  init,
  convertBuffer,
  convertScalesBuffer,
  convertFile,
  outputName,
  scaleSuffix,
  ZapError,
};
