'use strict';

const vscode = require('vscode');
const { convertScalesBuffer } = require('../core');
const { readConfig } = require('../config');
const { showError } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

/**
 * Registers the 'zapwebp.convertScales' command in the extension context.
 * Generates Retina scale variants (@1x, @2x, @3x) next to each source file.
 * @param {vscode.ExtensionContext} context
 */
function registerConvertScalesCommand(context) {
  const cmd = vscode.commands.registerCommand('zapwebp.convertScales', async (uri, uris) => {
    let targets = [];

    if (Array.isArray(uris) && uris.length > 0) {
      targets = uris;
    } else if (uri) {
      targets = [uri];
    } else {
      const selected = await vscode.window.showOpenDialog({
        canSelectMany: true,
        filters: { Images: ['svg', 'png'] },
      });
      if (selected && selected.length > 0) {
        targets = selected;
      }
    }

    if (targets.length === 0) return;

    const config = readConfig();
    let totalGenerated = 0;
    let successfulInputs = 0;
    let lastFilename = '';

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Zapwebp Multi-Scale',
        cancellable: false,
      },
      async (progress) => {
        for (const fileUri of targets) {
          const filename = fileUri.path.split('/').pop();
          lastFilename = filename;
          progress.report({ message: filename });

          try {
            const bytes = await vscode.workspace.fs.readFile(fileUri);
            const scaleOutputs = await convertScalesBuffer(
              bytes,
              filename,
              config.baseWidth,
              config.quality,
              config.clean
            );

            const dir = fileUri.path.substring(0, fileUri.path.lastIndexOf('/') + 1);

            for (const item of scaleOutputs) {
              const outUri = fileUri.with({ path: `${dir}${item.filename}` });
              await vscode.workspace.fs.writeFile(outUri, item.data);
              statusBar.log(`Generated ${item.filename} (${item.data.byteLength} bytes)`);
              totalGenerated++;
            }

            successfulInputs++;
          } catch (err) {
            statusBar.log(`Error generating scales for ${filename}: ${err.message}`);
            showError(fileUri, err);
          }
        }
      }
    );

    if (totalGenerated > 0) {
      statusBar.increment(totalGenerated, 0);
      if (successfulInputs === 1) {
        vscode.window.showInformationMessage(`✅ Generated @1x, @2x, @3x WebP assets for ${lastFilename}`);
      } else {
        vscode.window.showInformationMessage(`✅ Generated ${totalGenerated} scale assets across ${successfulInputs} images`);
      }
    }
  });

  context.subscriptions.push(cmd);
}

module.exports = {
  registerConvertScalesCommand,
};
