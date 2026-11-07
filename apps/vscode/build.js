'use strict';

const path = require('node:path');
const esbuild = require('esbuild');

const workspaceRoot = path.resolve(__dirname, '../..');

async function build() {
  await esbuild.build({
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
  });

  await esbuild.build({
    absWorkingDir: workspaceRoot,
    entryPoints: ['packages/cli/bin/zap.js'],
    outfile: 'apps/vscode/dist/zap.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['@resvg/resvg-js', 'sharp'],
    alias: {
      '@zapwebp/core': path.join(workspaceRoot, 'packages/core/src/index.js'),
      '@zapwebp/shared': path.join(workspaceRoot, 'packages/shared/src/index.js'),
    },
  });
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
