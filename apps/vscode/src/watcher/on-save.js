'use strict';

const vscode = require('vscode');
const { convertBuffer } = require('../core');
const { readConfig } = require('../config');
const { statusBar } = require('../ui/status-bar');

/**
 * Registers the convert-on-save file watcher and document save handler for SVG files.
 * Debounced to 500ms. Fails silently into the Output channel without throwing toasts.
 * @param {vscode.ExtensionContext} context
 */
function registerOnSaveWatcher(context) {
  const debounceTimers = new Map();

  const handleUri = (uri) => {
    const config = readConfig();
    if (!config.convertOnSave) return;
    if (!uri || !uri.path || !uri.path.toLowerCase().endsWith('.svg')) return;

    const key = uri.toString();
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key));
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(key);
      try {
        const latestConfig = readConfig();
        if (!latestConfig.convertOnSave) return;

        const bytes = await vscode.workspace.fs.readFile(uri);
        const out = await convertBuffer(
          bytes,
          'webp',
          latestConfig.baseWidth,
          latestConfig.quality,
          latestConfig.clean
        );

        const outUri = uri.with({ path: uri.path.replace(/\.svg$/i, '.webp') });
        await vscode.workspace.fs.writeFile(outUri, out);

        const filename = uri.path.split('/').pop();
        const outFilename = outUri.path.split('/').pop();
        statusBar.log(`[convertOnSave] Auto-converted ${filename} -> ${outFilename} (${out.byteLength} bytes)`);
        statusBar.increment(1, Math.max(0, bytes.byteLength - out.byteLength));
      } catch (err) {
        // Fails silently: logs to Output channel, no toast notification
        const filename = uri && uri.path ? uri.path.split('/').pop() : 'svg';
        statusBar.log(`[convertOnSave] Error auto-converting ${filename}: ${err.message}`);
      }
    }, 500);

    debounceTimers.set(key, timer);
  };

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.svg');
  watcher.onDidChange(handleUri);
  watcher.onDidCreate(handleUri);

  const onSaveSub = vscode.workspace.onDidSaveTextDocument((doc) => {
    if (doc && doc.uri) {
      handleUri(doc.uri);
    }
  });

  context.subscriptions.push(watcher);
  context.subscriptions.push(onSaveSub);
  context.subscriptions.push({
    dispose: () => {
      for (const t of debounceTimers.values()) {
        clearTimeout(t);
      }
      debounceTimers.clear();
    },
  });
}

module.exports = {
  registerOnSaveWatcher,
};
