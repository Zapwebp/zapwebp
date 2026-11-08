'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  convertImage,
  validateSvg,
  detectFormat,
  inspectImage,
  scaleSuffix,
} = require('@zapwebp/core');

/**
 * Calculates SHA-256 hash of a buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Converts a single image asset (SVG, PNG, JPEG, WebP, AVIF, GIF, TIFF)
 * into one or more scaled assets in the configured formats.
 * @param {string} filePath Absolute path to source image.
 * @param {Required<import('./index').ZapwebpPluginOptions>} config Resolved plugin options.
 * @returns {Promise<Array<import('./index').ZapwebpConversionOutput>>}
 */
async function convertAsset(filePath, config) {
  let buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (err) {
    throw new Error(`[zapwebp-vite] Failed to read asset at "${filePath}": ${err.message}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isSvg = ext === '.svg';

  if (isSvg) {
    try {
      validateSvg(buffer);
    } catch (err) {
      throw new Error(`[zapwebp-vite] SVG security validation failed for "${path.basename(filePath)}": ${err.message}`);
    }
  } else {
    const detected = detectFormat(buffer);
    if (!detected && !['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tiff'].includes(ext)) {
      throw new Error(`[zapwebp-vite] Unsupported image format for "${path.basename(filePath)}".`);
    }
  }

  const baseName = path.basename(filePath, ext);
  const targetFormats = Array.isArray(config.formats) && config.formats.length > 0
    ? config.formats
    : [config.format || 'webp'];

  let baseWidth = config.baseWidth || 512;
  let baseHeight;

  if (!isSvg) {
    try {
      const inspected = await inspectImage(buffer);
      if (inspected && inspected.width) {
        baseWidth = inspected.width;
        baseHeight = inspected.height;
      }
    } catch {
      // Retain default baseWidth
    }
  }

  const outputs = [];

  for (const fmt of targetFormats) {
    const targetFmt = String(fmt).toLowerCase();

    for (const scale of config.scale) {
      const width = isSvg
        ? Math.round(config.baseWidth * scale)
        : (scale === 1 ? undefined : Math.round(baseWidth * scale));

      const suffix = scaleSuffix(scale);
      const outExt = targetFmt === 'jpeg' ? 'jpg' : targetFmt;
      const outputFileName = `${baseName}${suffix}.${outExt}`;

      let result;
      try {
        result = await convertImage(buffer, {
          to: targetFmt,
          width,
          quality: config.quality,
          lossless: config.lossless,
          clean: config.clean,
          stripMetadata: config.clean,
          background: config.background,
          assertAlpha: false,
        });
      } catch (err) {
        throw new Error(`[zapwebp-vite] Conversion failed for "${path.basename(filePath)}" to ${targetFmt} at ${scale}x: ${err.message}`);
      }

      outputs.push({
        name: outputFileName,
        scale,
        format: targetFmt,
        width: result.width || width || baseWidth,
        height: result.height || (baseHeight ? Math.round(baseHeight * scale) : undefined),
        size: result.data.length,
        originalSize: buffer.length,
        alphaPreserved: Boolean(result.alphaPreserved),
        clean: Boolean(result.clean),
        data: result.data,
        sha256: sha256(result.data),
        sourcePath: filePath,
      });
    }
  }

  return outputs;
}

/**
 * Backward compatibility wrapper for convertSvgAsset.
 * @param {string} svgFilePath
 * @param {Required<import('./index').ZapwebpPluginOptions>} config
 */
async function convertSvgAsset(svgFilePath, config) {
  return convertAsset(svgFilePath, config);
}

module.exports = {
  convertAsset,
  convertSvgAsset,
  sha256,
};
