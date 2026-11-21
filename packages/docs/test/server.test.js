'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { serveDocs } = require('../src/server');

test('Server: serves static files and resolves clean URLs', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-docs-server-'));
  fs.writeFileSync(path.join(tmpDir, 'index.html'), '<h1>Home</h1>', 'utf8');

  const cliDir = path.join(tmpDir, 'cli');
  fs.mkdirSync(cliDir, { recursive: true });
  fs.writeFileSync(path.join(cliDir, 'index.html'), '<h1>CLI</h1>', 'utf8');

  fs.writeFileSync(path.join(tmpDir, 'cli.md'), '# CLI Source', 'utf8');

  const instance = await serveDocs({ dir: tmpDir, port: 0 });
  const baseUrl = instance.url;

  try {
    // 1. Fetch root /
    const resHome = await fetch(`${baseUrl}/`);
    assert.equal(resHome.status, 200);
    assert.ok(resHome.headers.get('content-type')?.includes('text/html'));
    const textHome = await resHome.text();
    assert.equal(textHome, '<h1>Home</h1>');

    // 2. Fetch clean URL /cli (should resolve to /cli/index.html)
    const resCli = await fetch(`${baseUrl}/cli`);
    assert.equal(resCli.status, 200);
    assert.ok(resCli.headers.get('content-type')?.includes('text/html'));
    const textCli = await resCli.text();
    assert.equal(textCli, '<h1>CLI</h1>');

    // 3. Fetch .md mirror
    const resMd = await fetch(`${baseUrl}/cli.md`);
    assert.equal(resMd.status, 200);
    assert.ok(resMd.headers.get('content-type')?.includes('text/markdown'));
    const textMd = await resMd.text();
    assert.equal(textMd, '# CLI Source');

    // 4. Fetch missing file -> 404
    const res404 = await fetch(`${baseUrl}/missing-file-404`);
    assert.equal(res404.status, 404);
  } finally {
    await instance.close();
  }
});
