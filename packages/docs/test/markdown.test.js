'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderMarkdown, escapeHtml } = require('../src/markdown');

test('Markdown: renders headings with permalink anchors', () => {
  const md = `# Page Title\n\n## Quick Start\n\n### Sub Section`;
  const html = renderMarkdown(md);

  assert.ok(html.includes('<h1 id="page-title">Page Title</h1>'));
  assert.ok(html.includes('<h2 id="quick-start"><a class="header-anchor" href="#quick-start" aria-label="Permalink to Quick Start">#</a>Quick Start</h2>'));
  assert.ok(html.includes('<h3 id="sub-section"><a class="header-anchor" href="#sub-section" aria-label="Permalink to Sub Section">#</a>Sub Section</h3>'));
});

test('Markdown: renders code blocks with copy button and language identifier', () => {
  const md = ['```bash', 'npx zapwebp ./icons --to webp', '```'].join('\n');
  const html = renderMarkdown(md);

  assert.ok(html.includes('class="code-block" data-language="bash"'));
  assert.ok(html.includes('<span class="code-lang">bash</span>'));
  assert.ok(html.includes('<button class="copy-btn"'));
  assert.ok(html.includes('data-code="npx zapwebp ./icons --to webp"'));
  assert.ok(html.includes('<code class="language-bash">npx zapwebp ./icons --to webp'));
});

test('Markdown: wraps tables in responsive table-wrap containers', () => {
  const md = [
    '| Flag | Type | Description |',
    '|---|---|---|',
    '| `--to` | string | Target format |',
  ].join('\n');
  const html = renderMarkdown(md);

  assert.ok(html.includes('<div class="table-wrap"><table>'));
  assert.ok(html.includes('<th>Flag</th>'));
  assert.ok(html.includes('<td><code>--to</code></td>'));
  assert.ok(html.includes('</table></div>'));
});

test('Markdown: transforms alert blockquotes into styled callouts', () => {
  const md = '> [!WARNING]\n> Do not delete original files without backups.';
  const html = renderMarkdown(md);

  assert.ok(html.includes('class="alert alert-warning"'));
  assert.ok(html.includes('<div class="alert-title">Warning</div>'));
  assert.ok(html.includes('Do not delete original files without backups.'));
});

test('Markdown: rewrites relative .md links to clean URLs and preserves external targets', () => {
  const md = 'See [CLI Guide](./cli.md), [Root Docs](/index.md), and [External](https://example.com).';
  const html = renderMarkdown(md);

  assert.ok(html.includes('href="./cli"'));
  assert.ok(html.includes('href="/"'));
  assert.ok(html.includes('href="https://example.com" target="_blank" rel="noopener noreferrer"'));
});
