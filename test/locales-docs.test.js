'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tlDocsDir = path.resolve(__dirname, '../locales/tl/docs');

const technicalPages = [
  'index',
  'convert',
  'cli',
  'mcp',
  'clean',
  'limits',
  'lock-target',
  'backgrounds',
  'policy',
  'reports',
  'smart',
  'formats',
  'safety',
  'errors',
  'api',
  'developers',
  'faq',
  'stability',
  'performance',
  'freeze',
  'deletion',
  'lossless',
  'scaffolding',
  'reliability',
  'ai-integration',
  'ui',
  'plugins/vite',
  'plugins/next',
  'plugins/github-action',
  'plugins/storage',
  'storage/supabase',
  'storage/firebase',
  'storage/neocities',
  'plugins/vscode',
  'plugins/laravel',
  'plugins/lens',
  'plugins/crop',
  'plugins/format-ico',
  'plugins/compressor',
  'plugins/lock',
  'plugins/docs',
  'sdk/core',
  'sdk/plugin',
  'sdk/ui',
  'sdk/cli',
  'sdk/storage',
  'sdk/edge',
];

const informationalPages = [
  'about',
  'privacy',
  'terms',
  'security',
  'code-of-conduct',
  'contributing',
  'translators',
];

test('Tagalog documentation validation: all technical pages follow the strict technical template', () => {
  for (const page of technicalPages) {
    const file = path.join(tlDocsDir, `${page}.md`);
    assert.ok(fs.existsSync(file), `locales/tl/docs/${page}.md must exist`);
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

test('Tagalog legal, policy, and informational documents do NOT use the technical template and follow formal structure', () => {
  for (const page of informationalPages) {
    const file = path.join(tlDocsDir, `${page}.md`);
    assert.ok(fs.existsSync(file), `locales/tl/docs/${page}.md must exist`);
    const md = fs.readFileSync(file, 'utf8');

    // 1. H1 title
    assert.match(md, /^# [^\n]+/, `${page}.md must start with H1`);

    // 2. Must NOT use the technical template scope block
    assert.ok(!md.includes('Covers:'), `${page}.md must NOT declare Covers:`);
    assert.ok(!md.includes('Does not cover:'), `${page}.md must NOT declare Does not cover:`);
    assert.ok(!md.includes('Applies to:'), `${page}.md must NOT declare Applies to:`);

    // 3. Must NOT have technical quick start
    assert.ok(!md.includes('## Quick start'), `${page}.md must NOT have ## Quick start`);

    // 4. Must NOT have technical errors block
    assert.ok(!md.includes('## Errors'), `${page}.md must NOT have ## Errors`);

    // 5. Must NOT have technical agent JSON block
    assert.ok(!md.includes('## For agents'), `${page}.md must NOT have ## For agents`);
  }
});
