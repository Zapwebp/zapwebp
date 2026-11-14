'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { formatBytes } = require('./terminal');
const { safeTempWrite } = require('../safe-write');

/**
 * Generates a self-contained, responsive HTML report of a batch inspection.
 * Suitable for attaching as GitHub Actions PR review artifact or compliance audit.
 *
 * @param {Array<{
 *   file: string,
 *   bytes: number,
 *   format?: string,
 *   width?: number,
 *   height?: number,
 *   hasAlpha?: boolean,
 *   metadataCount?: number,
 *   chunks?: any[],
 *   previewDataUri?: string,
 *   error?: string
 * }>} records
 * @param {string} [outputPath] - Custom output file path
 * @param {{ open?: boolean }} [options] - Options
 * @returns {Promise<string>} Path to written HTML report
 */
async function generateHtmlReport(records, outputPath, options = {}) {
  const totalFiles = records.length;
  const validRecords = records.filter((r) => !r.error);
  const totalBytes = validRecords.reduce((sum, r) => sum + r.bytes, 0);
  const alphaPreservedCount = validRecords.filter((r) => r.hasAlpha).length;
  const cleanCount = validRecords.filter((r) => (r.metadataCount || 0) === 0).length;

  const rows = records.map((r, i) => {
    if (r.error) {
      return `
      <tr class="row-error">
        <td class="col-num">${i + 1}</td>
        <td class="col-preview"><div class="thumb-err">⚠️</div></td>
        <td class="col-file"><code>${escapeHtml(r.file)}</code></td>
        <td colspan="5" class="err-msg">❌ Error: ${escapeHtml(r.error)}</td>
      </tr>`;
    }

    const preview = r.previewDataUri
      ? `<img src="${r.previewDataUri}" alt="Thumbnail" class="thumb-img" />`
      : `<div class="thumb-placeholder">${(r.format || 'IMG').toUpperCase()}</div>`;

    return `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-preview"><div class="thumb-box">${preview}</div></td>
        <td class="col-file"><code>${escapeHtml(r.file)}</code></td>
        <td class="col-fmt"><span class="pill-format">${(r.format || '').toUpperCase()}</span></td>
        <td class="col-dim">${r.width || '?'} × ${r.height || '?'}</td>
        <td class="col-size">${formatBytes(r.bytes)}</td>
        <td class="col-alpha">${r.hasAlpha ? '<span class="status-yes">✅ Yes</span>' : '<span class="status-no">Opaque</span>'}</td>
        <td class="col-meta">${(r.metadataCount || 0) === 0 ? '<span class="status-clean">Clean (0)</span>' : `<span class="status-warn">⚠️ ${r.metadataCount} chunks</span>`}</td>
      </tr>
    `;
  }).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zapwebp Lens Batch Report — ${totalFiles} Files</title>
  <style>
    :root {
      --bg: #10120f;
      --bg-card: #171a15;
      --border: rgba(255, 255, 255, 0.08);
      --text: #f2f4ee;
      --muted: #9da396;
      --accent: #8dc63f;
      --accent-alpha: rgba(141, 198, 63, 0.12);
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      padding: 36px 24px;
      min-height: 100vh;
    }
    .container { max-width: 1180px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.2rem; }
    .brand svg { color: var(--accent); }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: var(--accent-alpha);
      border: 1px solid rgba(141, 198, 63, 0.3);
      color: var(--accent);
      font-family: var(--mono);
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
    }
    .stat-label { font-size: 0.75rem; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
    .stat-val { font-size: 1.5rem; font-weight: 800; font-family: var(--mono); color: var(--text); }
    .stat-val.accent { color: var(--accent); }
    .table-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left; }
    th {
      background: rgba(255, 255, 255, 0.02);
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .col-num { width: 40px; color: var(--muted); font-family: var(--mono); font-size: 0.8rem; }
    .col-preview { width: 64px; }
    .thumb-box {
      width: 48px;
      height: 48px;
      border-radius: 6px;
      background: #1a1d18;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .thumb-img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .thumb-placeholder { font-family: var(--mono); font-size: 0.65rem; color: var(--muted); font-weight: 700; }
    .thumb-err { font-size: 1.1rem; }
    .col-file code { font-family: var(--mono); font-size: 0.85rem; color: #a6e22e; }
    .pill-format {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      font-family: var(--mono);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .status-yes { color: var(--accent); font-weight: 600; }
    .status-no { color: var(--muted); }
    .status-clean { color: var(--accent); font-family: var(--mono); font-size: 0.8rem; }
    .status-warn { color: #f59e0b; font-family: var(--mono); font-size: 0.8rem; }
    .row-error td { background: rgba(239, 68, 68, 0.06); }
    .err-msg { color: #ef4444; font-family: var(--mono); font-size: 0.82rem; }
    .footer { margin-top: 24px; text-align: center; font-size: 0.8rem; color: var(--muted); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>Zapwebp Lens Batch Report</span>
      </div>
      <span class="badge">Deterministic Read-Only Report</span>
    </div>

    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-label">Files Analyzed</div>
        <div class="stat-val accent">${totalFiles}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Volume</div>
        <div class="stat-val">${formatBytes(totalBytes)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Alpha Preserved</div>
        <div class="stat-val">${alphaPreservedCount} / ${validRecords.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Zero-Trust Clean</div>
        <div class="stat-val accent">${cleanCount} / ${validRecords.length}</div>
      </div>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Preview</th>
            <th>File Path</th>
            <th>Format</th>
            <th>Dimensions</th>
            <th>Size</th>
            <th>Alpha Channel</th>
            <th>Metadata Safety</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Generated by <strong>zapwebp-lens</strong> · Zero-Telemetry · Memory-Only Execution · Read-Only Guaranteed
    </div>
  </div>
</body>
</html>`;

  let finalPath = outputPath;
  if (!finalPath) {
    finalPath = await safeTempWrite('lens-batch-report.html', html);
  } else {
    await fs.writeFile(path.resolve(finalPath), html, 'utf8');
  }

  return finalPath;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  generateHtmlReport,
};
