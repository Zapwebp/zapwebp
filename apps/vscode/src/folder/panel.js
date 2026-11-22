'use strict';

const vscode = require('vscode');

/**
 * Returns candidate target formats for a given source format.
 * @param {string} sourceFormat
 * @returns {Array<{ value: string, label: string, isDefault?: boolean }>}
 */
function getTargetOptions(sourceFormat) {
  const norm = sourceFormat.toLowerCase();
  switch (norm) {
    case 'svg':
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'avif', label: 'AVIF' },
        { value: 'png', label: 'PNG' },
        { value: 'ico', label: 'ICO' },
        { value: 'jpeg', label: 'JPEG (Flatten)' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'png':
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'avif', label: 'AVIF' },
        { value: 'ico', label: 'ICO' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'jpeg':
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'avif', label: 'AVIF' },
        { value: 'png', label: 'PNG' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'webp':
      return [
        { value: 'avif', label: 'AVIF' },
        { value: 'png', label: 'PNG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'avif':
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'png', label: 'PNG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'gif':
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'png', label: 'PNG' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'tiff':
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'png', label: 'PNG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'ico':
      return [
        { value: 'png', label: 'PNG (Recommended)', isDefault: true },
        { value: 'webp', label: 'WebP' },
        { value: 'avif', label: 'AVIF' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    case 'cur':
      return [
        { value: 'png', label: 'PNG (Recommended)', isDefault: true },
        { value: 'ico', label: 'ICO' },
        { value: 'webp', label: 'WebP' },
        { value: 'skip', label: '— Skip this format —' },
      ];
    default:
      return [
        { value: 'webp', label: 'WebP (Recommended)', isDefault: true },
        { value: 'skip', label: '— Skip this format —' },
      ];
  }
}

/**
 * Generates the self-contained HTML for the Folder Conversion Webview Panel.
 * @param {import('./scan').ScanResult} scanResult
 * @returns {string}
 */
function getPanelHtml(scanResult) {
  const folderName = scanResult.folderUri.path.split('/').filter(Boolean).pop() || 'folder';
  const formats = Object.keys(scanResult.byFormat);
  const totalFiles = scanResult.files.length;
  const skippedCount = scanResult.skipped.length;

  // Group skipped by extension
  const skippedByExt = {};
  for (const item of scanResult.skipped) {
    const ext = item.ext || '(no ext)';
    skippedByExt[ext] = (skippedByExt[ext] || 0) + 1;
  }
  const skippedSummary = Object.entries(skippedByExt)
    .map(([ext, count]) => `${count} .${ext}`)
    .join(', ');

  const formatRows = formats
    .map((fmt) => {
      const items = scanResult.byFormat[fmt] || [];
      const options = getTargetOptions(fmt);
      const isVector = fmt === 'svg';

      const selectOptions = options
        .map((opt) => `<option value="${opt.value}" ${opt.isDefault ? 'selected' : ''}>${opt.label}</option>`)
        .join('');

      const scaleCheckbox = isVector
        ? `<label class="checkbox-label"><input type="checkbox" id="scales-${fmt}" /> Generate @1x, @2x, @3x</label>`
        : '<span class="text-muted">—</span>';

      return `
        <tr data-format="${fmt}">
          <td class="col-format">
            <span class="format-badge format-${fmt}">${fmt.toUpperCase()}</span>
            <span class="file-count">${items.length} file${items.length === 1 ? '' : 's'}</span>
          </td>
          <td class="col-target">
            <select id="target-${fmt}" class="vscode-select">
              ${selectOptions}
            </select>
          </td>
          <td class="col-options">
            ${scaleCheckbox}
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zap Folder: ${folderName}</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #cccccc);
      --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
      --btn-bg: var(--vscode-button-background, #007acc);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #0062a3);
      --btn-sec-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --btn-sec-fg: var(--vscode-button-secondaryForeground, #ffffff);
      --btn-sec-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
      --select-bg: var(--vscode-dropdown-background, #252526);
      --select-fg: var(--vscode-dropdown-foreground, #cccccc);
      --select-border: var(--vscode-dropdown-border, #3c3c3c);
      --border: var(--vscode-panel-border, #3c3c3c);
      --badge-bg: var(--vscode-badge-background, #4d4d4d);
      --badge-fg: var(--vscode-badge-foreground, #ffffff);
    }
    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
    }
    .header {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header p {
      margin: 0;
      color: var(--fg);
      opacity: 0.8;
      font-size: 12px;
    }
    .badge-bar {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .badge {
      background-color: var(--badge-bg);
      color: var(--badge-fg);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-accent {
      background-color: var(--btn-bg);
      color: var(--btn-fg);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      text-align: left;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      color: var(--fg);
      opacity: 0.9;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .col-format {
      width: 25%;
    }
    .col-target {
      width: 40%;
    }
    .col-options {
      width: 35%;
    }
    .format-badge {
      display: inline-block;
      font-weight: 700;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: var(--badge-bg);
      color: var(--badge-fg);
      margin-right: 6px;
    }
    .file-count {
      opacity: 0.75;
      font-size: 12px;
    }
    .vscode-select {
      width: 100%;
      max-width: 260px;
      background: var(--select-bg);
      color: var(--select-fg);
      border: 1px solid var(--select-border);
      padding: 6px 10px;
      border-radius: 3px;
      font-family: inherit;
      font-size: 12px;
      outline: none;
    }
    .vscode-select:focus {
      border-color: var(--btn-bg);
    }
    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .text-muted {
      opacity: 0.4;
    }
    .skipped-box {
      background-color: rgba(127, 127, 127, 0.08);
      border: 1px dashed var(--border);
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .skipped-box summary {
      cursor: pointer;
      font-weight: 600;
      outline: none;
    }
    .skipped-details {
      margin-top: 8px;
      opacity: 0.85;
      line-height: 1.6;
    }
    .footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 8px;
    }
    button {
      padding: 8px 18px;
      border: none;
      border-radius: 3px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-secondary {
      background-color: var(--btn-sec-bg);
      color: var(--btn-sec-fg);
    }
    .btn-secondary:hover {
      background-color: var(--btn-sec-hover);
    }
    .btn-primary {
      background-color: var(--btn-bg);
      color: var(--btn-fg);
    }
    .btn-primary:hover {
      background-color: var(--btn-hover);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ Zap Folder: <code>${escapeHtml(folderName)}</code></h1>
    <p>Convert images across multiple formats in one action. Transparency is preserved and original files are never overwritten.</p>
    <div class="badge-bar">
      <span class="badge badge-accent">${totalFiles} convertible images</span>
      <span class="badge">${formats.length} formats</span>
      ${skippedCount > 0 ? `<span class="badge">${skippedCount} skipped (unsupported)</span>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Source Format</th>
        <th>Target Format</th>
        <th>Options</th>
      </tr>
    </thead>
    <tbody>
      ${formatRows}
    </tbody>
  </table>

  ${skippedCount > 0 ? `
  <details class="skipped-box">
    <summary>ℹ️ ${skippedCount} unsupported file${skippedCount === 1 ? '' : 's'} will be skipped</summary>
    <div class="skipped-details">
      Found: ${escapeHtml(skippedSummary)}.<br />
      These files are not image assets and will remain untouched in their original directories.
    </div>
  </details>
  ` : ''}

  <div class="footer-actions">
    <button id="btn-cancel" class="btn-secondary">Cancel</button>
    <button id="btn-convert" class="btn-primary">Convert All (${totalFiles} files)</button>
  </div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      const formats = ${JSON.stringify(formats)};

      document.getElementById('btn-cancel').addEventListener('click', () => {
        vscode.postMessage({ command: 'cancel' });
      });

      document.getElementById('btn-convert').addEventListener('click', () => {
        const configs = [];
        for (const fmt of formats) {
          const select = document.getElementById('target-' + fmt);
          const scalesEl = document.getElementById('scales-' + fmt);
          const targetFormat = select ? select.value : 'webp';
          const scales = Boolean(scalesEl && scalesEl.checked);

          if (targetFormat && targetFormat !== 'skip') {
            configs.push({
              sourceFormat: fmt,
              targetFormat,
              scales,
            });
          }
        }
        vscode.postMessage({ command: 'convert', configs });
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Escapes characters for HTML safe interpolation.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Opens a webview panel to configure targets for mixed format folder conversion.
 * @param {vscode.ExtensionContext} context
 * @param {import('./scan').ScanResult} scanResult
 * @returns {Promise<Array<{ sourceFormat: string, targetFormat: string, scales?: boolean }> | null>}
 */
function openFolderPanel(context, scanResult) {
  return new Promise((resolve) => {
    let resolved = false;
    const folderName = scanResult.folderUri.path.split('/').filter(Boolean).pop() || 'folder';

    const panel = vscode.window.createWebviewPanel(
      'zapwebpFolder',
      `Zap Folder: ${folderName}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getPanelHtml(scanResult);

    panel.webview.onDidReceiveMessage((message) => {
      if (message && message.command === 'convert') {
        resolved = true;
        panel.dispose();
        resolve(message.configs || []);
      } else if (message && message.command === 'cancel') {
        resolved = true;
        panel.dispose();
        resolve(null);
      }
    });

    panel.onDidDispose(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    });
  });
}

module.exports = {
  getPanelHtml,
  openFolderPanel,
  getTargetOptions,
};
