'use strict';

const path = require('node:path');
let esbuild;
try {
  esbuild = require('esbuild');
} catch {
  try {
    esbuild = require('../apps/vscode/node_modules/esbuild');
  } catch {
    esbuild = require('../zapwebp-docs/node_modules/esbuild');
  }
}

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'zapwebp-docs', 'src', 'main.ts');
const outfile = path.join(root, 'public', 'docs.js');

try {
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    outfile,
    minify: true,
  });
  console.log(`[build:docs] Successfully bundled ${outfile}`);
} catch (err) {
  console.error('[build:docs] Failed:', err);
  process.exit(1);
}

