'use strict';

const vscode = require('vscode');
const { convertBuffer } = require('../core');
const { readConfig } = require('../config');
const { showSuccess, showError } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

const SUPPORTED_INPUT_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tif', 'tiff'];

/**
 * Derives a sibling URI with the new file extension in the same directory.
 * @param {vscode.Uri} uri - Source file URI.
 * @param {string} ext - Target extension (e.g. 'webp', 'png', 'avif', 'jpeg').
 * @returns {vscode.Uri}
 */
function siblingUri(uri, ext) {
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext.replace(/^\./, '');
  const parts = uri.path.split('/');
  const filename = parts.pop();
  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  parts.push(`${base}.${normalizedExt}`);
  return uri.with({ path: parts.join('/') });
}

/**
 * Resolves conversion target URIs from command context, active editor, or open dialog.
 * @param {vscode.Uri} [uri]
 * @param {vscode.Uri[]} [uris]
 * @returns {Promise<vscode.Uri[]>}
 */
async function resolveTargets(uri, uris) {
  if (Array.isArray(uris) && uris.length > 0) return uris;
  if (uri) return [uri];

  if (vscode.window.activeTextEditor?.document?.uri) {
    const activeUri = vscode.window.activeTextEditor.document.uri;
    const ext = activeUri.path.split('.').pop()?.toLowerCase();
    if (SUPPORTED_INPUT_EXTENSIONS.includes(ext)) {
      return [activeUri];
    }
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    filters: { Images: SUPPORTED_INPUT_EXTENSIONS },
  });

  return selected && selected.length > 0 ? selected : [];
}

/**
 * Executes batch conversion to a specified target format.
 * @param {vscode.Uri[]} targets
 * @param {'webp'|'png'|'avif'|'jpeg'} targetFormat
 * @param {object} [options]
 */
async function executeBatchConvert(targets, targetFormat = 'webp', options = {}) {
  if (!targets || targets.length === 0) return;

  const config = readConfig();
  const format = targetFormat || config.outputExtension || 'webp';
  let background = options.background;

  if (format === 'jpeg' && !background) {
    background = '#ffffff';
  }

  let totalSaved = 0;
  let count = 0;
  let lastDetails = null;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Zapwebp (${format.toUpperCase()})`,
      cancellable: false,
    },
    async (progress) => {
      for (const fileUri of targets) {
        const filename = fileUri.path.split('/').pop();
        progress.report({ message: filename });

        try {
          const outUri = siblingUri(fileUri, format);
          if (outUri.path === fileUri.path) {
            throw new Error(`Output (${format}) cannot overwrite its input source file.`);
          }

          const bytes = await vscode.workspace.fs.readFile(fileUri);
          const out = await convertBuffer(
            bytes,
            format,
            config.baseWidth,
            config.quality,
            config.clean,
            background
          );

          await vscode.workspace.fs.writeFile(outUri, out);
          const saved = bytes.byteLength - out.byteLength;
          totalSaved += Math.max(0, saved);
          count++;

          lastDetails = {
            filename: outUri.path.split('/').pop(),
            sourceSize: bytes.byteLength,
            outputSize: out.byteLength,
          };

          statusBar.log(`Converted ${filename} -> ${lastDetails.filename} (${out.byteLength} bytes)`);
        } catch (err) {
          statusBar.log(`Error converting ${filename}: ${err.message}`);
          showError(fileUri, err);
        }
      }
    }
  );

  if (count > 0) {
    statusBar.increment(count, totalSaved);
    showSuccess(count, totalSaved, lastDetails);
  }
}

/**
 * Registers all conversion commands in the extension context.
 * @param {vscode.ExtensionContext} context
 */
function registerConvertCommand(context) {
  // 1. Default Convert (Zap to WebP)
  const cmdConvert = vscode.commands.registerCommand('zapwebp.convert', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    const config = readConfig();
    await executeBatchConvert(targets, config.outputExtension || 'webp');
  });

  // 2. Direct to PNG
  const cmdPng = vscode.commands.registerCommand('zapwebp.convertToPng', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    await executeBatchConvert(targets, 'png');
  });

  // 3. Direct to AVIF
  const cmdAvif = vscode.commands.registerCommand('zapwebp.convertToAvif', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    await executeBatchConvert(targets, 'avif');
  });

  // 4. Direct to JPEG (with optional background prompt)
  const cmdJpeg = vscode.commands.registerCommand('zapwebp.convertToJpeg', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;

    const bg = await vscode.window.showInputBox({
      prompt: 'JPEG cannot store transparency. Flatten background color:',
      value: '#ffffff',
      placeHolder: '#ffffff',
    });
    if (bg === undefined) return; // User cancelled

    await executeBatchConvert(targets, 'jpeg', { background: bg || '#ffffff' });
  });

  // 5. Interactive Format Prompt (QuickPick)
  const cmdPrompt = vscode.commands.registerCommand('zapwebp.convertPrompt', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;

    const picked = await vscode.window.showQuickPick(
      [
        {
          label: '$(zap) WebP',
          description: 'Recommended • High compression, alpha transparency preserved',
          format: 'webp',
        },
        {
          label: '$(file-media) PNG',
          description: 'Lossless • Perfect alpha retention, maximum compatibility',
          format: 'png',
        },
        {
          label: '$(sparkle) AVIF',
          description: 'Next-Gen • Extreme compression, modern web standard',
          format: 'avif',
        },
        {
          label: '$(file-binary) JPEG',
          description: 'Photographic • Universal compatibility (flattens transparency)',
          format: 'jpeg',
        },
      ],
      {
        placeHolder: 'Select target format for image conversion',
      }
    );

    if (!picked) return;

    let background;
    if (picked.format === 'jpeg') {
      background = await vscode.window.showInputBox({
        prompt: 'JPEG cannot store transparency. Flatten background color:',
        value: '#ffffff',
        placeHolder: '#ffffff',
      });
      if (background === undefined) return;
    }

    await executeBatchConvert(targets, picked.format, { background });
  });

  context.subscriptions.push(cmdConvert);
  context.subscriptions.push(cmdPng);
  context.subscriptions.push(cmdAvif);
  context.subscriptions.push(cmdJpeg);
  context.subscriptions.push(cmdPrompt);
}

module.exports = {
  registerConvertCommand,
  executeBatchConvert,
  resolveTargets,
  siblingUri,
  SUPPORTED_INPUT_EXTENSIONS,
};
