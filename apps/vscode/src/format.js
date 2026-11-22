'use strict';

const vscode = require('vscode');

/**
 * Maps common file extensions to canonical format identifiers.
 * @type {Record<string, string>}
 */
const EXTENSION_MAP = Object.freeze({
  svg: 'svg',
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  tif: 'tiff',
  tiff: 'tiff',
  heic: 'heic',
  heif: 'heic',
  ico: 'ico',
  cur: 'cur',
});

/**
 * Derives format identifier from file path extension.
 * @param {string} filepath
 * @returns {string|null}
 */
function formatFromExtension(filepath) {
  if (!filepath || typeof filepath !== 'string') return null;
  const parts = filepath.replace(/\\/g, '/').split('/');
  const filename = parts.pop() || '';
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  const ext = filename.substring(dotIndex + 1).toLowerCase();
  return EXTENSION_MAP[ext] || null;
}

/**
 * Sniffs image format from magic bytes or textual SVG markup.
 * @param {Uint8Array|Buffer} bytes
 * @returns {string|null}
 */
function detectFormatFromBytes(bytes) {
  if (!bytes || bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // GIF: GIF87a or GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'gif';
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  // AVIF / HEIC container check (ISO Base Media File Format / ftyp box)
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const boxSize = Math.min(bytes.length, 64);
    const brands = Buffer.from(bytes.subarray(8, boxSize)).toString('ascii').toLowerCase();
    if (brands.includes('avif') || brands.includes('avis')) {
      return 'avif';
    }
    if (
      brands.includes('heic') ||
      brands.includes('heix') ||
      brands.includes('hevc') ||
      brands.includes('heif') ||
      brands.includes('mif1') ||
      brands.includes('msf1')
    ) {
      return 'heic';
    }
  }

  // ICO: 00 00 01 00
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return 'ico';
  }

  // CUR: 00 00 02 00
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x02 && bytes[3] === 0x00) {
    return 'cur';
  }

  // TIFF: II*. or MM.*
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a) ||
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2b && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2b)
  ) {
    return 'tiff';
  }

  // SVG: textual scan
  const sample = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 2048)))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();
  if (/<svg(?:\s|\/?>)/i.test(sample) || /^<\?xml[\s\S]*?<svg(?:\s|\/?>)/i.test(sample)) {
    return 'svg';
  }

  return null;
}

/**
 * Determines the true image format using magic byte inspection with size-capped fallback.
 * @param {vscode.Uri} uri
 * @returns {Promise<string|null>}
 */
async function getRealFormat(uri) {
  try {
    let stat = null;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {}

    // Files larger than 5MB: read header bytes only, or fall back to extension
    if (stat && stat.size > 5 * 1024 * 1024) {
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const header = bytes.subarray(0, 4096);
        const sniffed = detectFormatFromBytes(header);
        if (sniffed) return sniffed;
      } catch {}
      return formatFromExtension(uri.path);
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    const detected = detectFormatFromBytes(bytes);
    if (detected) return detected;

    return formatFromExtension(uri.path);
  } catch {
    return formatFromExtension(uri?.path);
  }
}

module.exports = {
  getRealFormat,
  detectFormatFromBytes,
  formatFromExtension,
  EXTENSION_MAP,
};
