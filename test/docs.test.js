'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contentDir = path.resolve(__dirname, '../content');
const pages = [
  'index',
  'convert',
  'cli',
  'mcp',
  'clean',
  'lock-target',
  'backgrounds',
  'policy',
  'formats',
  'safety',
  'errors',
  'api',
  'developers',
  'about',
  'privacy',
  'terms',
  'security',
  'code-of-conduct',
  'contributing',
  'translators',
  'plugins/vite',
  'plugins/next',
  'plugins/github-action',
  'plugins/storage',
  'plugins/vscode',
  'plugins/laravel',
  'plugins/lens',
  'plugins/crop',
  'sdk/core',
  'sdk/plugin',
  'ui',
  'sdk/ui',
  'sdk/cli',
  'sdk/storage',
  'sdk/edge',
];

test('Agentic docs validation: all content pages follow the strict template', () => {
  for (const page of pages) {
    const file = path.join(contentDir, `${page}.md`);
    assert.ok(fs.existsSync(file), `content/${page}.md must exist`);
    const md = fs.readFileSync(file, 'utf8');

    // 1. H1 title
    assert.match(md, /^# [^\n]+/, `${page}.md must start with H1`);

    // 2. Scope block
    assert.match(md, /Covers:\s+[^\n]+/, `${page}.md must declare Covers:`);
    assert.match(md, /Does not cover:\s+[^\n]+/, `${page}.md must declare Does not cover:`);
    assert.match(md, /Applies to:\s+[^\n]+/, `${page}.md must declare Applies to:`);

    // 3. Quick start
    assert.ok(md.includes('## Quick start'), `${page}.md must have ## Quick start`);

    // 4. What it does
    assert.ok(md.includes('## What it does'), `${page}.md must have ## What it does`);

    // 5. Errors
    assert.ok(md.includes('## Errors'), `${page}.md must have ## Errors`);

    // 6. For agents structured JSON block
    assert.ok(md.includes('## For agents'), `${page}.md must have ## For agents`);
    assert.match(md, /```json[\s\S]*?```/, `${page}.md must contain a JSON block under ## For agents`);

    // 7. Related
    assert.ok(md.includes('## Related'), `${page}.md must have ## Related`);
  }
});

test('public/llms.txt exists and lists all documentation routes', () => {
  const llmsFile = path.resolve(__dirname, '../public/llms.txt');
  assert.ok(fs.existsSync(llmsFile), 'public/llms.txt must exist');
  const text = fs.readFileSync(llmsFile, 'utf8');
  assert.ok(text.includes('# Zapwebp'));
  for (const page of ['convert', 'cli', 'mcp', 'clean', 'formats', 'safety', 'errors']) {
    assert.ok(text.includes(`/${page}.md`), `llms.txt must link /${page}.md`);
  }
  for (const plugin of ['vite', 'next', 'github-action', 'storage']) {
    assert.ok(text.includes(`/plugins/${plugin}.md`), `llms.txt must link /plugins/${plugin}.md`);
  }
});
