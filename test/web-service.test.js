'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

test('Web Service Foundation: Complete decoupling from Kite toolkit', () => {
  // 1. Kite vendor binary must not exist in public service tree
  const kiteVendor = path.join(publicDir, 'vendor', 'kite.min.js');
  assert.equal(fs.existsSync(kiteVendor), false, 'public/vendor/kite.min.js must be removed from web service');

  // 2. Root package.json must not declare @kitelet/core as dependency
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const deps = pkg.dependencies || {};
  assert.equal(deps['@kitelet/core'], undefined, 'Root package.json must not depend on @kitelet/core');

  // 3. index.html must load production-grade Web Components foundation
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('kite.min.js'), false, 'index.html must not include kite.min.js');
  assert.ok(indexHtml.includes('/vendor/zapwebp-ui.min.js'), 'index.html must load @zapwebp/ui Web Components foundation');
  assert.ok(indexHtml.includes('/tokens.css'), 'index.html must link tokens.css design system tokens');
});

test('Web Service Foundation: Docs site preservation', () => {
  // Docs site must continue using Kite without breaking changes
  const docsPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'zapwebp-docs', 'package.json'), 'utf8'));
  assert.ok(docsPkg.dependencies && docsPkg.dependencies['@kitelet/core'], 'zapwebp-docs must preserve @kitelet/core');

  // Docs bundle must exist
  const docsBundle = path.join(publicDir, 'docs.js');
  assert.ok(fs.existsSync(docsBundle), 'public/docs.js must exist for docs delivery');
});

test('Web Service Foundation: Production Web Components suite and state store', () => {
  const uiBundle = path.join(publicDir, 'vendor', 'zapwebp-ui.min.js');
  assert.ok(fs.existsSync(uiBundle), 'public/vendor/zapwebp-ui.min.js must be built');
  const bundleContent = fs.readFileSync(uiBundle, 'utf8');
  assert.ok(bundleContent.length > 10000, 'UI bundle must contain complete component library');
  assert.ok(bundleContent.includes('zap-toast'), 'Bundle must declare zap-toast');
  assert.ok(bundleContent.includes('zap-banner'), 'Bundle must declare zap-banner');
  assert.ok(bundleContent.includes('zap-modal'), 'Bundle must declare zap-modal');
  assert.ok(bundleContent.includes('zap-dropzone'), 'Bundle must declare zap-dropzone');

  // Core state store from @zapwebp/ui
  const { createZapStore, resolveError, formatBytes } = require('../packages/ui/src/index');
  const store = createZapStore({ targetFormat: 'webp' });
  assert.equal(store.getState().status, 'idle');
  assert.equal(store.getState().targetFormat, 'webp');

  // Error resolution
  const err = resolveError('E_UNSAFE_SVG');
  assert.equal(err.code, 'E_UNSAFE_SVG');
  assert.ok(err.fix.length > 0);

  // Formatting utility
  assert.equal(formatBytes(1024), '1 KB');
});

test('Web Service Foundation: HTTP endpoints and SEO routing parity', () => {
  const serverSource = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');

  // All 7 SEO landing routes must be served
  const requiredRoutes = [
    '/svg-to-webp',
    '/png-to-webp',
    '/jpg-to-webp',
    '/webp-to-png',
    '/svg-to-png',
    '/png-to-avif',
    '/avif-to-webp',
  ];

  for (const route of requiredRoutes) {
    assert.ok(serverSource.includes(`'${route}'`), `server.js must define SEO route ${route}`);
  }

  // Tokens endpoint
  assert.ok(serverSource.includes('/tokens.css'), 'server.js must route /tokens.css');

  // Docs redirection
  assert.ok(serverSource.includes('https://zapwebp-docs.vercel.app'), 'server.js must redirect docs routes to docs domain');
});
