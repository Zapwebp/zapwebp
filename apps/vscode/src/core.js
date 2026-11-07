'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { execFile } = require('node:child_process');

/**
 * Dynamically hooks Module._resolveFilename so in-process @zapwebp/core can locate
 * native modules (sharp, @resvg/resvg-js) from open workspace folders, extensions,
 * or parent node_modules directories.
 */
function setupNativeResolution() {
  const extraDirs = [];
  try {
    const vscode = require('vscode');
    if (vscode.workspace && Array.isArray(vscode.workspace.workspaceFolders)) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const root = folder.uri.fsPath;
        extraDirs.push(path.join(root, 'node_modules'));
        extraDirs.push(path.join(root, 'apps', 'vscode', 'node_modules'));
        extraDirs.push(path.join(root, 'packages', 'core', 'node_modules'));
      }
    }
  } catch {}

  extraDirs.push(path.resolve(__dirname, '../../node_modules'));
  extraDirs.push(path.resolve(__dirname, '../../../node_modules'));
  extraDirs.push(path.resolve(__dirname, '../node_modules'));

  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function(request, parent, isMain, options) {
    try {
      return origResolve.call(this, request, parent, isMain, options);
    } catch (err) {
      if (request === 'sharp' || request === '@resvg/resvg-js' || request.startsWith('@resvg/')) {
        for (const dir of extraDirs) {
          if (fs.existsSync(dir)) {
            try {
              return origResolve.call(this, request, { paths: Module._nodeModulePaths(dir) }, isMain, options);
            } catch {}
          }
        }
      }
      throw err;
    }
  };
}
setupNativeResolution();

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

  if (!coreModule) {
    try {
      const vscode = require('vscode');
      if (vscode.workspace && Array.isArray(vscode.workspace.workspaceFolders)) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const root = folder.uri.fsPath;
          const pkgPath = path.join(root, 'packages/core');
          if (fs.existsSync(pkgPath)) {
            try {
              coreModule = require(pkgPath);
              if (coreModule) break;
            } catch {}
          }
        }
      }
    } catch {}
  }

  if (!coreModule) {
    const relCandidates = [
      path.resolve(__dirname, '../../packages/core'),
      path.resolve(__dirname, '../../../packages/core'),
      path.resolve(__dirname, '../packages/core'),
    ];
    for (const rel of relCandidates) {
      if (fs.existsSync(rel)) {
        try {
          coreModule = require(rel);
          if (coreModule) break;
        } catch {}
      }
    }
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
 * Detects file extension from image buffer magic bytes or text.
 * @param {Buffer|Uint8Array} bytes
 * @returns {string}
 */
function sniffInputExtension(bytes) {
  if (!bytes || bytes.length < 4) return 'png';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)) return 'tiff';
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'avif';
  const head = bytes.slice(0, 100).toString('utf8').trim();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'svg';
  return 'png';
}

/**
 * Resolves system Node.js binary path on Windows or POSIX.
 * @returns {string}
 */
function resolveNodeExecutable() {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
      path.join(process.env.APPDATA || '', 'npm', 'node.exe'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
  }
  return 'node';
}

/**
 * Searches open workspace folders and package directories for a local Zap CLI runner.
 * @returns {string|null} Absolute path to executable CLI script, or null.
 */
function findLocalCli() {
  const candidates = [];

  // Priority 1: Self-bundled zap runner inside the extension dist
  candidates.push(path.join(__dirname, 'zap.js'));

  try {
    const vscode = require('vscode');
    if (vscode.workspace && Array.isArray(vscode.workspace.workspaceFolders)) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const root = folder.uri.fsPath;
        candidates.push(path.join(root, 'packages/cli/bin/zap.js'));
        candidates.push(path.join(root, 'node_modules/@zapwebp/cli/bin/zap.js'));
        candidates.push(path.join(root, 'node_modules/.bin/zap'));
      }
    }
  } catch {}

  candidates.push(path.resolve(__dirname, '../../packages/cli/bin/zap.js'));
  candidates.push(path.resolve(__dirname, '../../../packages/cli/bin/zap.js'));
  candidates.push(path.resolve(__dirname, '../packages/cli/bin/zap.js'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * CLI fallback runner with Windows spawn EINVAL prevention and local workspace CLI discovery.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} options
 * @returns {Promise<string>}
 */
async function convertViaCli(inputPath, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const { to = 'webp', quality = 85, clean = true, width, height, background } = options;
    const args = [inputPath, '-o', outputPath, '--to', to, '--quality', String(quality)];
    if (clean) args.push('--clean');
    else args.push('--no-clean');
    if (width) args.push('--width', String(width));
    if (height) args.push('--height', String(height));
    if (background) args.push('--background', String(background));

    const isWin = process.platform === 'win32';

    // Tier 1: Local workspace CLI via direct node execution (bypasses Windows .cmd spawn EINVAL)
    const localCli = findLocalCli();
    if (localCli) {
      const nodeBin = resolveNodeExecutable();
      try {
        execFile(nodeBin, [localCli, ...args], (err) => {
          if (!err && fs.existsSync(outputPath)) {
            return resolve(outputPath);
          }
          trySystemCli(err);
        });
        return;
      } catch (nodeSyncErr) {
        trySystemCli(nodeSyncErr);
        return;
      }
    }

    trySystemCli();

    function trySystemCli(priorErr) {
      // Tier 2: System zap binary (shell: true on Windows prevents spawn EINVAL)
      const zapBin = isWin ? 'zap.cmd' : 'zap';
      try {
        execFile(zapBin, args, { shell: isWin }, (err) => {
          if (!err && fs.existsSync(outputPath)) {
            return resolve(outputPath);
          }
          tryNpx(err || priorErr);
        });
      } catch (zapSyncErr) {
        tryNpx(zapSyncErr || priorErr);
      }
    }

    function tryNpx(priorErr) {
      // Tier 3: npx zapwebp runner (shell: true on Windows prevents spawn EINVAL)
      const npxCmd = isWin ? 'npx.cmd' : 'npx';
      try {
        execFile(npxCmd, ['--yes', 'zapwebp', ...args], { shell: isWin }, (npxErr) => {
          if (!npxErr && fs.existsSync(outputPath)) {
            return resolve(outputPath);
          }
          reject(new ZapError('E_CONVERSION_FAILED', (npxErr || priorErr || new Error('CLI fallback failed')).message));
        });
      } catch (npxSyncErr) {
        reject(new ZapError('E_CONVERSION_FAILED', (npxSyncErr || priorErr || new Error('CLI fallback failed')).message));
      }
    }
  });
}

/**
 * Converts an image buffer with transparency preservation and metadata stripping.
 * @param {Uint8Array|Buffer} bytes - Input image bytes or SVG string buffer.
 * @param {'webp'|'png'|'avif'|'jpeg'} [format='webp'] - Target format.
 * @param {number} [width=512] - Target pixel width.
 * @param {number} [quality=85] - Lossy quality level.
 * @param {boolean} [clean=true] - Whether to strip metadata.
 * @param {string} [background] - Optional background color for flattening (required for JPEG).
 * @returns {Promise<Buffer>} - Converted image byte buffer.
 * @throws {ZapError}
 */
async function convertBuffer(bytes, format = 'webp', width = 512, quality = 85, clean = true, background = undefined) {
  await init();
  validateSvgSecurity(bytes);

  const bg = format === 'jpeg' ? (background || '#ffffff') : background;

  const core = getCore();
  if (core && typeof core.convertImage === 'function') {
    try {
      const result = await core.convertImage(bytes, {
        to: format,
        width,
        quality,
        clean,
        background: bg,
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
  const inExt = sniffInputExtension(bytes);
  const outExt = format === 'jpeg' ? 'jpg' : format;
  const inPath = path.join(tmpDir, `${id}.${inExt}`);
  const outPath = path.join(tmpDir, `${id}.${outExt}`);

  try {
    await fs.promises.writeFile(inPath, bytes);
    await convertViaCli(inPath, outPath, { to: format, width, quality, clean, background: bg });
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
 * @param {'webp'|'png'|'avif'|'jpeg'} [targetFormat='webp'] - Target format for scales.
 * @param {string} [background] - Optional background color.
 * @returns {Promise<Array<{ scale: number, filename: string, data: Buffer }>>}
 */
async function convertScalesBuffer(bytes, sourceName, baseWidth = 512, quality = 85, clean = true, targetFormat = 'webp', background = undefined) {
  await init();
  validateSvgSecurity(bytes);
  const scales = [1, 2, 3];
  const results = [];

  for (const scale of scales) {
    const width = Math.round(baseWidth * scale);
    const data = await convertBuffer(bytes, targetFormat, width, quality, clean, background);
    const filename = outputName(sourceName, targetFormat, scale);
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
