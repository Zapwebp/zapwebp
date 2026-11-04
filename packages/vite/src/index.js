'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveConfig } = require('./config');
const { scanFiles } = require('./scan');
const { convertSvgAsset } = require('./convert');
const { createManifest } = require('./manifest');

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
  const svgMap = new Map(); // absPath -> outputs

  return {
    name: 'zapwebp',
    enforce: 'pre',

    configResolved(config) {
      viteRoot = config.root || process.cwd();
      isDevServe = config.command === 'serve';
      resolvedOutDir = path.resolve(viteRoot, options.outDir);
    },

    async buildStart() {
      convertedOutputs.length = 0;
      svgMap.clear();

      // Ensure outDir exists if emitting to public folder
      if (options.emitToPublic && !fs.existsSync(resolvedOutDir)) {
        fs.mkdirSync(resolvedOutDir, { recursive: true });
      }

      // Discover SVG files
      const scannedFiles = scanFiles(viteRoot, options.include, options.exclude);
      if (scannedFiles.length === 0) return;

      for (const file of scannedFiles) {
        const outputs = await convertSvgAsset(file.absolutePath, options);
        svgMap.set(file.absolutePath, outputs);

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
      const cleanId = id.split('?')[0];
      if (!cleanId.toLowerCase().endsWith('.svg')) return null;

      const outputs = svgMap.get(cleanId);
      if (!outputs || outputs.length === 0) return null;

      // 1x representation
      const primary1x = outputs.find((o) => o.scale === 1) || outputs[0];

      if (options.emitToPublic) {
        // Compute web-accessible path relative to publicDir or root
        const publicRel = path.relative(path.resolve(viteRoot, 'public'), path.join(resolvedOutDir, primary1x.name)).replace(/\\/g, '/');
        const webUrl = publicRel.startsWith('/') ? publicRel : `/${publicRel}`;
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

      // When emitToPublic is false, emit all scaled WebP files into Rollup bundle
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

      // Log production build summary
      const { totals } = manifest;
      console.log(
        `⚡ [zapwebp-vite] Converted ${totals.inputFiles} SVG${totals.inputFiles === 1 ? '' : 's'} → ${totals.outputFiles} WebP${totals.outputFiles === 1 ? '' : 's'} (${totals.savingsPercent}% saved).`
      );
    },
  };
}

module.exports = {
  zapwebp,
  default: zapwebp,
};

