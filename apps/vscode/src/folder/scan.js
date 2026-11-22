'use strict';

const vscode = require('vscode');

/**
 * Standard supported image formats for Zapwebp conversion.
 * @type {readonly string[]}
 */
const SUPPORTED_FORMATS = Object.freeze(['svg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'tiff', 'ico', 'cur']);

/**
 * Maps common file extensions to canonical format identifiers.
 * @type {Record<string, string>}
 */
const EXTENSION_TO_FORMAT = Object.freeze({
  svg: 'svg',
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tif: 'tiff',
  tiff: 'tiff',
  ico: 'ico',
  cur: 'cur',
});

/**
 * Default directory names to ignore during folder scanning.
 * @type {readonly string[]}
 */
const DEFAULT_IGNORED_DIRS = Object.freeze([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.zapwebp',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
]);

/**
 * Checks if an entry file type represents a directory.
 * @param {vscode.FileType|number} type
 * @returns {boolean}
 */
function isDirectoryType(type) {
  const dirFlag = (vscode.FileType && vscode.FileType.Directory) ? vscode.FileType.Directory : 2;
  return type === dirFlag || (typeof type === 'number' && (type & dirFlag) !== 0);
}

/**
 * Checks if an entry file type represents a regular file.
 * @param {vscode.FileType|number} type
 * @returns {boolean}
 */
function isFileType(type) {
  const fileFlag = (vscode.FileType && vscode.FileType.File) ? vscode.FileType.File : 1;
  return type === fileFlag || (typeof type === 'number' && (type & fileFlag) !== 0);
}

/**
 * Determines whether a folder contains any non-ignored subdirectories.
 * @param {vscode.Uri} folderUri
 * @param {object} [options]
 * @param {string[]} [options.ignoreDirs]
 * @returns {Promise<boolean>}
 */
async function hasSubfolders(folderUri, options = {}) {
  const ignoreSet = new Set((options.ignoreDirs || DEFAULT_IGNORED_DIRS).map((d) => d.toLowerCase()));
  try {
    const entries = await vscode.workspace.fs.readDirectory(folderUri);
    for (const [name, type] of entries) {
      if (isDirectoryType(type)) {
        if (!name.startsWith('.') && !ignoreSet.has(name.toLowerCase())) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Scans a folder for convertible images and unsupported skipped assets.
 * @param {vscode.Uri} folderUri - Root directory URI to scan.
 * @param {object} [options]
 * @param {boolean} [options.recursive=false] - Whether to traverse nested subfolders.
 * @param {number} [options.maxFiles=500] - Hard upper ceiling to prevent memory runaway.
 * @param {string[]} [options.ignoreDirs] - Directory names to bypass.
 * @returns {Promise<{
 *   folderUri: vscode.Uri,
 *   files: Array<{ uri: vscode.Uri, name: string, relPath: string, format: string, ext: string }>,
 *   byFormat: Record<string, Array<{ uri: vscode.Uri, name: string, relPath: string, format: string, ext: string }>>,
 *   skipped: Array<{ uri: vscode.Uri, name: string, relPath: string, ext: string, reason: string }>,
 *   subfolders: Array<{ uri: vscode.Uri, name: string, relPath: string }>,
 *   totalFilesScanned: number,
 *   limitReached: boolean
 * }>}
 */
async function scanFolder(folderUri, options = {}) {
  const recursive = Boolean(options.recursive);
  const maxFiles = Number.isFinite(options.maxFiles) && options.maxFiles > 0 ? options.maxFiles : 500;
  const ignoreSet = new Set((options.ignoreDirs || DEFAULT_IGNORED_DIRS).map((d) => d.toLowerCase()));

  const files = [];
  const byFormat = {};
  const skipped = [];
  const subfolders = [];
  let totalFilesScanned = 0;
  let limitReached = false;

  const rootPath = folderUri.path.replace(/\/+$/, '');

  /**
   * Internal recursive directory worker.
   * @param {vscode.Uri} currentDir
   */
  async function traverse(currentDir) {
    if (limitReached) return;

    let entries;
    try {
      entries = await vscode.workspace.fs.readDirectory(currentDir);
    } catch (err) {
      // If a subfolder cannot be read (e.g. permissions), skip gracefully
      return;
    }

    const subdirsToTraverse = [];

    for (const [name, type] of entries) {
      if (limitReached) break;

      const childPath = `${currentDir.path.replace(/\/+$/, '')}/${name}`;
      const childUri = currentDir.with({ path: childPath });
      const relPath = childPath.startsWith(rootPath) ? childPath.slice(rootPath.length).replace(/^\/+/, '') : name;

      if (isDirectoryType(type)) {
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith('.') || ignoreSet.has(lowerName)) {
          continue;
        }
        subfolders.push({ uri: childUri, name, relPath });
        if (recursive) {
          subdirsToTraverse.push(childUri);
        }
      } else if (isFileType(type)) {
        totalFilesScanned++;

        // Ignore common metadata/system files (e.g. .DS_Store, Thumbs.db)
        if (name.startsWith('.') || name.toLowerCase() === 'thumbs.db') {
          continue;
        }

        const dotIdx = name.lastIndexOf('.');
        const ext = dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : '';
        const format = EXTENSION_TO_FORMAT[ext];

        if (format) {
          if (files.length >= maxFiles) {
            limitReached = true;
            break;
          }
          const item = { uri: childUri, name, relPath, format, ext };
          files.push(item);
          if (!byFormat[format]) {
            byFormat[format] = [];
          }
          byFormat[format].push(item);
        } else {
          skipped.push({ uri: childUri, name, relPath, ext: ext || '(none)', reason: 'unsupported' });
        }
      }
    }

    if (recursive && !limitReached) {
      for (const dir of subdirsToTraverse) {
        if (limitReached) break;
        await traverse(dir);
      }
    }
  }

  await traverse(folderUri);

  return {
    folderUri,
    files,
    byFormat,
    skipped,
    subfolders,
    totalFilesScanned,
    limitReached,
  };
}

module.exports = {
  scanFolder,
  hasSubfolders,
  SUPPORTED_FORMATS,
  EXTENSION_TO_FORMAT,
  DEFAULT_IGNORED_DIRS,
};
