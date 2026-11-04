'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { convertImage, detectFormat, validateSvg, scaleSuffix } = require('@zapwebp/core');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Builds the equivalent CLI arguments for executing the Zapwebp CLI command.
 * e.g. zapwebp "**\/*.{svg,png}" --to "webp" --quality "85" --clean
 * @param {import('./inputs').ActionInputs} inputs
 * @returns {string[]}
 */
function buildCliArgs(inputs) {
  const args = [inputs.inputGlob || inputs.glob];
  args.push('--to', inputs.format || 'webp');
  if (inputs.quality) args.push('--quality', String(inputs.quality));
  if (inputs.scale && inputs.scale.length) args.push('--scale', inputs.scale.join(','));
  if (inputs.baseWidth) args.push('--base-width', String(inputs.baseWidth));
  if (inputs.lossless) args.push('--lossless');
  if (inputs.clean) args.push('--clean');
  if (inputs.outDir) args.push('--out-dir', inputs.outDir);
  return args;
}

/**
 * Converts a list of image files according to action inputs using the core engine.
 * Accepts SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF and outputs to any supported target.
 * @param {Array<{ absolutePath: string, relativePath: string }>} files
 * @param {object} inputs
 * @param {string} rootDir
 * @returns {Promise<{
 *   filesIn: number,
 *   filesOut: number,
 *   bytesIn: number,
 *   bytesOut: number,
 *   outputs: Array<{
 *     source: string,
 *     target: string,
 *     absoluteTarget: string,
 *     scale: number,
 *     width: number,
 *     height: number,
 *     bytes: number,
 *     alphaPreserved: boolean,
 *     sha256: string
 *   }>
 * }>}
 */
async function convert(files, inputs, rootDir) {
  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  const outputs = [];
  const targetFormat = (inputs.format || 'webp').toLowerCase();
  const ext = targetFormat === 'jpeg' ? '.jpg' : `.${targetFormat}`;

  for (const file of files) {
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(file.absolutePath);
    } catch (err) {
      throw new Error(`[zapwebp-action] Failed to read "${file.relativePath}": ${err.message}`);
    }

    let detectedFormat;
    try {
      detectedFormat = detectFormat(fileBuffer);
    } catch (err) {
      throw new Error(`[zapwebp-action] Unrecognized image format for "${file.relativePath}": ${err.message}`);
    }

    // Fail-fast security check on SVG files
    if (detectedFormat === 'svg') {
      try {
        validateSvg(fileBuffer);
      } catch (err) {
        throw new Error(`[zapwebp-action] SVG security validation failed for "${file.relativePath}": ${err.message}`);
      }
    }

    totalInputBytes += fileBuffer.length;
    const baseName = path.basename(file.absolutePath, path.extname(file.absolutePath));

    // Determine target directory: outDir or source file's directory
    const targetDir = inputs.outDir
      ? path.resolve(rootDir, inputs.outDir)
      : path.dirname(file.absolutePath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const scale of inputs.scale) {
      const width = Math.round(inputs.baseWidth * scale);
      const suffix = scaleSuffix(scale);
      const outFileName = `${baseName}${suffix}${ext}`;
      const targetFilePath = path.join(targetDir, outFileName);

      let result;
      try {
        result = await convertImage(fileBuffer, {
          to: targetFormat,
          width,
          quality: inputs.quality,
          lossless: inputs.lossless,
          clean: inputs.clean,
          stripMetadata: inputs.clean,
          assertAlpha: false,
        });
      } catch (err) {
        throw new Error(`[zapwebp-action] Conversion failed for "${file.relativePath}" to ${targetFormat} at ${scale}x (${width}px): ${err.message}`);
      }

      fs.writeFileSync(targetFilePath, result.data);
      totalOutputBytes += result.data.length;

      outputs.push({
        source: file.relativePath,
        target: path.relative(rootDir, targetFilePath).replace(/\\/g, '/'),
        absoluteTarget: targetFilePath,
        scale,
        width: result.width || width,
        height: result.height,
        bytes: result.data.length,
        alphaPreserved: Boolean(result.alphaPreserved),
        sha256: sha256(result.data),
      });
    }
  }

  return {
    filesIn: files.length,
    filesOut: outputs.length,
    bytesIn: totalInputBytes,
    bytesOut: totalOutputBytes,
    outputs,
  };
}

module.exports = {
  convert,
  buildCliArgs,
  sha256,
};
