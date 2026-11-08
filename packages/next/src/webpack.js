'use strict';

const path = require('node:path');
const { scan } = require('./scan');
const { convertAll } = require('./convert');
const { writeManifest } = require('./manifest');

/**
 * Webpack plugin that scans, converts, and verifies SVG assets for Next.js.
 */
class ZapwebpWebpackPlugin {
  /**
   * @param {Required<import('./index').ZapwebpNextOptions>} options
   * @param {string} rootDir
   */
  constructor(options, rootDir = process.cwd()) {
    this.options = options;
    this.rootDir = rootDir;
    this.outputs = [];
    this.hasRun = false;
  }

  /**
   * @param {import('webpack').Compiler} compiler
   */
  apply(compiler) {
    const runHook = async () => {
      if (this.hasRun) return;
      this.hasRun = true;

      const files = scan(this.rootDir, this.options.sourceDirs);
      if (files.length === 0) return;

      this.outputs = await convertAll(files, this.options, this.rootDir);

      if (this.options.emitManifest && this.outputs.length > 0) {
        const manifest = writeManifest(this.outputs, this.options, this.rootDir);
        const { totals } = manifest;
        console.log(
          `⚡ [zapwebp-next] Converted ${totals.inputFiles} SVG${totals.inputFiles === 1 ? '' : 's'} → ${totals.outputFiles} WebP${totals.outputFiles === 1 ? '' : 's'} (${totals.savingsPercent}% saved).`
        );
      }
    };

    if (compiler.hooks.beforeCompile) {
      compiler.hooks.beforeCompile.tapPromise('zapwebp', runHook);
    } else if (compiler.hooks.compile) {
      compiler.hooks.compile.tap('zapwebp', () => {
        runHook();
      });
    }

    if (compiler.hooks.afterEmit && this.options.emitManifest) {
      compiler.hooks.afterEmit.tapPromise('zapwebp-manifest', async () => {
        if (this.outputs.length > 0) {
          writeManifest(this.outputs, this.options, this.rootDir);
        }
      });
    }
  }
}

/**
 * Injects Zapwebp plugin and webpack loader into the Next.js webpack config.
 * @param {any} config Webpack configuration.
 * @param {{ dev: boolean, isServer: boolean, defaultLoaders: any, nextRuntime?: string }} context Next.js webpack context.
 * @param {Required<import('./index').ZapwebpNextOptions>} options
 * @param {string} [rootDir=process.cwd()]
 */
function applyWebpack(config, context, options, rootDir = process.cwd()) {
  // 1. Only run one compilation pass (skip server / edge runtime compilations)
  if (context.isServer) return config;

  // 2. Skip in dev unless explicitly opted in via ZAPWEBP_DEV=1
  if (context.dev && !process.env.ZAPWEBP_DEV) return config;

  // 3. Inject compilation plugin
  config.plugins = config.plugins || [];
  config.plugins.push(new ZapwebpWebpackPlugin(options, rootDir));

  // 4. Inject image and vector loader
  config.module = config.module || { rules: [] };
  config.module.rules = config.module.rules || [];

  const loaderPath = path.join(__dirname, 'loader.js');
  config.module.rules.push({
    test: /\.(svg|png|jpe?g|gif|webp|avif|tiff)$/i,
    resourceQuery: { not: [/url/] },
    use: [
      {
        loader: loaderPath,
        options: {
          outDir: options.outDir,
          baseWidth: options.baseWidth,
          format: options.format,
        },
      },
    ],
  });

  return config;
}

module.exports = {
  ZapwebpWebpackPlugin,
  applyWebpack,
};

