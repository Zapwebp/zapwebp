'use strict';

const vscode = require('vscode');
const { init } = require('./core');
const { registerConvertCommand } = require('./commands/convert');
const { registerConvertScalesCommand } = require('./commands/convert-scales');
const { registerHoverProvider } = require('./hover/provider');
const { registerOnSaveWatcher } = require('./watcher/on-save');
const { statusBar } = require('./ui/status-bar');

/**
 * Activates the Zapwebp VS Code extension.
 * Sets up Explorer context menus, multi-scale commands, hover previews,
 * debounced convert-on-save watcher, and status bar metrics.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Initialize the engine asynchronously
  init().catch((err) => {
    statusBar.log(`Engine initialization error: ${err.message}`);
  });

  registerConvertCommand(context);
  registerConvertScalesCommand(context);
  registerHoverProvider(context);
  registerOnSaveWatcher(context);

  const showOutputCmd = vscode.commands.registerCommand('zapwebp.showOutput', () => {
    statusBar.showOutput();
  });
  context.subscriptions.push(showOutputCmd);

  context.subscriptions.push(statusBar);

  vscode.window.showInformationMessage('Zapwebp is ready. Right-click an image in the Explorer.');
}

/**
 * Deactivates the extension and disposes status bar resources.
 */
function deactivate() {
  statusBar.dispose();
}

module.exports = {
  activate,
  deactivate,
};
