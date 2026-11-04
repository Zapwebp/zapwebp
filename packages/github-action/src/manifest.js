'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Builds and writes zapwebp.manifest.json.
 * @param {Array<any>} outputs
 * @param {import('./inputs').ActionInputs} inputs
 * @param {string} rootDir
 * @returns {object}
 */
function writeManifest(outputs, inputs, rootDir) {
  const uniqueSources = new Set(outputs.map((o) => o.source));
  const inputFiles = uniqueSources.size;
  const outputFiles = outputs.length;

  const totalInputBytes = outputs.reduce((sum, o) => sum + (o.bytes || 0), 0);
  const targetDir = inputs.outDir ? path.resolve(rootDir, inputs.outDir) : rootDir;

  const manifest = {
    generatedBy: 'zapwebp-github-action@1.0.0',
    generatedAt: new Date().toISOString(),
    totals: {
      inputFiles,
      outputFiles,
      inputBytes: totalInputBytes,
    },
    options: {
      format: inputs.format || 'webp',
      scale: inputs.scale,
      baseWidth: inputs.baseWidth,
      quality: inputs.quality,
      lossless: inputs.lossless,
      clean: inputs.clean,
    },
    files: outputs.map((item) => ({
      source: item.source,
      target: item.target,
      scale: item.scale,
      width: item.width,
      height: item.height,
      bytes: item.bytes,
      alphaPreserved: item.alphaPreserved,
      sha256: item.sha256,
    })),
  };

  const manifestPath = path.join(targetDir, 'zapwebp.manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

module.exports = {
  writeManifest,
};

