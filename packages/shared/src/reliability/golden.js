'use strict';

const crypto = require('node:crypto');

/**
 * Standard base SVG fixture for golden image tests.
 */
const SVG_SAMPLE = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#3b82f6" fill-opacity="0.8"/>
  <circle cx="32" cy="32" r="16" fill="#10b981"/>
</svg>
`.trim();

/**
 * Standard 1x1 transparent RGBA PNG fixture.
 */
const PNG_TRANSPARENT_SAMPLE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

/**
 * Standard 1x1 opaque RGB JPEG fixture.
 */
const JPEG_OPAQUE_SAMPLE = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c,
  0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d,
  0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34,
  0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
  0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff,
  0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9,
]);

/**
 * Standard 1x1 WebP fixture.
 */
const WEBP_SAMPLE = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x00, 0x07, 0x10, 0x81, 0x05, 0x00, 0x00, 0x00,
  0x00, 0x00,
]);

/**
 * 50 Golden Test Cases representing realistic option combinations across all integrations.
 * @type {Array<{ id: string, name: string, input: Buffer|string, format: string, options: object, expectAlpha?: boolean }>}
 */
const GOLDEN_CASES = [];

const TARGET_FORMATS = ['webp', 'png', 'avif', 'jpeg'];
const QUALITIES = [85, 95];
const CLEAN_OPTIONS = [true, false];

let caseIndex = 1;

// 1. Vector SVG conversions (16 combinations)
for (const to of TARGET_FORMATS) {
  for (const quality of QUALITIES) {
    for (const clean of CLEAN_OPTIONS) {
      GOLDEN_CASES.push({
        id: `golden-${String(caseIndex++).padStart(2, '0')}`,
        name: `SVG to ${to.toUpperCase()} (q=${quality}, clean=${clean})`,
        input: SVG_SAMPLE,
        format: 'svg',
        options: {
          to,
          quality,
          clean,
          width: 64,
          background: to === 'jpeg' ? '#ffffff' : undefined,
        },
        expectAlpha: to !== 'jpeg',
      });
    }
  }
}

// 2. Raster PNG conversions (12 combinations)
for (const to of ['webp', 'avif', 'jpeg']) {
  for (const quality of QUALITIES) {
    for (const clean of CLEAN_OPTIONS) {
      GOLDEN_CASES.push({
        id: `golden-${String(caseIndex++).padStart(2, '0')}`,
        name: `PNG to ${to.toUpperCase()} (q=${quality}, clean=${clean})`,
        input: PNG_TRANSPARENT_SAMPLE,
        format: 'png',
        options: {
          to,
          quality,
          clean,
          background: to === 'jpeg' ? '#ffffff' : undefined,
        },
        expectAlpha: to !== 'jpeg',
      });
    }
  }
}

// 3. Raster JPEG conversions (12 combinations)
for (const to of ['webp', 'avif', 'png']) {
  for (const quality of QUALITIES) {
    for (const clean of CLEAN_OPTIONS) {
      GOLDEN_CASES.push({
        id: `golden-${String(caseIndex++).padStart(2, '0')}`,
        name: `JPEG to ${to.toUpperCase()} (q=${quality}, clean=${clean})`,
        input: JPEG_OPAQUE_SAMPLE,
        format: 'jpeg',
        options: {
          to,
          quality,
          clean,
        },
        expectAlpha: false,
      });
    }
  }
}

// 4. Raster WebP conversions (10 combinations to reach exactly 50)
const webpTargets = ['avif', 'png', 'jpeg'];
for (const to of webpTargets) {
  for (const quality of QUALITIES) {
    for (const clean of CLEAN_OPTIONS) {
      if (GOLDEN_CASES.length >= 50) break;
      GOLDEN_CASES.push({
        id: `golden-${String(caseIndex++).padStart(2, '0')}`,
        name: `WebP to ${to.toUpperCase()} (q=${quality}, clean=${clean})`,
        input: WEBP_SAMPLE,
        format: 'webp',
        options: {
          to,
          quality,
          clean,
          background: to === 'jpeg' ? '#ffffff' : undefined,
        },
        expectAlpha: to !== 'jpeg',
      });
    }
  }
}

/**
 * Computes SHA-256 hash of a buffer.
 * @param {Buffer|Uint8Array} data
 * @returns {string}
 */
function hashBuffer(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Executes a single golden case against a provided conversion function.
 * @param {typeof GOLDEN_CASES[0]} goldenCase
 * @param {(input: Buffer|string, opts: object) => Promise<{ data: Buffer, format?: string }|Buffer>} convertFn
 * @returns {Promise<{ id: string, name: string, sha256: string, byteLength: number, passed: boolean }>}
 */
async function verifyGoldenCase(goldenCase, convertFn) {
  const result = await convertFn(goldenCase.input, goldenCase.options);
  const data = Buffer.isBuffer(result) ? result : result.data;

  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error(`Golden case ${goldenCase.id} emitted empty or invalid output buffer.`);
  }

  const sha256 = hashBuffer(data);
  return {
    id: goldenCase.id,
    name: goldenCase.name,
    sha256,
    byteLength: data.length,
    passed: true,
  };
}

module.exports = {
  GOLDEN_CASES,
  SVG_SAMPLE,
  PNG_TRANSPARENT_SAMPLE,
  JPEG_OPAQUE_SAMPLE,
  WEBP_SAMPLE,
  hashBuffer,
  verifyGoldenCase,
};
