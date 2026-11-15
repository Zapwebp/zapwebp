'use strict';

const path = require('node:path');
let esbuild;
try {
  esbuild = require('esbuild');
} catch {
  try {
    esbuild = require('../apps/vscode/node_modules/esbuild');
  } catch {
    try {
      esbuild = require('../zapwebp-docs/node_modules/esbuild');
    } catch {
      console.warn('[build:ui] esbuild not found, skipping client UI build');
      process.exit(0);
    }
  }
}

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'packages', 'ui', 'src', 'index.js');
const outfile = path.join(root, 'public', 'vendor', 'zapwebp-ui.min.js');

try {
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    globalName: 'ZapUI',
    outfile,
    minify: true,
  });
  console.log(`[build:ui] Successfully bundled ${outfile}`);
} catch (err) {
  console.error('[build:ui] Failed:', err);
  process.exit(1);
}
