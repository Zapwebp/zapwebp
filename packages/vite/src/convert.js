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
 * Converts a single SVG file into one or more scaled WebP assets.
 * @param {string} svgFilePath Absolute path to the source SVG file.
 * @param {Required<import('./index').ZapwebpPluginOptions>} config Resolved plugin options.
 * @returns {Promise<Array<import('./index').ZapwebpConversionOutput>>}
 */
async function convertSvgAsset(svgFilePath, config) {
  let svgBuffer;
  try {
    svgBuffer = fs.readFileSync(svgFilePath);
  } catch (err) {
    throw new Error(`[zapwebp-vite] Failed to read SVG asset at "${svgFilePath}": ${err.message}`);
  }

  // 1. Strict SVG Security Validation (Fail Loudly on XSS/scripts)
  try {
    validateSvg(svgBuffer);
  } catch (err) {
    throw new Error(`[zapwebp-vite] SVG security validation failed for "${path.basename(svgFilePath)}": ${err.message}`);
  }

  const baseName = path.basename(svgFilePath, path.extname(svgFilePath));
  const outputs = [];

  for (const scale of config.scale) {
    const width = Math.round(config.baseWidth * scale);
    const scaleSuffix = scale === 1 ? '' : `@${scale}x`;
    const outputFileName = `${baseName}${scaleSuffix}.webp`;

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
      throw new Error(`[zapwebp-vite] Conversion failed for "${path.basename(svgFilePath)}" at ${scale}x (${width}px): ${err.message}`);
    }

    outputs.push({
      name: outputFileName,
      scale,
      width: result.width || width,
      height: result.height,
      size: result.data.length,
      originalSize: svgBuffer.length,
      alphaPreserved: Boolean(result.alphaPreserved),
      clean: Boolean(result.clean),
      data: result.data,
      sha256: sha256(result.data),
      sourcePath: svgFilePath,
    });
  }

  return outputs;
}

module.exports = {
  convertSvgAsset,
  sha256,
};
