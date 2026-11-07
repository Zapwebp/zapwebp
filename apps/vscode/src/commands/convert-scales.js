'use strict';

const vscode = require('vscode');
const { convertScalesBuffer } = require('../core');
const { readConfig } = require('../config');
const { showError } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

const SUPPORTED_SCALE_INPUTS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tif', 'tiff'];

/**
 * Resolves targets for multi-scale conversion.
 * @param {vscode.Uri} [uri]
 * @param {vscode.Uri[]} [uris]
 * @returns {Promise<vscode.Uri[]>}
 */
async function resolveScaleTargets(uri, uris) {
  if (Array.isArray(uris) && uris.length > 0) return uris;
  if (uri) return [uri];

  if (vscode.window.activeTextEditor?.document?.uri) {
    const activeUri = vscode.window.activeTextEditor.document.uri;
    const ext = activeUri.path.split('.').pop()?.toLowerCase();
    if (SUPPORTED_SCALE_INPUTS.includes(ext)) {
      return [activeUri];
    }
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    filters: { Images: SUPPORTED_SCALE_INPUTS },
  });

  return selected && selected.length > 0 ? selected : [];
}

/**
 * Generates Retina scale variants (@1x, @2x, @3x) for target files in specified format.
 * @param {vscode.Uri[]} targets
 * @param {'webp'|'png'|'avif'} [format='webp']
 */
async function executeScales(targets, format = 'webp') {
  if (!targets || targets.length === 0) return;

  const config = readConfig();
  let totalGenerated = 0;
  let successfulInputs = 0;
  let lastFilename = '';

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Zapwebp Multi-Scale (${format.toUpperCase()})`,
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
            config.clean,
            format
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
      vscode.window.showInformationMessage(`✅ Generated @1x, @2x, @3x ${format.toUpperCase()} assets for ${lastFilename}`);
    } else {
      vscode.window.showInformationMessage(`✅ Generated ${totalGenerated} scale assets across ${successfulInputs} images (${format.toUpperCase()})`);
    }
  }
}

/**
 * Registers the multi-scale commands in the extension context.
 * @param {vscode.ExtensionContext} context
 */
function registerConvertScalesCommand(context) {
  // 1. Default to WebP scales
  const cmd = vscode.commands.registerCommand('zapwebp.convertScales', async (uri, uris) => {
    const targets = await resolveScaleTargets(uri, uris);
    if (targets.length === 0) return;
    await executeScales(targets, 'webp');
  });

  // 2. Interactive format selection for scales
  const cmdPrompt = vscode.commands.registerCommand('zapwebp.convertScalesPrompt', async (uri, uris) => {
    const targets = await resolveScaleTargets(uri, uris);
    if (targets.length === 0) return;

    const picked = await vscode.window.showQuickPick(
      [
        { label: '$(zap) WebP Multi-Scale', description: 'Generate @1x, @2x, @3x WebP assets', format: 'webp' },
        { label: '$(file-media) PNG Multi-Scale', description: 'Generate @1x, @2x, @3x lossless PNG assets', format: 'png' },
        { label: '$(sparkle) AVIF Multi-Scale', description: 'Generate @1x, @2x, @3x next-gen AVIF assets', format: 'avif' },
      ],
      {
        placeHolder: 'Select format for Retina multi-scale generation (@1x, @2x, @3x)',
      }
    );

    if (!picked) return;
    await executeScales(targets, picked.format);
  });

  context.subscriptions.push(cmd);
  context.subscriptions.push(cmdPrompt);
}

module.exports = {
  registerConvertScalesCommand,
  executeScales,
  resolveScaleTargets,
  SUPPORTED_SCALE_INPUTS,
};
