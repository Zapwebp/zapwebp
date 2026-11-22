'use strict';

const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

// Detect whether running in monorepo or standalone repository
const isMonorepo = fs.existsSync(path.resolve(__dirname, '../../packages/core'));
const rootDir = isMonorepo ? path.resolve(__dirname, '../..') : __dirname;

const entryExtension = isMonorepo ? 'apps/vscode/src/extension.js' : 'src/extension.js';
const outExtension = isMonorepo ? 'apps/vscode/dist/extension.js' : 'dist/extension.js';
const entryZap = isMonorepo ? 'packages/cli/bin/zap.js' : null;
const outZap = isMonorepo ? 'apps/vscode/dist/zap.js' : 'dist/zap.js';

const aliasCore = isMonorepo
  ? {
      '@zapwebp/core': path.join(rootDir, 'packages/core/src/index.js'),
      '@zapwebp/shared': path.join(rootDir, 'packages/shared/src/index.js'),
      '@zapwebp/plugin-sdk': path.join(rootDir, 'packages/plugin-sdk/src/index.js'),
      '@zapwebp/format-ico': path.join(rootDir, 'packages/format-ico/src/index.js'),
      '@zapwebp/compressor': path.join(rootDir, 'packages/compressor/src/index.js'),
      '@zapwebp/crop': path.join(rootDir, 'packages/crop/src/index.js'),
      '@zapwebp/lock': path.join(rootDir, 'packages/lock/src/index.js'),
    }
  : {};
const aliasShared = isMonorepo
  ? {
      '@zapwebp/core': path.join(rootDir, 'packages/core/src/index.js'),
      '@zapwebp/shared': path.join(rootDir, 'packages/shared/src/index.js'),
      '@zapwebp/plugin-sdk': path.join(rootDir, 'packages/plugin-sdk/src/index.js'),
      '@zapwebp/format-ico': path.join(rootDir, 'packages/format-ico/src/index.js'),
      '@zapwebp/compressor': path.join(rootDir, 'packages/compressor/src/index.js'),
      '@zapwebp/crop': path.join(rootDir, 'packages/crop/src/index.js'),
      '@zapwebp/lock': path.join(rootDir, 'packages/lock/src/index.js'),
    }
  : {};

async function build() {
  await esbuild.build({
    absWorkingDir: rootDir,
    entryPoints: [entryExtension],
    outfile: outExtension,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode', '@resvg/resvg-js', 'sharp'],
    alias: aliasCore,
  });

  if (entryZap && fs.existsSync(path.resolve(rootDir, entryZap))) {
    await esbuild.build({
      absWorkingDir: rootDir,
      entryPoints: [entryZap],
      outfile: outZap,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      external: ['@resvg/resvg-js', 'sharp'],
      alias: aliasShared,
    });
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
