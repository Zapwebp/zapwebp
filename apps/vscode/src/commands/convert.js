'use strict';

const vscode = require('vscode');
const { convertBuffer } = require('../core');
const { readConfig } = require('../config');
const { showSuccess, showError } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

/**
 * Derives a sibling URI with the new file extension in the same directory.
 * @param {vscode.Uri} uri - Source file URI.
 * @param {string} ext - Target extension (e.g. 'webp', 'png').
 * @returns {vscode.Uri}
 */
function siblingUri(uri, ext) {
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
  const parts = uri.path.split('/');
  const filename = parts.pop();
  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  parts.push(`${base}.${normalizedExt}`);
  return uri.with({ path: parts.join('/') });
}

/**
 * Registers the 'zapwebp.convert' command in the extension context.
 * @param {vscode.ExtensionContext} context
 */
function registerConvertCommand(context) {
  const cmd = vscode.commands.registerCommand('zapwebp.convert', async (uri, uris) => {
    let targets = [];

    if (Array.isArray(uris) && uris.length > 0) {
      targets = uris;
    } else if (uri) {
      targets = [uri];
    } else {
      const selected = await vscode.window.showOpenDialog({
        canSelectMany: true,
        filters: { Images: ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif'] },
      });
      if (selected && selected.length > 0) {
        targets = selected;
      }
    }

    if (targets.length === 0) return;

    const config = readConfig();
    let totalSaved = 0;
    let count = 0;
    let lastDetails = null;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Zapwebp',
        cancellable: false,
      },
      async (progress) => {
        for (const fileUri of targets) {
          const filename = fileUri.path.split('/').pop();
          progress.report({ message: filename });

          try {
            const outUri = siblingUri(fileUri, config.outputExtension);
            if (outUri.path === fileUri.path) {
              throw new Error('Output cannot overwrite its input source file.');
            }

            const bytes = await vscode.workspace.fs.readFile(fileUri);
            const out = await convertBuffer(
              bytes,
              config.outputExtension,
              config.baseWidth,
              config.quality,
              config.clean
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
  });

  context.subscriptions.push(cmd);
}

module.exports = {
  registerConvertCommand,
  siblingUri,
};
