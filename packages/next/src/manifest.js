'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Builds and writes zapwebp.manifest.json.
 * @param {Array<import('./index').ZapwebpConversionOutput>} outputs
 * @param {Required<import('./index').ZapwebpNextOptions>} config
 * @param {string} rootDir
 * @returns {import('./index').ZapwebpManifest}
 */
function writeManifest(outputs, config, rootDir) {
  const uniqueSources = new Set(outputs.map((o) => o.sourcePath));
  const inputFiles = uniqueSources.size;
  const outputFiles = outputs.length;

  let totalInputBytes = 0;
  for (const source of uniqueSources) {
    const matching = outputs.find((o) => o.sourcePath === source);
    if (matching) totalInputBytes += matching.originalSize;
  }

  const totalOutputBytes = outputs.reduce((sum, o) => sum + o.size, 0);
  const bytesSaved = Math.max(0, totalInputBytes - totalOutputBytes);
  const savingsPercent = totalInputBytes > 0 ? Number(((bytesSaved / totalInputBytes) * 100).toFixed(1)) : 0;

  const manifest = {
    generatedBy: 'zapwebp-next@1.0.0',
    generatedAt: new Date().toISOString(),
    totals: {
      inputFiles,
      outputFiles,
      inputBytes: totalInputBytes,
      outputBytes: totalOutputBytes,
      bytesSaved,
      savingsPercent,
    },
    options: {
      scales: config.scale,
      baseWidth: config.baseWidth,
      quality: config.quality,
      lossless: config.lossless,
      clean: config.clean,
    },
    files: outputs.map((item) => {
      const source = rootDir ? item.sourcePath.replace(rootDir, '').replace(/^[\\/]/, '').replace(/\\/g, '/') : item.sourcePath;
      return {
        source,
        target: item.name,
        scale: item.scale,
        width: item.width,
        height: item.height,
        bytes: item.size,
        alphaPreserved: item.alphaPreserved,
        sha256: item.sha256,
      };
    }),
  };

  const resolvedOutDir = path.resolve(rootDir, config.outDir);
  if (!fs.existsSync(resolvedOutDir)) {
    fs.mkdirSync(resolvedOutDir, { recursive: true });
  }

  const manifestPath = path.join(resolvedOutDir, 'zapwebp.manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return manifest;
}

module.exports = {
  writeManifest,
};

