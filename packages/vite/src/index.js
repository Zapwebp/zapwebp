'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveConfig } = require('./config');
const { scanFiles } = require('./scan');
const { convertAsset, convertSvgAsset } = require('./convert');
const { createManifest } = require('./manifest');
const { generatePictureHtml } = require('./picture');

const SUPPORTED_EXTS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tiff']);

/**
 * Zapwebp Vite plugin factory.
 * @param {import('./index').ZapwebpPluginOptions} [userOptions={}]
 * @returns {import('./index').VitePlugin}
 */
function zapwebp(userOptions = {}) {
  const options = resolveConfig(userOptions);

  let viteRoot = process.cwd();
  let isDevServe = false;
  let resolvedOutDir = '';
  /** @type {Array<import('./index').ZapwebpConversionOutput>} */
  const convertedOutputs = [];
  const assetMap = new Map(); // absPath -> outputs

  return {
    name: 'zapwebp',
    enforce: 'pre',

    configResolved(config) {
      viteRoot = config.root || process.cwd();
      isDevServe = config.command === 'serve';
      resolvedOutDir = path.resolve(viteRoot, options.outDir);
    },

    configureServer(server) {
      // Dev server middleware to serve in-memory or on-disk converted assets
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (!url) return next();

        // Check if requested URL matches any converted output
        const matched = convertedOutputs.find((out) => {
          return url.endsWith('/' + out.name) || url === '/' + out.name;
        });

        if (matched && matched.data) {
          const mime = matched.format === 'jpeg' ? 'image/jpeg' : `image/${matched.format || 'webp'}`;
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.end(matched.data);
          return;
        }

        next();
      });
    },

    async buildStart() {
      convertedOutputs.length = 0;
      assetMap.clear();

      // Ensure outDir exists if emitting to public folder
      if (options.emitToPublic && !fs.existsSync(resolvedOutDir)) {
        fs.mkdirSync(resolvedOutDir, { recursive: true });
      }

      // Discover assets
      const scannedFiles = scanFiles(viteRoot, options.include, options.exclude);
      if (scannedFiles.length === 0) return;

      for (const file of scannedFiles) {
        const outputs = await convertAsset(file.absolutePath, options);
        assetMap.set(file.absolutePath, outputs);

        for (const out of outputs) {
          convertedOutputs.push(out);

          if (options.emitToPublic) {
            const targetFilePath = path.join(resolvedOutDir, out.name);

            if (fs.existsSync(targetFilePath)) {
              if (options.onConflict === 'error') {
                throw new Error(`[zapwebp-vite] Output file already exists: "${targetFilePath}". Set onConflict: 'overwrite' or 'skip' to proceed.`);
              }
              if (options.onConflict === 'skip') {
                continue;
              }
            }

            fs.writeFileSync(targetFilePath, out.data);
          }
        }
      }
    },

    transform(_code, id) {
      const [cleanId, queryStr] = id.split('?');
      const ext = path.extname(cleanId).toLowerCase();
      if (!SUPPORTED_EXTS.has(ext)) return null;

      const outputs = assetMap.get(cleanId);
      if (!outputs || outputs.length === 0) return null;

      const primary1x = outputs.find((o) => o.scale === 1) || outputs[0];
      const params = new URLSearchParams(queryStr || '');

      let webUrl = '';
      if (options.emitToPublic) {
        const publicRel = path.relative(path.resolve(viteRoot, 'public'), path.join(resolvedOutDir, primary1x.name)).replace(/\\/g, '/');
        webUrl = publicRel.startsWith('/') ? publicRel : `/${publicRel}`;
      }

      // 1. Picture query: import logo from './logo.png?picture'
      if (params.has('picture') || params.get('as') === 'picture') {
        const sources = options.formats.map((fmt) => {
          const fmtClean = fmt.toLowerCase();
          const mime = fmtClean === 'jpeg' ? 'image/jpeg' : `image/${fmtClean}`;
          const srcset = outputs
            .filter((o) => (o.format || 'webp') === fmtClean)
            .map((o) => {
              const rel = path.relative(path.resolve(viteRoot, 'public'), path.join(resolvedOutDir, o.name)).replace(/\\/g, '/');
              const u = rel.startsWith('/') ? rel : `/${rel}`;
              return `${u} ${o.scale}x`;
            })
            .join(', ');
          return { type: mime, srcset };
        });

        const pictureObj = {
          src: webUrl,
          width: primary1x.width,
          height: primary1x.height,
          sources,
        };

        return {
          code: `export default ${JSON.stringify(pictureObj)};`,
          map: null,
        };
      }

      // 2. Srcset query: import logo from './logo.png?srcset'
      if (params.has('srcset') || params.get('as') === 'srcset') {
        const srcsetStr = outputs
          .map((o) => {
            const rel = path.relative(path.resolve(viteRoot, 'public'), path.join(resolvedOutDir, o.name)).replace(/\\/g, '/');
            const u = rel.startsWith('/') ? rel : `/${rel}`;
            return `${u} ${o.scale}x`;
          })
          .join(', ');

        return {
          code: `export default ${JSON.stringify(srcsetStr)};`,
          map: null,
        };
      }

      // 3. Standard asset import
      if (options.emitToPublic) {
        return {
          code: `export default ${JSON.stringify(webUrl)};`,
          map: null,
        };
      }

      if (typeof this?.emitFile === 'function') {
        const referenceId = this.emitFile({
          type: 'asset',
          name: primary1x.name,
          source: primary1x.data,
        });
        return {
          code: `export default import.meta.ROLLUP_FILE_URL_${referenceId};`,
          map: null,
        };
      }

      return null;
    },

    async generateBundle() {
      if (options.emitToPublic) return;

      if (typeof this?.emitFile === 'function') {
        for (const out of convertedOutputs) {
          this.emitFile({
            type: 'asset',
            fileName: path.join(options.outDir, out.name).replace(/\\/g, '/'),
            source: out.data,
          });
        }
      }
    },

    async closeBundle() {
      if (!options.emitManifest || convertedOutputs.length === 0) return;

      const manifest = createManifest(convertedOutputs, options, viteRoot);
      const manifestJson = JSON.stringify(manifest, null, 2);

      if (options.emitToPublic) {
        if (!fs.existsSync(resolvedOutDir)) {
          fs.mkdirSync(resolvedOutDir, { recursive: true });
        }
        const manifestPath = path.join(resolvedOutDir, 'zapwebp.manifest.json');
        fs.writeFileSync(manifestPath, manifestJson, 'utf8');
      }

      const { totals } = manifest;
      console.log(
        `⚡ [zapwebp-vite] Converted ${totals.inputFiles} image${totals.inputFiles === 1 ? '' : 's'} → ${totals.outputFiles} optimized asset${totals.outputFiles === 1 ? '' : 's'} (${totals.savingsPercent}% saved).`
      );
    },
  };
}

module.exports = {
  zapwebp,
  default: zapwebp,
  zapwebpVitePlugin: zapwebp,
  generatePictureHtml,
  convertAsset,
  convertSvgAsset,
  resolveConfig,
};
