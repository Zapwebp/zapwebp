'use strict';

const vscode = require('vscode');

/**
 * Formats a byte size into a human-readable string.
 * @param {number} bytes
 * @returns {string} e.g. "2.1 KB", "1.4 MB", "512 B"
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

/**
 * Shows a success toast notification.
 * @param {number} count - Number of files converted.
 * @param {number} totalSaved - Total bytes saved across conversions.
 * @param {{ filename?: string, sourceSize?: number, outputSize?: number }} [details] - Single file details.
 */
function showSuccess(count, totalSaved, details) {
  if (count === 1 && details && details.filename && details.outputSize !== undefined) {
    const saved = (details.sourceSize || 0) - details.outputSize;
    const pct = details.sourceSize && details.sourceSize > 0
      ? Math.round((saved / details.sourceSize) * 100)
      : 0;
    const pctStr = pct >= 0 ? `−${pct}%` : `+${Math.abs(pct)}%`;
    vscode.window.showInformationMessage(`✅ ${details.filename} saved (${formatBytes(details.outputSize)}, ${pctStr})`);
    return;
  }

  vscode.window.showInformationMessage(
    `✅ ${count} file${count === 1 ? '' : 's'} converted (${formatBytes(totalSaved)} saved)`
  );
}

/**
 * Shows an actionable error toast notification.
 * @param {vscode.Uri} uri - Source file URI.
 * @param {Error|{ code?: string, message?: string }} err - Error thrown.
 */
function showError(uri, err) {
  const filename = uri && uri.path ? uri.path.split('/').pop() : 'file';
  const code = (err && err.code) || 'E_CONVERSION_FAILED';
  const message = (err && err.message) || String(err);
  
  const buttons = ['Open Docs'];
  if (code === 'E_ENGINE_UNAVAILABLE') {
    buttons.push('Copy Install Command');
  }

  const promise = vscode.window.showErrorMessage(
    `Zapwebp [${code}]: Failed to convert ${filename} — ${message}`,
    ...buttons
  );

  if (promise && typeof promise.then === 'function') {
    promise.then((selection) => {
      if (selection === 'Open Docs') {
        vscode.env.openExternal(vscode.Uri.parse(`https://zapwebp-docs.vercel.app/errors#${code.toLowerCase()}`));
      } else if (selection === 'Copy Install Command') {
        vscode.env.clipboard.writeText('npm install -g @zapwebp/cli');
        vscode.window.showInformationMessage('Copied to clipboard: npm install -g @zapwebp/cli');
      }
    });
  }
}

module.exports = {
  formatBytes,
  showSuccess,
  showError,
};
