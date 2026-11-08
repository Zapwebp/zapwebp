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
 * Converts discovered image and vector assets into optimized WebP/AVIF formats and writes them to outDir.
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
  const targetFormats = Array.isArray(config.formats) && config.formats.length > 0
    ? config.formats
    : [config.format || 'webp'];

  for (const file of files) {
    let buffer;
    try {
      buffer = fs.readFileSync(file.absolutePath);
    } catch (err) {
      throw new Error(`[zapwebp-next] Failed to read asset at "${file.absolutePath}": ${err.message}`);
    }

    const ext = path.extname(file.absolutePath).toLowerCase();
    const isSvg = ext === '.svg';

    if (isSvg) {
      try {
        validateSvg(buffer);
      } catch (err) {
        throw new Error(`[zapwebp-next] SVG security validation failed for "${path.basename(file.absolutePath)}": ${err.message}`);
      }
    } else {
      const detected = detectFormat(buffer);
      if (!detected && !['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tiff'].includes(ext)) {
        continue; // Skip unsupported file types gracefully
      }
    }

    const baseName = path.basename(file.absolutePath, ext);
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
        // Fallback
      }
    }

    for (const fmt of targetFormats) {
      const targetFmt = String(fmt).toLowerCase();

      for (const scale of config.scale) {
        const width = isSvg
          ? Math.round(config.baseWidth * scale)
          : (scale === 1 ? undefined : Math.round(baseWidth * scale));

        const suffix = scaleSuffix(scale);
        const outExt = targetFmt === 'jpeg' ? 'jpg' : targetFmt;
        const outputFileName = `${baseName}${suffix}.${outExt}`;
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
          throw new Error(`[zapwebp-next] Conversion failed for "${path.basename(file.absolutePath)}" to ${targetFmt} at ${scale}x: ${err.message}`);
        }

        fs.writeFileSync(targetFilePath, result.data);

        allOutputs.push({
          name: outputFileName,
          format: targetFmt,
          relativePath: path.relative(rootDir, targetFilePath).replace(/\\/g, '/'),
          scale,
          width: result.width || width || baseWidth,
          height: result.height || (baseHeight ? Math.round(baseHeight * scale) : undefined),
          size: result.data.length,
          originalSize: buffer.length,
          alphaPreserved: Boolean(result.alphaPreserved),
          clean: Boolean(result.clean),
          data: result.data,
          sha256: sha256(result.data),
          sourcePath: file.absolutePath,
        });
      }
    }
  }

  return allOutputs;
}

module.exports = {
  convertAll,
  sha256,
};
