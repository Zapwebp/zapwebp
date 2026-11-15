'use strict';

const vscode = require('vscode');
const { scanFolder, hasSubfolders } = require('../folder/scan');
const { openFolderPanel } = require('../folder/panel');
const { convertFolder } = require('../folder/convert');
const { formatBytes } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

/**
 * Resolves the target folder URI from command arguments, active editor, or open dialog.
 * @param {vscode.Uri} [uri]
 * @returns {Promise<vscode.Uri|null>}
 */
async function resolveFolderUri(uri) {
  if (uri && uri.path) {
    return uri;
  }

  if (vscode.window.activeTextEditor?.document?.uri) {
    const docUri = vscode.window.activeTextEditor.document.uri;
    const parts = docUri.path.split('/');
    parts.pop();
    return docUri.with({ path: parts.join('/') });
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Select Folder to Zap',
  });

  return selected && selected.length > 0 ? selected[0] : null;
}

/**
 * Returns single-format QuickPick choices.
 * @param {string} format - Detected source format.
 * @returns {Array<{ label: string, format: string, scales?: boolean, description?: string }>}
 */
function getSingleFormatChoices(format) {
  const norm = format.toLowerCase();
  if (norm === 'svg') {
    return [
      { label: 'WebP (Recommended)', format: 'webp', scales: false, description: 'Single WebP output' },
      { label: 'Multi-Scale (@1x, @2x, @3x)', format: 'webp', scales: true, description: 'WebP retina variants' },
      { label: 'AVIF', format: 'avif', scales: false, description: 'Next-gen AVIF output' },
      { label: 'PNG', format: 'png', scales: false, description: 'Lossless raster with alpha' },
      { label: 'JPEG', format: 'jpeg', scales: false, description: 'Flattened white background' },
    ];
  }

  const choices = [
    { label: 'WebP (Recommended)', format: 'webp', scales: false },
    { label: 'AVIF', format: 'avif', scales: false },
    { label: 'PNG', format: 'png', scales: false },
    { label: 'JPEG', format: 'jpeg', scales: false },
  ];

  return choices.filter((c) => c.format !== norm);
}

/**
 * Handles the complete folder conversion workflow.
 * @param {vscode.ExtensionContext} context
 * @param {vscode.Uri} [folderUri]
 * @param {object} [options]
 * @param {boolean} [options.forcePanel=false]
 */
async function handleFolderConversion(context, folderUri, options = {}) {
  const targetFolder = await resolveFolderUri(folderUri);
  if (!targetFolder) return;

  // Flow C: Subfolders opt-in check
  let recursive = false;
  const subfoldersExist = await hasSubfolders(targetFolder);
  if (subfoldersExist) {
    const scope = await vscode.window.showQuickPick(
      [
        { label: '$(folder) Scan this folder only', description: 'Convert images in root folder only', recursive: false },
        { label: '$(file-submodule) Include subfolders', description: 'Recursively scan and convert nested subfolders', recursive: true },
      ],
      { placeHolder: 'Subfolders detected. Select folder conversion scope:' }
    );
    if (!scope) return; // User cancelled
    recursive = scope.recursive;
  }

  const scanResult = await scanFolder(targetFolder, { recursive });

  if (scanResult.files.length === 0) {
    vscode.window.showInformationMessage('No supported images found in folder.');
    return;
  }

  if (scanResult.limitReached) {
    vscode.window.showWarningMessage('Folder scan reached maximum limit of 500 files. Only the first 500 files will be processed.');
  }

  const formats = Object.keys(scanResult.byFormat);
  let configs = null;

  // Flow A: Single format and not forced panel
  if (formats.length === 1 && !options.forcePanel) {
    const singleFormat = formats[0];
    const items = getSingleFormatChoices(singleFormat);
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${scanResult.files.length} ${singleFormat.toUpperCase()} files. Convert to:`,
    });
    if (!selected) return; // User cancelled

    configs = [
      {
        sourceFormat: singleFormat,
        targetFormat: selected.format,
        scales: Boolean(selected.scales),
      },
    ];
  } else {
    // Flow B: Mixed formats or user explicitly requested format panel
    configs = await openFolderPanel(context, scanResult);
    if (!configs || configs.length === 0) return; // User cancelled
  }

  const summary = await convertFolder(scanResult, configs);

  // Update status bar counters
  statusBar.count += summary.converted;
  statusBar.bytesSaved += summary.savedBytes;
  statusBar.refresh();

  // Log detailed audit to output channel
  statusBar.log(`=== Zap Folder Summary: ${targetFolder.path} ===`);
  statusBar.log(`Total scanned: ${scanResult.totalFilesScanned} | Converted: ${summary.converted} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`);
  statusBar.log(`Bytes In: ${formatBytes(summary.bytesIn)} | Bytes Out: ${formatBytes(summary.bytesOut)} | Saved: ${formatBytes(summary.savedBytes)}`);

  if (summary.convertedFiles.length > 0) {
    statusBar.log('Converted files:');
    for (const f of summary.convertedFiles) {
      statusBar.log(`  ✔ ${f.name} -> ${f.target} (${formatBytes(f.sourceSize)} -> ${formatBytes(f.outputSize)})`);
    }
  }

  if (summary.failedFiles.length > 0) {
    statusBar.log('Failed files:');
    for (const f of summary.failedFiles) {
      statusBar.log(`  ✖ ${f.name}: ${f.error}`);
    }
  }

  if (summary.skippedFiles.length > 0) {
    statusBar.log('Skipped unsupported files:');
    for (const f of summary.skippedFiles) {
      statusBar.log(`  - ${f.name} (${f.reason})`);
    }
  }

  // User toast summary notification
  const savedStr = summary.savedBytes > 0 ? ` (saved ${formatBytes(summary.savedBytes)})` : '';
  const skippedStr = summary.skipped > 0 ? ` ${summary.skipped} unsupported file${summary.skipped === 1 ? '' : 's'} skipped.` : '';
  const message = `✅ Zap Folder: ${summary.converted} file${summary.converted === 1 ? '' : 's'} converted${savedStr}.${skippedStr}`;

  const action = await vscode.window.showInformationMessage(message, 'Show Details');
  if (action === 'Show Details') {
    statusBar.showOutput();
  }

  return summary;
}

/**
 * Registers `zapwebp.zapFolder` and `zapwebp.zapPanel` commands in VS Code context.
 * @param {vscode.ExtensionContext} context
 */
function registerFolderCommands(context) {
  const zapFolderCmd = vscode.commands.registerCommand('zapwebp.zapFolder', async (uri) => {
    return handleFolderConversion(context, uri, { forcePanel: false });
  });

  const zapPanelCmd = vscode.commands.registerCommand('zapwebp.zapPanel', async (uri) => {
    return handleFolderConversion(context, uri, { forcePanel: true });
  });

  context.subscriptions.push(zapFolderCmd, zapPanelCmd);
}

module.exports = {
  registerFolderCommands,
  handleFolderConversion,
  resolveFolderUri,
  getSingleFormatChoices,
};
