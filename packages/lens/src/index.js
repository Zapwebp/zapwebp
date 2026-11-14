'use strict';

const path = require('node:path');
const { inspectImage, verifyAlpha, checkSvgSafety, detectFormat } = require('@zapwebp/core');
const { parseChunks } = require('./inspect/chunks');
const { renderInspectTerminal, renderCompareTerminal, formatBytes } = require('./render/terminal');
const { openHtml } = require('./render/html');
const { generateVisualDiff } = require('./render/visual-diff');
const { generateHtmlReport } = require('./render/html-report');
const { safeRead } = require('./safe-read');
const { withTimeout } = require('./timeout');
const { verifyCommand } = require('./verify');
const { LensError } = require('./errors');

const DEFAULT_MAX_BATCH_FILES = 500;

/**
 * Creates a standardized, stable JSON envelope.
 *
 * @param {string} command - The executed command name
 * @param {any} result - Command result payload
 * @param {any[]} [errors=[]] - Array of error descriptors
 * @returns {object}
 */
function createJsonEnvelope(command, result, errors = []) {
  return {
    version: '1.0.0',
    tool: 'zapwebp-lens',
    command,
    result,
    errors,
  };
}

/**
 * Inspects image container chunks, alpha channel, dimensions, and metadata.
 *
 * @param {string} filePath - Path to file
 * @param {{
 *   json?: boolean,
 *   open?: boolean,
 *   failIfDirty?: boolean,
 *   maxBytes?: number,
 *   timeout?: number,
 *   allowUnsafe?: boolean
 * }} [options]
 * @returns {Promise<any>}
 */
async function inspectCommand(filePath, options = {}) {
  const bytes = await safeRead(filePath, options);
  const detected = detectFormat(bytes);

  // SVG Safety Gate
  if (detected === 'svg' && !options.allowUnsafe) {
    const safety = checkSvgSafety(bytes);
    if (!safety.safe) {
      throw new LensError({
        code: 'E_UNSAFE_SVG',
        message: `SVG is unsafe: ${safety.detail || 'Prohibited active elements or external entities detected'}`,
        fix: 'The file contains scripts or external references. Use --allow-unsafe to inspect anyway.',
      });
    }
  }

  let info;
  try {
    info = await withTimeout(inspectImage(bytes), options.timeout || 5000, 'inspectImage');
  } catch (err) {
    if (detected === 'svg' && options.allowUnsafe) {
      const text = bytes.toString('utf8');
      const root = text.match(/<svg\b[^>]*>/i)?.[0] || '';
      const wMatch = root.match(/width=["']?(\d+)/i);
      const hMatch = root.match(/height=["']?(\d+)/i);
      info = {
        format: 'svg',
        width: wMatch ? Number(wMatch[1]) : undefined,
        height: hMatch ? Number(hMatch[1]) : undefined,
        hasAlpha: true,
        bytes: bytes.length,
        metadata: { hasExif: false, hasIcc: false, hasXmp: false },
      };
    } else if (err.code === 'E_UNSAFE_SVG') {
      throw new LensError({
        code: 'E_UNSAFE_SVG',
        message: `SVG is unsafe: ${err.message}`,
        fix: 'The file contains scripts or external references. Use --allow-unsafe to inspect anyway.',
      });
    } else {
      throw err;
    }
  }
  const chunks = parseChunks(bytes);
  const metadataChunks = chunks.filter((c) => c.isMetadata);
  const isDirty = metadataChunks.length > 0;

  const result = {
    file: filePath,
    bytes: bytes.length,
    format: info.format,
    width: info.width,
    height: info.height,
    hasAlpha: info.hasAlpha,
    chunks,
    metadata: info.metadata,
    metadataChunksCount: metadataChunks.length,
    isDirty,
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(createJsonEnvelope('inspect', result), null, 2) + '\n');
  } else {
    process.stdout.write(renderInspectTerminal(result, filePath));
  }

  if (options.open) {
    await openHtml(result, bytes, null, filePath, null, options);
  }

  if (options.failIfDirty && isDirty) {
    throw new LensError({
      code: 'E_DIRTY_METADATA',
      message: `File "${filePath}" contains ${metadataChunks.length} metadata chunk(s) (${metadataChunks.map((c) => c.type).join(', ')})`,
      fix: 'Use zap clean or convert with metadata stripping to remove EXIF/XMP/IPTC chunks.',
    });
  }

  return result;
}

/**
 * Compares two images side-by-side with format, dimension, and transparency metrics.
 *
 * @param {string} fileA - First image path
 * @param {string} fileB - Second image path
 * @param {{
 *   json?: boolean,
 *   open?: boolean,
 *   maxBytes?: number,
 *   timeout?: number,
 *   allowUnsafe?: boolean
 * }} [options]
 * @returns {Promise<any>}
 */
async function compareCommand(fileA, fileB, options = {}) {
  const bytesA = await safeRead(fileA, options);
  const bytesB = await safeRead(fileB, options);

  const detectedA = detectFormat(bytesA);
  const detectedB = detectFormat(bytesB);

  if ((detectedA === 'svg' || detectedB === 'svg') && !options.allowUnsafe) {
    if (detectedA === 'svg') {
      const s = checkSvgSafety(bytesA);
      if (!s.safe) throw new LensError({ code: 'E_UNSAFE_SVG', message: `File A (${fileA}) is unsafe SVG: ${s.detail}`, fix: 'Use --allow-unsafe to bypass.' });
    }
    if (detectedB === 'svg') {
      const s = checkSvgSafety(bytesB);
      if (!s.safe) throw new LensError({ code: 'E_UNSAFE_SVG', message: `File B (${fileB}) is unsafe SVG: ${s.detail}`, fix: 'Use --allow-unsafe to bypass.' });
    }
  }

  const infoA = await withTimeout(inspectImage(bytesA), options.timeout || 5000, 'inspectImage(fileA)');
  const infoB = await withTimeout(inspectImage(bytesB), options.timeout || 5000, 'inspectImage(fileB)');

  const result = {
    fileA,
    fileB,
    bytesA: bytesA.length,
    bytesB: bytesB.length,
    formatA: infoA.format,
    formatB: infoB.format,
    widthA: infoA.width,
    widthB: infoB.width,
    heightA: infoA.height,
    heightB: infoB.height,
    hasAlphaA: infoA.hasAlpha,
    hasAlphaB: infoB.hasAlpha,
    byteSavings: bytesA.length - bytesB.length,
    percentage: Math.round(((bytesB.length - bytesA.length) / bytesA.length) * 100),
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(createJsonEnvelope('compare', result), null, 2) + '\n');
  } else {
    process.stdout.write(renderCompareTerminal({ ...infoA, bytes: bytesA.length }, { ...infoB, bytes: bytesB.length }, fileA, fileB));
  }

  if (options.open) {
    await openHtml(result, bytesA, bytesB, fileA, fileB, options);
  }

  return result;
}

/**
 * Isolates and verifies alpha transparency channel.
 *
 * @param {string} filePath - Path to file
 * @param {{
 *   json?: boolean,
 *   open?: boolean,
 *   maxBytes?: number,
 *   timeout?: number,
 *   allowUnsafe?: boolean
 * }} [options]
 * @returns {Promise<any>}
 */
async function alphaCommand(filePath, options = {}) {
  const bytes = await safeRead(filePath, options);
  const detected = detectFormat(bytes);

  if (detected === 'svg' && !options.allowUnsafe) {
    const s = checkSvgSafety(bytes);
    if (!s.safe) throw new LensError({ code: 'E_UNSAFE_SVG', message: `SVG is unsafe: ${s.detail}`, fix: 'Use --allow-unsafe to bypass.' });
  }

  const alphaCheck = await withTimeout(verifyAlpha(bytes), options.timeout || 5000, 'verifyAlpha');

  const result = {
    file: filePath,
    hasAlpha: alphaCheck.hasAlpha,
    alphaPreserved: alphaCheck.alphaPreserved,
    cornerAlpha: alphaCheck.cornerAlpha,
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(createJsonEnvelope('alpha', result), null, 2) + '\n');
  } else {
    process.stdout.write(`Alpha inspection: ${filePath}\n`);
    process.stdout.write(`  Has transparent pixels: ${alphaCheck.hasAlpha ? 'YES ✅' : 'NO (Opaque)'}\n`);
    process.stdout.write(`  Corner pixels alpha:   [${alphaCheck.cornerAlpha?.join(', ')}]\n`);
  }

  if (options.open) {
    await openHtml(result, bytes, null, filePath, null, options);
  }

  return result;
}

/**
 * Compares two images structurally via chunk diff, and optionally with SSIM visual diff viewer.
 *
 * @param {string} fileA - First image
 * @param {string} fileB - Second image
 * @param {{
 *   json?: boolean,
 *   visual?: boolean,
 *   open?: boolean,
 *   maxBytes?: number,
 *   timeout?: number,
 *   allowUnsafe?: boolean
 * }} [options]
 * @returns {Promise<any>}
 */
async function diffCommand(fileA, fileB, options = {}) {
  const bytesA = await safeRead(fileA, options);
  const bytesB = await safeRead(fileB, options);

  const detectedA = detectFormat(bytesA);
  const detectedB = detectFormat(bytesB);

  if ((detectedA === 'svg' || detectedB === 'svg') && !options.allowUnsafe) {
    if (detectedA === 'svg') {
      const s = checkSvgSafety(bytesA);
      if (!s.safe) throw new LensError({ code: 'E_UNSAFE_SVG', message: `File A (${fileA}) is unsafe SVG: ${s.detail}`, fix: 'Use --allow-unsafe to bypass.' });
    }
    if (detectedB === 'svg') {
      const s = checkSvgSafety(bytesB);
      if (!s.safe) throw new LensError({ code: 'E_UNSAFE_SVG', message: `File B (${fileB}) is unsafe SVG: ${s.detail}`, fix: 'Use --allow-unsafe to bypass.' });
    }
  }

  const chunksA = parseChunks(bytesA);
  const chunksB = parseChunks(bytesB);
  const infoA = await withTimeout(inspectImage(bytesA), options.timeout || 5000, 'inspectImage(fileA)');
  const infoB = await withTimeout(inspectImage(bytesB), options.timeout || 5000, 'inspectImage(fileB)');

  const result = {
    fileA,
    fileB,
    bytesA: bytesA.length,
    bytesB: bytesB.length,
    diffBytes: bytesB.length - bytesA.length,
    chunksA: chunksA.map((c) => c.type),
    chunksB: chunksB.map((c) => c.type),
  };

  if (options.visual) {
    const visualResult = await generateVisualDiff(bytesA, bytesB, fileA, fileB, infoA, infoB, options);
    result.visual = {
      pixelsChanged: visualResult.pixelsChanged,
      pixelsChangedPercent: visualResult.pixelsChangedPercent,
      ssimEstimate: visualResult.ssimEstimate,
      htmlPath: visualResult.htmlPath,
    };
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(createJsonEnvelope('diff', result), null, 2) + '\n');
  } else {
    process.stdout.write(`Hex & Container Diff: ${fileA} ↔ ${fileB}\n`);
    process.stdout.write(`  ${fileA}: ${formatBytes(bytesA.length)} [${chunksA.map((c) => c.type).join(', ')}]\n`);
    process.stdout.write(`  ${fileB}: ${formatBytes(bytesB.length)} [${chunksB.map((c) => c.type).join(', ')}]\n`);
    process.stdout.write(`  Difference: ${result.diffBytes > 0 ? `+${result.diffBytes}` : result.diffBytes} bytes\n`);
    if (result.visual) {
      process.stdout.write(`  Visual SSIM Estimate: ${result.visual.ssimEstimate} (Pixels changed: ${result.visual.pixelsChangedPercent}%)\n`);
      process.stdout.write(`  Visual Report: ${result.visual.htmlPath}\n`);
    }
  }

  return result;
}

/**
 * Generates batch inspection report across multiple files, with optional static HTML artifact.
 *
 * @param {string[]} files - Array of files to analyze
 * @param {{
 *   json?: boolean,
 *   html?: string|boolean,
 *   maxBatch?: number,
 *   maxBytes?: number,
 *   timeout?: number,
 *   allowUnsafe?: boolean
 * }} [options]
 * @returns {Promise<any>}
 */
async function reportCommand(files, options = {}) {
  const maxBatch = options.maxBatch || DEFAULT_MAX_BATCH_FILES;
  if (files.length > maxBatch) {
    throw new LensError({
      code: 'E_BATCH_LIMIT',
      message: `Batch contains ${files.length} files, maximum allowed limit is ${maxBatch}`,
      fix: 'Use --max-batch to raise the file limit or narrow your target directory.',
    });
  }

  const records = [];
  let totalIn = 0;

  for (const f of files) {
    try {
      const bytes = await safeRead(f, options);
      totalIn += bytes.length;
      const detected = detectFormat(bytes);

      if (detected === 'svg' && !options.allowUnsafe) {
        const s = checkSvgSafety(bytes);
        if (!s.safe) {
          records.push({ file: f, error: `Unsafe SVG: ${s.detail}` });
          continue;
        }
      }

      const info = await withTimeout(inspectImage(bytes), options.timeout || 5000, `inspectImage(${f})`);
      const chunks = parseChunks(bytes);
      const metadataChunks = chunks.filter((c) => c.isMetadata);

      let previewDataUri = null;
      if (options.html && bytes.length <= 1024 * 1024) {
        const mime = info.format === 'svg' ? 'image/svg+xml' : `image/${info.format || 'png'}`;
        previewDataUri = `data:${mime};base64,${bytes.toString('base64')}`;
      }

      records.push({
        file: f,
        bytes: bytes.length,
        format: info.format,
        width: info.width,
        height: info.height,
        hasAlpha: info.hasAlpha,
        metadataCount: metadataChunks.length,
        previewDataUri,
      });
    } catch (err) {
      records.push({ file: f, error: err.message });
    }
  }

  const report = {
    totalFiles: files.length,
    totalBytes: totalIn,
    records,
  };

  if (options.html) {
    const outPath = typeof options.html === 'string' ? options.html : 'lens-report.html';
    const writtenHtml = await generateHtmlReport(records, outPath, options);
    report.htmlReport = writtenHtml;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(createJsonEnvelope('report', report), null, 2) + '\n');
  } else {
    process.stdout.write(`Batch Lens Report (${files.length} files analyzed)\n`);
    process.stdout.write('─'.repeat(45) + '\n');
    for (const r of records) {
      if (r.error) {
        process.stdout.write(`  ❌ ${r.file}: ${r.error}\n`);
      } else {
        process.stdout.write(`  ✅ ${r.file}: ${(r.format || '').toUpperCase()} (${formatBytes(r.bytes)}) [Alpha: ${r.hasAlpha}]\n`);
      }
    }
    process.stdout.write(`Total analyzed size: ${formatBytes(totalIn)}\n`);
    if (report.htmlReport) {
      process.stdout.write(`HTML Report generated: ${report.htmlReport}\n`);
    }
  }

  return report;
}

module.exports = {
  inspectCommand,
  compareCommand,
  alphaCommand,
  diffCommand,
  reportCommand,
  verifyCommand,
  safeRead,
  LensError,
};
