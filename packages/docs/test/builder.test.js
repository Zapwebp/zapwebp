'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { buildDocs } = require('../src/builder');

test('Builder: executes complete build pipeline and generates all required outputs', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-docs-build-'));
  const contentDir = path.join(tmpDir, 'content');
  const distDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(contentDir, { recursive: true });

  // 1. Create content/index.md
  const indexMd = `# Getting Started\n\nCovers: quickstart.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\``;
  fs.writeFileSync(path.join(contentDir, 'index.md'), indexMd, 'utf8');

  // 2. Create content/cli.md
  const cliMd = `# CLI\n\nCovers: terminal commands.\n\n## Commands\n\n| cmd | what |\n|---|---|\n| run | start |`;
  fs.writeFileSync(path.join(contentDir, 'cli.md'), cliMd, 'utf8');

  // 3. Create nested content/plugins/vite.md
  const pluginsDir = path.join(contentDir, 'plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });
  const viteMd = `# Vite Plugin\n\nCovers: Vite integration.`;
  fs.writeFileSync(path.join(pluginsDir, 'vite.md'), viteMd, 'utf8');

  // 4. Run buildDocs
  const result = await buildDocs(
    {
      title: 'Test Docs',
      url: 'https://test.zapwebp.app',
      content: { dir: contentDir },
      output: { dir: distDir },
    },
    {},
    tmpDir
  );

  assert.equal(result.success, true);
  assert.equal(result.pageCount, 3);
  assert.ok(result.durationMs >= 0);

  // Verify HTML files exist
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'cli', 'index.html')), 'dist/cli/index.html must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'plugins', 'vite', 'index.html')), 'dist/plugins/vite/index.html must exist');

  // Verify .md mirrors exist and are byte-exact to sources
  assert.ok(fs.existsSync(path.join(distDir, 'index.md')), 'dist/index.md must exist');
  assert.equal(fs.readFileSync(path.join(distDir, 'index.md'), 'utf8'), indexMd);

  assert.ok(fs.existsSync(path.join(distDir, 'cli.md')), 'dist/cli.md must exist');
  assert.equal(fs.readFileSync(path.join(distDir, 'cli.md'), 'utf8'), cliMd);

  assert.ok(fs.existsSync(path.join(distDir, 'plugins', 'vite.md')), 'dist/plugins/vite.md must exist');
  assert.equal(fs.readFileSync(path.join(distDir, 'plugins', 'vite.md'), 'utf8'), viteMd);

  // Verify HTML content structure
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('<!doctype html>'));
  assert.ok(indexHtml.includes('<title>Test Docs</title>'));
  assert.ok(indexHtml.includes('<link rel="canonical" href="https://test.zapwebp.app">'));
  assert.ok(indexHtml.includes('<link rel="alternate" type="text/markdown" href="/index.md">'));
  assert.ok(indexHtml.includes('"@type": "TechArticle"'));

  const cliHtml = fs.readFileSync(path.join(distDir, 'cli', 'index.html'), 'utf8');
  assert.ok(cliHtml.includes('<title>CLI — Test Docs</title>'));
  assert.ok(cliHtml.includes('<link rel="canonical" href="https://test.zapwebp.app/cli">'));
  assert.ok(cliHtml.includes('<link rel="alternate" type="text/markdown" href="/cli.md">'));
  assert.ok(cliHtml.includes('<div class="table-wrap"><table>'));

  // Verify manifests and search index
  assert.ok(fs.existsSync(path.join(distDir, 'llms.txt')), 'dist/llms.txt must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'llms-full.txt')), 'dist/llms-full.txt must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'sitemap.xml')), 'dist/sitemap.xml must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'robots.txt')), 'dist/robots.txt must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'agent.json')), 'dist/agent.json must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'search-index.json')), 'dist/search-index.json must exist');

  // Verify assets copied
  assert.ok(fs.existsSync(path.join(distDir, 'docs.css')), 'dist/docs.css must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'docs.js')), 'dist/docs.js must exist');
});
