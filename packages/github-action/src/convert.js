'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { convertImage, detectFormat, validateSvg, scaleSuffix } = require('@zapwebp/core');
const { computeFileHash, loadCache, saveCache, shouldConvert } = require('./cache');
const { error: emitError, notice: emitNotice } = require('./annotations');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Builds the equivalent CLI arguments for executing the Zapwebp CLI command.
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
 * Implements hash caching for idempotency, skipping re-conversion of unchanged assets.
 * @param {Array<{ absolutePath: string, relativePath: string }>} files
 * @param {object} inputs
 * @param {string} rootDir
 * @returns {Promise<{
 *   filesIn: number,
 *   filesOut: number,
 *   filesSkipped: number,
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
 *   }>,
 *   failures: Array<{
 *     file: string,
 *     code: string,
 *     reason: string,
 *     fix: string
 *   }>
 * }>}
 */
async function convert(files, inputs, rootDir) {
  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  let filesSkipped = 0;
  const outputs = [];
  const failures = [];
  const targetFormat = (inputs.format || 'webp').toLowerCase();
  const ext = targetFormat === 'jpeg' ? '.jpg' : `.${targetFormat}`;

  // Load existing idempotency cache
  const cache = loadCache(rootDir);

  for (const file of files) {
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(file.absolutePath);
    } catch (err) {
      const reason = `Failed to read: ${err.message}`;
      failures.push({
        file: file.relativePath,
        code: 'E_READ_FAILED',
        reason,
        fix: 'Check file permissions or path accessibility.',
      });
      emitError(reason, { title: 'E_READ_FAILED', file: file.relativePath });
      continue;
    }

    let detectedFormat;
    try {
      detectedFormat = detectFormat(fileBuffer);
    } catch (err) {
      const reason = `Unrecognized image format: ${err.message}`;
      failures.push({
        file: file.relativePath,
        code: 'E_UNSUPPORTED_FORMAT',
        reason,
        fix: 'Use a supported image format: SVG, PNG, WebP, AVIF, JPEG, GIF, TIFF.',
      });
      emitError(reason, { title: 'E_UNSUPPORTED_FORMAT', file: file.relativePath });
      continue;
    }

    // Fail-fast security check on SVG files
    if (detectedFormat === 'svg') {
      try {
        validateSvg(fileBuffer);
      } catch (err) {
        const reason = `[zapwebp-action] SVG security validation failed for "${file.relativePath}": ${err.message}`;
        emitError(reason, { title: 'E_UNSAFE_SVG', file: file.relativePath });
        emitNotice('Remove the <script> tag or inline event handlers to satisfy security policies.', { title: 'Fix' });
        const error = new Error(reason);
        error.code = 'E_UNSAFE_SVG';
        error.file = file.relativePath;
        error.fix = 'Remove <script>, <foreignObject>, or inline event attributes, or add file to ignore pattern.';
        throw error;
      }
    }

    totalInputBytes += fileBuffer.length;
    const baseName = path.basename(file.absolutePath, path.extname(file.absolutePath));

    // Determine target directory
    const targetDir = inputs.outDir
      ? path.resolve(rootDir, inputs.outDir)
      : path.dirname(file.absolutePath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Compute expected output file paths
    const expectedOutputs = inputs.scale.map((scale) => {
      const suffix = scaleSuffix(scale);
      return path.join(targetDir, `${baseName}${suffix}${ext}`);
    });

    // Check idempotency cache
    const currentHash = computeFileHash(fileBuffer, inputs);
    const needsConversion = shouldConvert(file.relativePath, currentHash, expectedOutputs, cache);

    if (!needsConversion) {
      filesSkipped++;
      // Collect metadata from existing outputs for manifest consistency
      for (let i = 0; i < inputs.scale.length; i++) {
        const scale = inputs.scale[i];
        const targetFilePath = expectedOutputs[i];
        try {
          const stat = fs.statSync(targetFilePath);
          totalOutputBytes += stat.size;
          outputs.push({
            source: file.relativePath,
            target: path.relative(rootDir, targetFilePath).replace(/\\/g, '/'),
            absoluteTarget: targetFilePath,
            scale,
            width: Math.round(inputs.baseWidth * scale),
            height: 0,
            bytes: stat.size,
            alphaPreserved: true,
            sha256: '',
          });
        } catch {}
      }
      continue;
    }

    let fileFailed = false;
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
        fileFailed = true;
        const reason = `Conversion failed to ${targetFormat} at ${scale}x: ${err.message}`;
        failures.push({
          file: file.relativePath,
          code: 'E_CONVERSION_FAILED',
          reason,
          fix: 'Verify input image integrity or adjust quality/scale options.',
        });
        emitError(reason, { title: 'E_CONVERSION_FAILED', file: file.relativePath });
        break;
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

    if (!fileFailed) {
      cache[file.relativePath] = currentHash;
    }
  }

  // Persist updated hash cache
  saveCache(rootDir, cache);

  return {
    filesIn: files.length,
    filesOut: outputs.length,
    filesSkipped,
    bytesIn: totalInputBytes,
    bytesOut: totalOutputBytes,
    outputs,
    failures,
  };
}

module.exports = {
  convert,
  buildCliArgs,
  sha256,
};
