'use strict';

const path = require('node:path');
const esbuild = require('esbuild');

const workspaceRoot = path.resolve(__dirname, '../..');

esbuild.build({
  absWorkingDir: workspaceRoot,
  entryPoints: ['apps/vscode/src/extension.js'],
  outfile: 'apps/vscode/dist/extension.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['vscode', '@resvg/resvg-js', 'sharp'],
  alias: {
    '@zapwebp/core': path.join(workspaceRoot, 'packages/core/src/index.js'),
  },
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
