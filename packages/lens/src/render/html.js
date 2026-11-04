'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

async function openHtml(res, bytesA, bytesB, fileA, fileB) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'zapwebp-lens-'));
  const htmlPath = path.join(dir, 'comparison.html');
  const b64A = Buffer.from(bytesA).toString('base64');
  const b64B = bytesB ? Buffer.from(bytesB).toString('base64') : null;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Zapwebp Lens — ${fileA}</title>
  <style>
    :root { --bg: #f7f7f4; --ink: #20211f; --green: #c7f36b; --muted: #85877e; --line: #e7e8e1; }
    body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--ink); margin: 0; padding: 40px; }
    .container { max-width: 960px; margin: 0 auto; }
    .grid { display: grid; grid-template-columns: ${b64B ? '1fr 1fr' : '1fr'}; gap: 24px; margin-top: 24px; }
    .card { background: #fff; border-radius: 12px; border: 1px solid var(--line); overflow: hidden; padding: 16px; }
    .checkerboard {
      min-height: 240px; display: flex; align-items: center; justify-content: center;
      background-image: linear-gradient(45deg, var(--line) 25%, transparent 25%), linear-gradient(-45deg, var(--line) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--line) 75%), linear-gradient(-45deg, transparent 75%, var(--line) 75%);
      background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    img { max-width: 100%; max-height: 300px; display: block; object-fit: contain; }
    .meta { margin-top: 12px; font-size: 14px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background: var(--green); font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Zapwebp Lens Inspector</h1>
    <div class="grid">
      <div class="card">
        <h3>${fileA}</h3>
        <div class="checkerboard">
          <img src="data:image/png;base64,${b64A}" alt="${fileA}">
        </div>
        <div class="meta">
          <p><strong>Size:</strong> ${bytesA.length} bytes</p>
          <p><strong>Format:</strong> ${(res.formatA || res.format || '').toUpperCase()}</p>
        </div>
      </div>
      ${b64B ? `
      <div class="card">
        <h3>${fileB}</h3>
        <div class="checkerboard">
          <img src="data:image/webp;base64,${b64B}" alt="${fileB}">
        </div>
        <div class="meta">
          <p><strong>Size:</strong> ${bytesB.length} bytes</p>
          <p><strong>Alpha:</strong> <span class="tag">Preserved</span></p>
        </div>
      </div>` : ''}
    </div>
  </div>
</body>
</html>`;

  await fs.writeFile(htmlPath, html, 'utf8');

  // Launch non-blocking browser
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    spawn(cmd, [htmlPath], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Ignore spawn failures in headless environments
  }
  return htmlPath;
}

module.exports = { openHtml };
