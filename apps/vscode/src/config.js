'use strict';

const vscode = require('vscode');

/**
 * @typedef {Object} ZapwebpConfig
 * @property {boolean} convertOnSave - Automatically convert .svg files on document save.
 * @property {number} baseWidth - Base width in pixels for @1x multi-scale outputs.
 * @property {number} quality - Lossy compression quality (0-100).
 * @property {boolean} clean - Strip EXIF, XMP, and C2PA metadata.
 * @property {'webp' | 'png' | 'avif' | 'jpeg'} outputExtension - Target format for single-file conversions.
 */

const VALID_FORMATS = new Set(['webp', 'png', 'avif', 'jpeg']);

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

  return {
    convertOnSave: Boolean(config.get('convertOnSave', false)),
    baseWidth: Number.isFinite(baseWidthRaw) && baseWidthRaw > 0 ? baseWidthRaw : 512,
    quality: Number.isFinite(qualityRaw) && qualityRaw >= 0 && qualityRaw <= 100 ? qualityRaw : 85,
    clean: Boolean(config.get('clean', true)),
    outputExtension: VALID_FORMATS.has(outputRaw) ? outputRaw : 'webp',
  };
}

module.exports = {
  readConfig,
  VALID_FORMATS,
};
