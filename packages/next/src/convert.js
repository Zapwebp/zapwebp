'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { convertImage, validateSvg } = require('@zapwebp/core');

/**
 * Calculates SHA-256 hash of a buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Converts discovered SVG files into WebP assets and writes them to outDir.
 * @param {Array<{ absolutePath: string, relativePath: string }>} files
 * @param {Required<import('./index').ZapwebpNextOptions>} config
 * @param {string} rootDir
 * @returns {Promise<Array<import('./index').ZapwebpConversionOutput>>}
 */
async function convertAll(files, config, rootDir) {
  const resolvedOutDir = path.resolve(rootDir, config.outDir);
  if (!fs.existsSync(resolvedOutDir)) {
    fs.mkdirSync(resolvedOutDir, { recursive: true });
  }

  const allOutputs = [];

  for (const file of files) {
    let svgBuffer;
    try {
      svgBuffer = fs.readFileSync(file.absolutePath);
    } catch (err) {
      throw new Error(`[zapwebp-next] Failed to read SVG asset at "${file.absolutePath}": ${err.message}`);
    }

    // 1. Strict SVG Security Validation (Fail Loudly on XSS/scripts)
    try {
      validateSvg(svgBuffer);
    } catch (err) {
      throw new Error(`[zapwebp-next] SVG security validation failed for "${path.basename(file.absolutePath)}": ${err.message}`);
    }

    const baseName = path.basename(file.absolutePath, path.extname(file.absolutePath));

    for (const scale of config.scale) {
      const width = Math.round(config.baseWidth * scale);
      const scaleSuffix = scale === 1 ? '' : `@${scale}x`;
      const outputFileName = `${baseName}${scaleSuffix}.webp`;
      const targetFilePath = path.join(resolvedOutDir, outputFileName);

      if (fs.existsSync(targetFilePath)) {
        if (config.onConflict === 'error') {
          throw new Error(`[zapwebp-next] Output file already exists: "${targetFilePath}". Set onConflict: 'overwrite' or 'skip' to proceed.`);
        }
        if (config.onConflict === 'skip') {
          continue;
        }
      }

      let result;
      try {
        result = await convertImage(svgBuffer, {
          to: 'webp',
          width,
          quality: config.quality,
          lossless: config.lossless,
          clean: config.clean,
          stripMetadata: config.clean,
          assertAlpha: false,
        });
      } catch (err) {
        throw new Error(`[zapwebp-next] Conversion failed for "${path.basename(file.absolutePath)}" at ${scale}x (${width}px): ${err.message}`);
      }

      fs.writeFileSync(targetFilePath, result.data);

      allOutputs.push({
        name: outputFileName,
        relativePath: path.relative(rootDir, targetFilePath).replace(/\\/g, '/'),
        scale,
        width: result.width || width,
        height: result.height,
        size: result.data.length,
        originalSize: svgBuffer.length,
        alphaPreserved: Boolean(result.alphaPreserved),
        clean: Boolean(result.clean),
        data: result.data,
        sha256: sha256(result.data),
        sourcePath: file.absolutePath,
      });
    }
  }

  return allOutputs;
}

module.exports = {
  convertAll,
  sha256,
};

