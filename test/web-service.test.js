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

test('Web Service Foundation: Custom Elements declaration and app controller integration', () => {
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

  // 1. Custom Elements in HTML shell
  assert.ok(indexHtml.includes('<zap-dropzone') && indexHtml.includes('id="dropzone"'), 'index.html must use <zap-dropzone> for dropzone');
  assert.ok(indexHtml.includes('</zap-dropzone>'), 'index.html must cleanly close </zap-dropzone>');
  assert.ok(indexHtml.includes('<zap-banner'), 'index.html must use <zap-banner> for conflict warnings');
  assert.ok(indexHtml.includes('<zap-modal') && indexHtml.includes('id="confirm-delete-modal"'), 'index.html must use <zap-modal> for confirm delete all');
  assert.ok(indexHtml.includes('<zap-modal') && indexHtml.includes('id="confirm-delete-original-modal"'), 'index.html must use <zap-modal> for confirm delete original');

  // 2. Custom Elements dynamic instantiation in app.js
  const appJs = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  assert.ok(appJs.includes("window.customElements?.get('zap-card')"), 'app.js must dynamically instantiate zap-card');
  assert.ok(appJs.includes("window.customElements?.get('zap-toast')"), 'app.js must dynamically instantiate zap-toast');
  assert.ok(appJs.includes('window.zapStore = zapStore;'), 'app.js must bridge and export reactive zapStore');
});

test('Web Service Foundation: Security headers & Zero-Telemetry compliance', () => {
  const serverSource = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');

  // HTTP Security Headers
  assert.ok(serverSource.includes("res.setHeader('X-Content-Type-Options', 'nosniff');"), 'server.js must enforce nosniff');
  assert.ok(serverSource.includes("res.setHeader('X-Frame-Options', 'SAMEORIGIN');"), 'server.js must set X-Frame-Options');
  assert.ok(serverSource.includes("res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');"), 'server.js must set Referrer-Policy');

  // Zero-telemetry audit on web client source files
  const clientFiles = ['index.html', 'app.js', 'worker.js', 'sw.js'];
  const telemetryPatterns = [
    /google-analytics/i,
    /googletagmanager/i,
    /sentry\.io/i,
    /logrocket/i,
    /segment\.io/i,
    /mixpanel/i,
    /hotjar/i,
  ];

  for (const file of clientFiles) {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of telemetryPatterns) {
      assert.equal(pattern.test(content), false, `${file} must not contain telemetry or tracking beacons (${pattern})`);
    }
  }
});

test('Web Service Foundation: End-to-end conversion engine and state machine synchronization', async () => {
  const { convertImage } = require('../packages/core/src/index');
  const { createZapStore } = require('../packages/ui/src/index');

  // Initialize store
  const store = createZapStore({ targetFormat: 'webp' });
  let stateUpdates = [];
  store.subscribe((state) => {
    stateUpdates.push({ status: state.status, count: state.convertedCount });
  });

  // Verify transition to converting
  store.setState({ status: 'converting', progress: 0 });

  // In-memory conversion with sample SVG
  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="28" fill="#8dc63f"/></svg>`;
  const result = await convertImage(Buffer.from(sampleSvg), {
    to: 'webp',
    quality: 85,
  });

  assert.ok(result.data instanceof Buffer, 'Output data must be a valid Buffer');
  assert.ok(result.size > 0, 'Converted size must be non-empty');
  assert.equal(result.format, 'webp', 'Target format must be webp');
  assert.equal(result.alphaPreserved, true, 'Alpha channel must be preserved');

  // Verify transition to done
  store.setState({
    status: 'done',
    progress: 100,
    convertedCount: 1,
    totalBytesSaved: Math.max(0, sampleSvg.length - result.size),
  });

  const finalState = store.getState();
  assert.equal(finalState.status, 'done');
  assert.equal(finalState.convertedCount, 1);
  assert.ok(stateUpdates.length >= 2, 'Store must notify subscribers on status transitions');
});
