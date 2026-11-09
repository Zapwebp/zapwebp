'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { execFile, spawn, execSync } = require('node:child_process');

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
    if (process.env.NODE_PATH && fs.existsSync(process.env.NODE_PATH)) {
      return process.env.NODE_PATH;
    }
    const candidates = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
      path.join(process.env.APPDATA || '', 'npm', 'node.exe'),
      path.join(process.env.ProgramData || '', 'chocolatey', 'bin', 'node.exe'),
      path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'nodejs', 'current', 'node.exe'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    try {
      const out = execSync('where.exe node', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
      const first = out.split(/\r?\n/).find((p) => p.trim() && fs.existsSync(p.trim()));
      if (first) return first.trim();
    } catch {}
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

    // Build extra module resolution paths for child Node processes
    const extraDirs = [];
    try {
      const vscode = require('vscode');
      if (vscode.workspace && Array.isArray(vscode.workspace.workspaceFolders)) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const root = folder.uri.fsPath;
          extraDirs.push(path.join(root, 'node_modules'));
          extraDirs.push(path.join(root, 'packages', 'core', 'node_modules'));
        }
      }
    } catch {}
    extraDirs.push(path.resolve(__dirname, '../../node_modules'));
    extraDirs.push(path.resolve(__dirname, '../../../node_modules'));
    extraDirs.push(path.resolve(__dirname, '../node_modules'));

    const nodePathEnv = [process.env.NODE_PATH, ...extraDirs.filter((d) => fs.existsSync(d))].filter(Boolean).join(path.delimiter);
    const spawnEnv = { ...process.env, NODE_PATH: nodePathEnv };

    // Tier 1: Local workspace or bundled CLI via direct node execution
    const localCli = findLocalCli();
    if (localCli) {
      const nodeBin = resolveNodeExecutable();
      try {
        execFile(nodeBin, [localCli, ...args], { env: spawnEnv, windowsHide: true }, (err) => {
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
      // Tier 2: System zap binary (using cmd.exe on Windows completely eliminates spawn EINVAL)
      if (isWin) {
        try {
          const proc = spawn('cmd.exe', ['/d', '/s', '/c', 'zap', ...args], { env: spawnEnv, windowsHide: true });
          proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
              return resolve(outputPath);
            }
            tryNpx(priorErr);
          });
          proc.on('error', (err) => {
            tryNpx(err || priorErr);
          });
        } catch (zapSyncErr) {
          tryNpx(zapSyncErr || priorErr);
        }
      } else {
        try {
          execFile('zap', args, { env: spawnEnv }, (err) => {
            if (!err && fs.existsSync(outputPath)) {
              return resolve(outputPath);
            }
            tryNpx(err || priorErr);
          });
        } catch (zapSyncErr) {
          tryNpx(zapSyncErr || priorErr);
        }
      }
    }

    function tryNpx(priorErr) {
      // Tier 3: npx zapwebp runner (using cmd.exe on Windows completely eliminates spawn EINVAL)
      if (isWin) {
        try {
          const proc = spawn('cmd.exe', ['/d', '/s', '/c', 'npx', '--yes', 'zapwebp', ...args], { env: spawnEnv, windowsHide: true });
          let stderrOut = '';
          proc.stderr?.on('data', (d) => { stderrOut += d.toString(); });
          proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
              return resolve(outputPath);
            }
            reject(new ZapError('E_CONVERSION_FAILED', stderrOut.trim() || priorErr?.message || 'CLI conversion failed.'));
          });
          proc.on('error', (err) => {
            reject(new ZapError('E_CONVERSION_FAILED', err.message || priorErr?.message || 'CLI conversion failed.'));
          });
        } catch (npxSyncErr) {
          reject(new ZapError('E_CONVERSION_FAILED', (npxSyncErr || priorErr || new Error('CLI fallback failed')).message));
        }
      } else {
        try {
          execFile('npx', ['--yes', 'zapwebp', ...args], { env: spawnEnv }, (npxErr) => {
            if (!npxErr && fs.existsSync(outputPath)) {
              return resolve(outputPath);
            }
            reject(new ZapError('E_CONVERSION_FAILED', (npxErr || priorErr || new Error('CLI fallback failed')).message));
          });
        } catch (npxSyncErr) {
          reject(new ZapError('E_CONVERSION_FAILED', (npxSyncErr || priorErr || new Error('CLI fallback failed')).message));
        }
      }
    }
  });
}

/**
 * Remote API conversion fallback for environments lacking local native dependencies.
 * @param {Buffer|Uint8Array} bytes
 * @param {string} format
 * @param {number} [width]
 * @param {number} [quality=85]
 * @param {boolean} [clean=true]
 * @param {string} [background]
 * @returns {Promise<Buffer>}
 */
async function convertViaApi(bytes, format = 'webp', width = 512, quality = 85, clean = true, background = undefined) {
  if (typeof globalThis.fetch !== 'function') {
    throw new ZapError('E_ENGINE_UNAVAILABLE', 'Fetch API unavailable in runtime environment.');
  }

  const formData = new FormData();
  const inExt = sniffInputExtension(bytes);
  const mimeMap = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    tiff: 'image/tiff',
    svg: 'image/svg+xml',
  };
  const mime = mimeMap[inExt] || 'application/octet-stream';
  const blob = new Blob([bytes], { type: mime });

  formData.append('file', blob, `input.${inExt}`);
  formData.append('to', format === 'jpeg' ? 'jpeg' : format);
  formData.append('quality', String(quality));
  formData.append('clean', String(clean));
  if (width) formData.append('width', String(width));
  if (background) formData.append('background', background);

  const endpoint = 'https://zapwebp.vercel.app/api/convert';
  const res = await globalThis.fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ZapError('E_CONVERSION_FAILED', `Remote conversion failed (${res.status}): ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  // Tier 1: In-process @zapwebp/core if sharp and resvg bindings are accessible
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

  // Tier 2: Local or self-bundled CLI execution via Node runner
  const tmpDir = os.tmpdir();
  const id = `zap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inExt = sniffInputExtension(bytes);
  const outExt = format === 'jpeg' ? 'jpg' : format;
  const inPath = path.join(tmpDir, `${id}.${inExt}`);
  const outPath = path.join(tmpDir, `${id}.${outExt}`);

  let cliSuccess = false;
  try {
    await fs.promises.writeFile(inPath, bytes);
    await convertViaCli(inPath, outPath, { to: format, width, quality, clean, background: bg });
    if (fs.existsSync(outPath)) {
      const outBytes = await fs.promises.readFile(outPath);
      cliSuccess = true;
      return outBytes;
    }
  } catch {
    cliSuccess = false;
  } finally {
    try { await fs.promises.unlink(inPath); } catch {}
    try { await fs.promises.unlink(outPath); } catch {}
  }

  // Tier 3: Seamless cloud API conversion fallback via official Zapwebp endpoint
  try {
    return await convertViaApi(bytes, format, width, quality, clean, bg);
  } catch (apiErr) {
    if (apiErr.code === 'E_CONVERSION_FAILED' && apiErr.message.includes('400')) {
      throw apiErr;
    }
    // Tier 4: Friendly, actionable error if offline and no local engine is available
    throw new ZapError(
      'E_ENGINE_UNAVAILABLE',
      'Local conversion engine unavailable offline. Run "npm install -g @zapwebp/cli" for offline conversion, or connect to the internet.'
    );
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
