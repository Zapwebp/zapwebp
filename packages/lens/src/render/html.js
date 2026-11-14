'use strict';

const { spawn } = require('node:child_process');
const { safeTempWrite } = require('../safe-write');
const { LensError } = require('../errors');

/**
 * Renders and opens the single-image or comparison checkerboard viewer.
 * Uses safeTempWrite for isolated temporary file creation.
 *
 * @param {any} res - Comparison or inspect result
 * @param {Buffer} bytesA - Source image bytes
 * @param {Buffer} [bytesB] - Target comparison image bytes
 * @param {string} fileA - Source filename
 * @param {string} [fileB] - Target comparison filename
 * @param {{ open?: boolean }} [options] - Options
 * @returns {Promise<string>} Path to temporary comparison HTML file
 */
async function openHtml(res, bytesA, bytesB, fileA, fileB, options = {}) {
  const isCI = process.env.CI === 'true' || process.env.CI === '1' || process.env.GITHUB_ACTIONS === 'true';
  if (options.open && isCI) {
    throw new LensError({
      code: 'E_OPEN_IN_CI',
      message: 'Cannot open browser in CI environment.',
      fix: 'Use --json or --out instead of --open.',
    });
  }

  const b64A = Buffer.from(bytesA).toString('base64');
  const b64B = bytesB ? Buffer.from(bytesB).toString('base64') : null;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zapwebp Lens — ${escapeHtml(fileA)}</title>
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
    body { font-family: var(--font); background: var(--bg); color: var(--text); padding: 40px 24px; min-height: 100vh; }
    .container { max-width: 980px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    .brand { font-size: 1.15rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: ${b64B ? '1fr 1fr' : '1fr'}; gap: 24px; margin-top: 24px; }
    .card { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; padding: 20px; }
    .card-title { font-size: 0.95rem; font-weight: 700; font-family: var(--mono); margin-bottom: 14px; word-break: break-all; }
    .checkerboard {
      min-height: 300px; display: flex; align-items: center; justify-content: center;
      background-color: #1a1d18;
      background-image:
        linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%);
      background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      border-radius: 10px;
      padding: 16px;
    }
    img { max-width: 100%; max-height: 320px; display: block; object-fit: contain; }
    .meta { margin-top: 16px; font-size: 14px; color: var(--muted); display: flex; flex-direction: column; gap: 6px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background: var(--accent-alpha); color: var(--accent); border: 1px solid rgba(141, 198, 63, 0.3); font-size: 12px; font-weight: 700; font-family: var(--mono); }
    .footer { margin-top: 32px; text-align: center; font-size: 0.8rem; color: var(--muted); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Zapwebp Lens Inspector</div>
      <span class="tag">Read-Only Verified</span>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-title">${escapeHtml(fileA)}</div>
        <div class="checkerboard">
          <img src="data:image/png;base64,${b64A}" alt="${escapeHtml(fileA)}">
        </div>
        <div class="meta">
          <p><strong>Size:</strong> ${bytesA.length.toLocaleString()} bytes</p>
          <p><strong>Format:</strong> ${(res.formatA || res.format || '').toUpperCase()}</p>
        </div>
      </div>
      ${b64B ? `
      <div class="card">
        <div class="card-title">${escapeHtml(fileB)}</div>
        <div class="checkerboard">
          <img src="data:image/webp;base64,${b64B}" alt="${escapeHtml(fileB)}">
        </div>
        <div class="meta">
          <p><strong>Size:</strong> ${bytesB.length.toLocaleString()} bytes</p>
          <p><strong>Alpha:</strong> <span class="tag">Preserved</span></p>
        </div>
      </div>` : ''}
    </div>
    <div class="footer">Zapwebp Lens · Zero-Telemetry · Memory-Only Execution · Read-Only Guaranteed</div>
  </div>
</body>
</html>`;

  const htmlPath = await safeTempWrite('comparison.html', html);

  if (options.open && !isCI) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    try {
      spawn(cmd, [htmlPath], { detached: true, stdio: 'ignore' }).unref();
    } catch {
      // Ignore spawn failures in headless environments
    }
  }
  return htmlPath;
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

module.exports = { openHtml };
