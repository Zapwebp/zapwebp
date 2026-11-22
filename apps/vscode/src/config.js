'use strict';

const vscode = require('vscode');

/**
 * @typedef {Object} ZapwebpConfig
 * @property {boolean} convertOnSave - Automatically convert .svg files on document save.
 * @property {number} baseWidth - Base width in pixels for @1x multi-scale outputs.
 * @property {number} quality - Lossy compression quality (0-100).
 * @property {boolean} clean - Strip EXIF, XMP, and C2PA metadata.
 * @property {'webp' | 'png' | 'avif' | 'jpeg'} outputExtension - Target format for single-file conversions.
 * @property {Record<string, string>} defaultTargets - Mapping of default target format per source format.
 * @property {boolean} showMultipliersForPng - Whether to offer @1x/@2x/@3x multipliers for PNG.
 * @property {boolean} rememberLastChoice - Whether to remember last used target format per source format.
 */

const VALID_FORMATS = new Set(['webp', 'png', 'avif', 'jpeg', 'ico', 'cur']);

const DEFAULT_TARGETS = Object.freeze({
  svg: 'webp',
  png: 'webp',
  jpg: 'webp',
  jpeg: 'webp',
  webp: 'avif',
  avif: 'webp',
  heic: 'webp',
  heif: 'webp',
  ico: 'png',
  cur: 'ico',
  gif: 'webp',
  tiff: 'webp',
});

/**
 * Reads configuration from VS Code workspace settings.
 * @param {vscode.WorkspaceConfiguration} [workspaceConfig] - Optional mock or custom configuration instance.
 * @returns {ZapwebpConfig}
 */
function readConfig(workspaceConfig) {
  const config = workspaceConfig || vscode.workspace.getConfiguration('zapwebp');
  const baseWidthRaw = Number(config.get('baseWidth', 512));
  const qualityRaw = Number(config.get('quality', 85));
  const outputRaw = String(config.get('outputExtension', 'webp')).toLowerCase();
  const configuredTargets = config.get('defaultTargets', {});

  const defaultTargets = {
    ...DEFAULT_TARGETS,
    ...(typeof configuredTargets === 'object' && configuredTargets !== null ? configuredTargets : {}),
  };

  const deleteOriginalVal = Boolean(config.get('deleteOriginal', config.get('deleteOriginalAfterConversion', false)));

  return {
    convertOnSave: Boolean(config.get('convertOnSave', false)),
    baseWidth: Number.isFinite(baseWidthRaw) && baseWidthRaw > 0 ? baseWidthRaw : 512,
    quality: Number.isFinite(qualityRaw) && qualityRaw >= 0 && qualityRaw <= 100 ? qualityRaw : 85,
    clean: Boolean(config.get('clean', true)),
    outputExtension: VALID_FORMATS.has(outputRaw) ? outputRaw : 'webp',
    defaultTargets,
    showMultipliersForPng: Boolean(config.get('showMultipliersForPng', false)),
    rememberLastChoice: Boolean(config.get('rememberLastChoice', true)),
    deleteOriginalAfterConversion: deleteOriginalVal,
    deleteOriginal: deleteOriginalVal,
    icoPreset: String(config.get('icoPreset', 'default')).toLowerCase(),
    compressorEnabled: Boolean(config.get('compressorEnabled', true)),
    targetLockEnabled: Boolean(config.get('targetLockEnabled', true)),
  };
}

/**
 * Reads workspace Target Lock configuration from .zapwebp/config.json, .zapwebp.config.json, or zapwebp.json.
 * @param {vscode.Uri} [fileUri]
 * @returns {Promise<{ targetFormat?: string, acceptFormats?: string[], strict?: boolean, exists: boolean }>}
 */
async function readWorkspaceLockConfig(fileUri) {
  try {
    let roots = [];
    if (fileUri && vscode.workspace.getWorkspaceFolder) {
      const folder = vscode.workspace.getWorkspaceFolder(fileUri);
      if (folder) roots.push(folder.uri);
    }
    if (vscode.workspace && Array.isArray(vscode.workspace.workspaceFolders)) {
      for (const folder of vscode.workspace.workspaceFolders) {
        roots.push(folder.uri);
      }
    }

    const uniqueRoots = [];
    const seenPaths = new Set();
    for (const r of roots) {
      const p = r.fsPath || r.path;
      if (!seenPaths.has(p)) {
        seenPaths.add(p);
        uniqueRoots.push(r);
      }
    }

    const configFilenames = [
      ['.zapwebp', 'config.json'],
      ['.zapwebp.config.json'],
      ['zapwebp.json'],
    ];

    for (const rootUri of uniqueRoots) {
      for (const candidateParts of configFilenames) {
        let candidateUri;
        if (candidateParts.length === 2) {
          candidateUri = rootUri.with({
            path: `${rootUri.path.replace(/\/+$/, '')}/${candidateParts[0]}/${candidateParts[1]}`,
          });
        } else {
          candidateUri = rootUri.with({
            path: `${rootUri.path.replace(/\/+$/, '')}/${candidateParts[0]}`,
          });
        }

        try {
          const bytes = await vscode.workspace.fs.readFile(candidateUri);
          const raw = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : new TextDecoder().decode(bytes);
          const parsed = JSON.parse(raw);
          const targetFormat = parsed.targetFormat || parsed.lockTarget || parsed.output?.lock || parsed.lock?.targetFormat;
          const acceptFormats = parsed.acceptFormats || parsed.output?.acceptFormats || (targetFormat ? [targetFormat] : null);
          const strict = parsed.strict ?? parsed.output?.strict ?? true;
          if (targetFormat || acceptFormats) {
            return {
              targetFormat: targetFormat ? String(targetFormat).toLowerCase() : undefined,
              acceptFormats: Array.isArray(acceptFormats) ? acceptFormats.map((f) => String(f).toLowerCase()) : undefined,
              strict: Boolean(strict),
              exists: true,
            };
          }
        } catch {}
      }
    }
  } catch {}

  return { exists: false };
}

module.exports = {
  readConfig,
  readWorkspaceLockConfig,
  VALID_FORMATS,
  DEFAULT_TARGETS,
};
