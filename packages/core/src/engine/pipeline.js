'use strict';

const { createError } = require('../errors');
const { assertSvgSafety } = require('../safety/svg');
const { decode } = require('./decode');
const { applyTransforms } = require('./transform');
const { encode } = require('./encode');
const { defaultJournal } = require('../journal');
const {
  detectFormat,
  validateImageBytes,
  checkDimensions,
  verifyAlpha,
  detectMetadata,
  cleanBytes,
  MAX_DIMENSION,
} = require('../index');

/**
 * Runs the strict 7-step safety chain pipeline from input bytes to output bytes.
 * Enforces Discipline 7: The safety chain cannot be bypassed.
 *
 * @param {Uint8Array|Buffer} input - Source bytes
 * @param {import('../types').ConvertOptions} options - Options
 * @returns {Promise<Uint8Array>}
 */
async function runPipeline(input, options = {}) {
  const startTime = Date.now();

  // Step 1: validateBytes
  validateImageBytes(input);
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);

  // Step 2: checkInputSafety
  const format = detectFormat(data);
  if (format === 'svg') {
    assertSvgSafety(data, options);
  }

  // Step 3: validateSize
  const maxInputBytes = options.maxInputBytes || options.maxBytes;
  if (maxInputBytes && data.length > maxInputBytes) {
    throw createError('E_TOO_LARGE', `Input size of ${data.length} bytes exceeds maximum limit of ${maxInputBytes} bytes.`);
  }

  // Step 4: decode
  const rawImage = await decode(data, format, options);
  checkDimensions(rawImage.width, rawImage.height);

  // Step 5: applyTransforms
  const transforms = Array.isArray(options.transforms) ? options.transforms : [];
  const transformedImage = transforms.length > 0
    ? await applyTransforms(rawImage, transforms, options)
    : rawImage;

  // Step 6: encode
  const toFormat = options.to || options.format || 'webp';
  let outputBytes = await encode(transformedImage, toFormat, options);

  // Step 7: verifyOutput
  if (options.clean || options.stripMetadata) {
    outputBytes = await cleanBytes(outputBytes);
  }

  const maxOutputBytes = options.maxOutputBytes;
  if (maxOutputBytes && outputBytes.length > maxOutputBytes) {
    throw createError('E_OUTPUT_TOO_LARGE', `Output size of ${outputBytes.length} bytes exceeds limit of ${maxOutputBytes} bytes.`);
  }

  // Record in Transaction Journal (Discipline 4 & ISO 27001 A.8.1)
  const durationMs = Date.now() - startTime;
  defaultJournal.record({
    inputBytes: data,
    outputBytes,
    fromFormat: format,
    toFormat,
    durationMs,
    options,
  });

  return outputBytes;
}

/**
 * Inspects image bytes without converting.
 * @param {Uint8Array|Buffer} input
 * @returns {Promise<import('../types').InspectResult>}
 */
async function runInspect(input) {
  validateImageBytes(input);
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const format = detectFormat(data);
  const raw = await decode(data, format);
  const metadata = detectMetadata(data);
  const alphaResult = await verifyAlpha(data);

  return {
    format,
    width: raw.width,
    height: raw.height,
    hasAlpha: alphaResult.hasAlpha,
    bytes: data.length,
    metadata: {
      hasExif: metadata.exif,
      hasXmp: metadata.xmp,
      hasC2pa: metadata.c2pa,
      summary: metadata.summary,
    },
  };
}

module.exports = {
  runPipeline,
  runInspect,
};

