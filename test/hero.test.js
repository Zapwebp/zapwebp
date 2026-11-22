'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Hero Landing Page: hero.html exists and conforms to specifications', () => {
  const heroPath = path.join(root, 'zapwebp-docs', 'public', 'hero.html');
  assert.ok(fs.existsSync(heroPath), 'zapwebp-docs/public/hero.html must exist');

  const content = fs.readFileSync(heroPath, 'utf8');

  // 1. Structure
  assert.ok(content.includes('<!doctype html>'), 'must declare <!doctype html>');
  assert.ok(content.includes('<html lang="en">'), 'must include <html lang="en">');
  assert.ok(content.includes('<title>Zapwebp — Convert correctly</title>'), 'must have correct title');
  assert.ok(content.includes('name="description"'), 'must include description meta');
  assert.ok(content.includes('rel="canonical"'), 'must include canonical link');
  assert.ok(content.includes('rel="alternate" type="text/markdown" href="/llms.txt"'), 'must link to /llms.txt for agents');

  // 2. Schema.org JSON-LD
  assert.ok(content.includes('SoftwareApplication'), 'must include SoftwareApplication JSON-LD schema');
  assert.ok(content.includes('Eldrex Delos Reyes Bula'), 'must declare author');

  // 3. Navigation & Actions
  assert.ok(content.includes('href="/docs"'), 'must link to /docs');
  assert.ok(content.includes('https://github.com/Zapwebp'), 'must link to GitHub');
  assert.ok(content.includes('https://zapwebp.vercel.app'), 'must link to Web Converter');

  // 4. Content Elements
  assert.ok(content.includes('Convert correctly.'), 'must include hero h1 tagline');
  assert.ok(content.includes('npx zapwebp logo.svg'), 'must include terminal quickstart code');

  // 5. Six Surface Features
  const features = ['Browser', 'Terminal', 'AI Agents', 'Build Tools', 'Storage Adapters', 'Inspector'];
  for (const f of features) {
    assert.ok(content.includes(`<h2>${f}</h2>`), `must include feature card for ${f}`);
  }

  // 6. Tokens & Dark Mode
  assert.ok(content.includes('href="/tokens.css"'), 'must link to /tokens.css');
  assert.ok(content.includes('prefers-color-scheme: dark'), 'must support dark mode');
});

test('Hero Routing: vercel.json rewrites / to /index.html and docs routes to /app.html', () => {
  const vercelPath = path.join(root, 'zapwebp-docs', 'vercel.json');
  assert.ok(fs.existsSync(vercelPath), 'zapwebp-docs/vercel.json must exist');

  const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  assert.ok(Array.isArray(config.rewrites), 'vercel.json must have rewrites array');

  const rootRewrite = config.rewrites.find((r) => r.source === '/');
  assert.ok(rootRewrite, 'must have rewrite for /');
  assert.equal(rootRewrite.destination, '/index.html', '/ must resolve to /index.html (hero landing)');

  const docsRewrite = config.rewrites.find((r) => r.source === '/docs');
  assert.ok(docsRewrite, 'must have rewrite for /docs');
  assert.equal(docsRewrite.destination, '/app.html', '/docs must rewrite to /app.html');
});

test('Docs SPA Integration: brand logo in shell links to / and router allows clean navigation', () => {
  const shellPath = path.join(root, 'zapwebp-docs', 'src', 'shell.ts');
  const shellContent = fs.readFileSync(shellPath, 'utf8');
  assert.ok(shellContent.includes('<a href="/" class="brand-link"'), 'brand link in shell must link to /');

  const routerPath = path.join(root, 'zapwebp-docs', 'src', 'router.ts');
  const routerContent = fs.readFileSync(routerPath, 'utf8');
  assert.ok(routerContent.includes("href === '/' || href === '/hero.html'"), 'router must permit native navigation to /');
});
