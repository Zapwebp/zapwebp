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

const VALID_FORMATS = new Set(['webp', 'png', 'avif', 'jpeg']);

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

  return {
    convertOnSave: Boolean(config.get('convertOnSave', false)),
    baseWidth: Number.isFinite(baseWidthRaw) && baseWidthRaw > 0 ? baseWidthRaw : 512,
    quality: Number.isFinite(qualityRaw) && qualityRaw >= 0 && qualityRaw <= 100 ? qualityRaw : 85,
    clean: Boolean(config.get('clean', true)),
    outputExtension: VALID_FORMATS.has(outputRaw) ? outputRaw : 'webp',
    defaultTargets,
    showMultipliersForPng: Boolean(config.get('showMultipliersForPng', false)),
    rememberLastChoice: Boolean(config.get('rememberLastChoice', true)),
  };
}

module.exports = {
  readConfig,
  VALID_FORMATS,
  DEFAULT_TARGETS,
};
