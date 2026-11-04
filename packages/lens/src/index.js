'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { inspectImage, verifyAlpha, detectFormat } = require('@zapwebp/core');
const { parseChunks } = require('./inspect/chunks');
const { renderInspectTerminal, renderCompareTerminal, formatBytes } = require('./render/terminal');
const { openHtml } = require('./render/html');

async function inspectCommand(filePath, options = {}) {
  const resolved = path.resolve(filePath);
  const bytes = await fs.readFile(resolved);
  const info = await inspectImage(bytes);
  const chunks = parseChunks(bytes);

  const result = {
    file: filePath,
    bytes: bytes.length,
    format: info.format,
    width: info.width,
    height: info.height,
    hasAlpha: info.hasAlpha,
    chunks,
    metadata: info.metadata,
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(renderInspectTerminal(result, filePath));
  }

  if (options.open) {
    await openHtml(result, bytes, null, filePath, null);
  }
  return result;
}

async function compareCommand(fileA, fileB, options = {}) {
  const bytesA = await fs.readFile(path.resolve(fileA));
  const bytesB = await fs.readFile(path.resolve(fileB));
  const infoA = await inspectImage(bytesA);
  const infoB = await inspectImage(bytesB);

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
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(renderCompareTerminal({ ...infoA, bytes: bytesA.length }, { ...infoB, bytes: bytesB.length }, fileA, fileB));
  }

  if (options.open) {
    await openHtml(result, bytesA, bytesB, fileA, fileB);
  }
  return result;
}

async function alphaCommand(filePath, options = {}) {
  const resolved = path.resolve(filePath);
  const bytes = await fs.readFile(resolved);
  const alphaCheck = await verifyAlpha(bytes);

  const result = {
    file: filePath,
    hasAlpha: alphaCheck.hasAlpha,
    alphaPreserved: alphaCheck.alphaPreserved,
    cornerAlpha: alphaCheck.cornerAlpha,
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(`Alpha inspection: ${filePath}\n`);
    process.stdout.write(`  Has transparent pixels: ${alphaCheck.hasAlpha ? 'YES ✅' : 'NO (Opaque)'}\n`);
    process.stdout.write(`  Corner pixels alpha:   [${alphaCheck.cornerAlpha?.join(', ')}]\n`);
  }

  if (options.open) {
    await openHtml(result, bytes, null, filePath, null);
  }
  return result;
}

async function diffCommand(fileA, fileB, options = {}) {
  const bytesA = await fs.readFile(path.resolve(fileA));
  const bytesB = await fs.readFile(path.resolve(fileB));
  const chunksA = parseChunks(bytesA);
  const chunksB = parseChunks(bytesB);

  const result = {
    fileA,
    fileB,
    bytesA: bytesA.length,
    bytesB: bytesB.length,
    diffBytes: bytesB.length - bytesA.length,
    chunksA: chunksA.map((c) => c.type),
    chunksB: chunksB.map((c) => c.type),
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(`Hex & Container Diff: ${fileA} ↔ ${fileB}\n`);
    process.stdout.write(`  ${fileA}: ${formatBytes(bytesA.length)} [${chunksA.map((c) => c.type).join(', ')}]\n`);
    process.stdout.write(`  ${fileB}: ${formatBytes(bytesB.length)} [${chunksB.map((c) => c.type).join(', ')}]\n`);
    process.stdout.write(`  Difference: ${result.diffBytes > 0 ? `+${result.diffBytes}` : result.diffBytes} bytes\n`);
  }
  return result;
}

async function reportCommand(files, options = {}) {
  const records = [];
  let totalIn = 0;

  for (const f of files) {
    try {
      const bytes = await fs.readFile(path.resolve(f));
      totalIn += bytes.length;
      const info = await inspectImage(bytes);
      records.push({
        file: f,
        bytes: bytes.length,
        format: info.format,
        hasAlpha: info.hasAlpha,
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

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
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
  }
  return report;
}

module.exports = {
  inspectCommand,
  compareCommand,
  alphaCommand,
  diffCommand,
  reportCommand,
};
