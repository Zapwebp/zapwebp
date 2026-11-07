'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const formats = require('./formats');
const metadata = require('./metadata');
const {
  MAX_DIMENSION,
  MAX_PIXELS,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  DEFAULT_OPTIONS,
  ZapwebpError,
} = require('@zapwebp/shared');
const {
  resolvePolicy,
  checkPolicyInput,
  evaluateQuality,
} = require('./policy');

let _sharpInstance = null;
function getSharp() {
  if (_sharpInstance) return _sharpInstance;
  try {
    _sharpInstance = require('sharp');
    return _sharpInstance;
  } catch (err) {
    throw new ZapwebpError({
      code: 'E_ENGINE_UNAVAILABLE',
      message: 'Native raster engine (sharp) is not available in this environment: ' + (err && err.message ? err.message : String(err)),
      fix: 'Install sharp via "npm install sharp" or ensure native prebuilts are compiled for this architecture.',
    });
  }
}

let _resvgInstance = null;
function getResvg() {
  if (_resvgInstance) return _resvgInstance;
  try {
    const mod = require('@resvg/resvg-js');
    _resvgInstance = mod.Resvg || mod;
    return _resvgInstance;
  } catch (err) {
    throw new ZapwebpError({
      code: 'E_ENGINE_UNAVAILABLE',
      message: 'Native vector engine (@resvg/resvg-js) is not available in this environment: ' + (err && err.message ? err.message : String(err)),
      fix: 'Install @resvg/resvg-js or ensure native prebuilts are compiled for this architecture.',
    });
  }
}

const MAX_WIDTH = MAX_DIMENSION;
const FIT_MODES = Object.freeze(['contain', 'cover', 'fill', 'inside', 'outside']);

const SVG_DANGER_RE = /<(?:script|foreignObject)\b|\bon\w+\s*=|<\!ENTITY|<\!DOCTYPE|@import/i;

/**
 * Validates pre-flight buffer integrity.
 * @param {Buffer|Uint8Array|string} input
 */
function validateImageBytes(input) {
  const data = asBuffer(input);
  if (!data || data.length === 0) {
    throw new ZapwebpError({
      code: 'E_EMPTY_FILE',
      message: 'The file is empty (0 bytes).',
      fix: 'Verify the file source or complete the download before converting.',
    });
  }
  if (data.length < 16) {
    // Check if it's a tiny valid SVG string before failing
    const str = data.toString('utf8');
    if (str.includes('<svg')) return;
    throw new ZapwebpError({
      code: 'E_CORRUPT_HEADER',
      message: 'File is too small to contain a valid container header.',
      fix: 'The asset appears truncated or corrupt.',
    });
  }
}

function asBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (typeof input === 'string') return Buffer.from(input, 'utf8');
  throw new Error('Image input must be a string or byte array.');
}

function detectFormat(input) {
  const data = asBuffer(input);
  if (!data.length) throw new Error('The input file is empty.');
  const registered = formats.detectFormatHandler(data);
  if (registered) return registered.name;
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg';
  if (data.length >= 6 && (data.subarray(0, 6).toString('ascii') === 'GIF87a' || data.subarray(0, 6).toString('ascii') === 'GIF89a')) return 'gif';
  if (data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (data.length >= 12 && data.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brands = data.subarray(8, Math.min(data.length, 4096)).toString('ascii');
    if (brands.includes('avif') || brands.includes('avis')) return 'avif';
  }
  if (data.length >= 4 && (
    data.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00]))
    || data.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))
    || data.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2b, 0x00]))
    || data.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2b]))
  )) return 'tiff';
  if (data.length >= 2 && data.subarray(0, 2).toString('ascii') === 'BM') throw new Error('BMP input is not supported yet.');
  if (data.length >= 4 && data[0] === 0 && data[1] === 0 && data[2] === 1 && data[3] === 0) throw new Error('ICO input is not supported yet.');
  const text = data.subarray(0, Math.min(data.length, 4096)).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  if (/<svg(?:\s|\/?>)/i.test(text) || /^<\?xml[\s\S]*?<svg(?:\s|\/?>)/i.test(text)) return 'svg';
  throw new Error('Unsupported or unrecognized image format. Supported inputs: SVG, PNG, JPEG, WebP, AVIF, GIF, and TIFF.');
}

function validateSvg(input) {
  const svg = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  if (Buffer.byteLength(svg) === 0 || !/<svg(?:\s|\/?>)/i.test(svg)) throw new Error('This file does not contain a valid SVG document.');
  if (SVG_DANGER_RE.test(svg)) {
    if (/<(?:script|foreignObject)\b/i.test(svg) || /\bon\w+\s*=/i.test(svg)) throw new Error('This SVG contains active content and cannot be converted.');
    if (/<!ENTITY\b/i.test(svg)) throw new Error('Custom XML entities are not supported.');
    if (/<!DOCTYPE\b/i.test(svg)) throw new Error('DOCTYPE declarations are not supported.');
    if (/@import\b/i.test(svg)) throw new Error('External stylesheet imports are not supported.');
  }
  let decoded;
  try {
    decoded = svg
      .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/gi, '&');
  } catch { throw new Error('This SVG contains an invalid character reference.'); }
  let normalized;
  try {
    normalized = decoded.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([\da-f]{1,6})\s?/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
  } catch { throw new Error('This SVG contains an invalid CSS escape.'); }
  const safeReference = (value) => {
    const ref = value.trim().replace(/^("|')([\s\S]*)\1$/, '$2').trim();
    return ref.startsWith('#') || /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=]+$/i.test(ref) || /^data:font\/(?:woff2?|ttf|otf);base64,[a-z\d+/=]+$/i.test(ref);
  };
  const attributeRefs = /(?:href|src)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of normalized.matchAll(attributeRefs)) if (!safeReference(match[2])) throw new Error('External references are not supported. Embed raster images and fonts in the SVG first.');
  if (/@import\b/i.test(normalized)) throw new Error('External stylesheet imports are not supported.');
  for (const match of normalized.matchAll(/url\(\s*([^)]*?)\s*\)/gi)) if (!safeReference(match[1])) throw new Error('External references are not supported. Embed images and fonts in the SVG first.');
  return svg;
}

/**
 * Non-throwing SVG safety verification returning structured diagnostic.
 * @param {Buffer|Uint8Array|string} input
 * @param {object} [options]
 * @returns {{ safe: boolean, reason?: string, detail?: string }}
 */
function checkSvgSafety(input, options = {}) {
  try {
    validateSvg(input);
    return { safe: true };
  } catch (err) {
    return { safe: false, reason: 'unsafe_svg', detail: err.message };
  }
}

function svgDimensions(svg) {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] || '';
  const attribute = (name) => root.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
  const viewBox = attribute('viewBox');
  if (viewBox) {
    const values = viewBox.trim().split(/[\s,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) return { width: values[2], height: values[3] };
  }
  const dimension = (name) => {
    const value = attribute(name);
    const match = value?.trim().match(/^([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:px)?$/i);
    return match ? Number(match[1]) : undefined;
  };
  return { width: dimension('width'), height: dimension('height') };
}

/**
 * Scans an image container for embedded metadata, EXIF, XMP, C2PA, text chunks, and comments.
 * @param {Buffer|Uint8Array|string} input
 * @returns {{ hasMetadata: boolean, exif: boolean, xmp: boolean, c2pa: boolean, comments: boolean, chunks: string[], summary: string[] }}
 */
function detectMetadata(input) {
  const data = asBuffer(input);
  const detected = {
    hasMetadata: false,
    exif: false,
    xmp: false,
    c2pa: false,
    comments: false,
    chunks: [],
    summary: [],
  };

  if (!data.length) return detected;

  // 1. Text/SVG Check
  const textSample = data.subarray(0, Math.min(data.length, 8192)).toString('utf8');
  if (/<(?:rdf:RDF|metadata|dc:format|xmp:CreatorTool)/i.test(textSample)) {
    detected.hasMetadata = true;
    detected.xmp = true;
    detected.summary.push('XMP XML metadata');
  }
  if (/c2pa|jumbf/i.test(textSample)) {
    detected.hasMetadata = true;
    detected.c2pa = true;
    detected.summary.push('C2PA manifest');
  }

  // 2. PNG Chunk Walker
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    let offset = 8;
    while (offset + 8 <= data.length) {
      const length = data.readUInt32BE(offset);
      const type = data.subarray(offset + 4, offset + 8).toString('ascii');
      detected.chunks.push(type);
      if (['eXIf', 'iTXt', 'tEXt', 'zTXt', 'tIME', 'pHYs'].includes(type)) {
        detected.hasMetadata = true;
        if (type === 'eXIf') { detected.exif = true; detected.summary.push('PNG eXIf'); }
        else if (type === 'iTXt' || type === 'tEXt' || type === 'zTXt') {
          const content = data.subarray(offset + 8, Math.min(offset + 8 + length, data.length)).toString('utf8');
          if (/xmp|adobe|rdf/i.test(content)) detected.xmp = true;
          if (/c2pa|jumb/i.test(content)) detected.c2pa = true;
          detected.summary.push(`PNG ${type}`);
        }
      }
      if (type === 'c2pa' || type === 'jumb') {
        detected.hasMetadata = true;
        detected.c2pa = true;
        detected.summary.push('PNG C2PA');
      }
      offset += 12 + length;
    }
  }

  // 3. JPEG Marker Walker
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) { offset++; continue; }
      const marker = data[offset + 1];
      if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
      const length = data.readUInt16BE(offset + 2);
      if (marker === 0xe1) { // APP1: EXIF or XMP
        detected.hasMetadata = true;
        const app1Header = data.subarray(offset + 4, Math.min(offset + 4 + length, data.length)).toString('utf8');
        if (app1Header.startsWith('Exif')) { detected.exif = true; detected.summary.push('JPEG EXIF'); }
        else if (app1Header.includes('adobe.com') || app1Header.includes('xmp')) { detected.xmp = true; detected.summary.push('JPEG XMP'); }
      } else if (marker === 0xeb) { // APP11: JUMBF / C2PA
        detected.hasMetadata = true;
        detected.c2pa = true;
        detected.summary.push('JPEG C2PA (JUMBF)');
      } else if (marker === 0xed) { // APP13: Photoshop IPTC
        detected.hasMetadata = true;
        detected.summary.push('JPEG Photoshop / IPTC');
      } else if (marker === 0xfe) { // COM
        detected.hasMetadata = true;
        detected.comments = true;
        detected.summary.push('JPEG Comment');
      }
      offset += 2 + length;
    }
  }

  // 4. WebP RIFF Walker
  if (data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
    let offset = 12;
    while (offset + 8 <= data.length) {
      const fourcc = data.subarray(offset, offset + 4).toString('ascii');
      const size = data.readUInt32LE(offset + 4);
      detected.chunks.push(fourcc);
      if (fourcc === 'EXIF') { detected.hasMetadata = true; detected.exif = true; detected.summary.push('WebP EXIF'); }
      else if (fourcc === 'XMP ') { detected.hasMetadata = true; detected.xmp = true; detected.summary.push('WebP XMP'); }
      else if (fourcc === 'ICCP') { detected.hasMetadata = true; detected.summary.push('WebP ICCP'); }
      offset += 8 + size + (size % 2); // pad byte
    }
  }

  detected.summary = [...new Set(detected.summary)];
  return detected;
}

/**
 * Scans an output buffer and generates a tamper-evident Clean Certificate.
 * @param {Buffer|Uint8Array} output
 * @returns {{ sha256: string, chunks: string[], metadataChunks: number, verified: boolean, verifiedAt: string, tool: string }}
 */
function generateCleanCertificate(output) {
  const data = asBuffer(output);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const metadata = detectMetadata(data);
  const verified = !metadata.hasMetadata;

  return {
    sha256: hash,
    chunks: metadata.chunks,
    metadataChunks: metadata.summary.length,
    verified,
    verifiedAt: new Date().toISOString(),
    tool: 'zap@1.1.0',
  };
}

/**
 * Inspects corner and edge pixels of an image buffer to verify alpha preservation.
 * @param {Buffer|Uint8Array} input
 * @returns {Promise<{ hasAlpha: boolean, alphaPreserved: boolean, cornerAlpha: number[] }>}
 */
async function verifyAlpha(input) {
  const data = asBuffer(input);
  const { data: raw, info } = await getSharp()(data, { limitInputPixels: MAX_PIXELS }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const getAlpha = (x, y) => raw[(y * w + x) * 4 + 3];
  const corners = [
    getAlpha(0, 0),
    getAlpha(Math.max(0, w - 1), 0),
    getAlpha(0, Math.max(0, h - 1)),
    getAlpha(Math.max(0, w - 1), Math.max(0, h - 1)),
  ];

  let anyTransparent = false;
  for (let i = 3; i < raw.length; i += 4) {
    if (raw[i] < 255) {
      anyTransparent = true;
      break;
    }
  }

  return {
    hasAlpha: anyTransparent,
    alphaPreserved: anyTransparent,
    cornerAlpha: corners,
  };
}

/**
 * Audits a shell command proposed by an AI agent or developer for known alpha loss or metadata leak pitfalls.
 * @param {string} command - Shell command string (e.g. "magick logo.svg logo.webp")
 * @returns {{ safe: boolean, issues: string[], recommendedCommand: string }}
 */
function auditConversionCommand(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Command must be a non-empty string.');
  }

  const issues = [];
  const cmd = command.trim();
  const isImageMagick = /\b(magick|convert)\b/i.test(cmd);
  const isSvgInput = /\.svg\b/i.test(cmd);
  const isWebpOutput = /\.webp\b/i.test(cmd);
  const isJpegOutput = /\.(jpe?g)\b/i.test(cmd);
  const hasBackgroundNone = /-background\s+none\b/i.test(cmd);
  const hasStrip = /-strip\b/i.test(cmd);

  if (isImageMagick && isSvgInput && !hasBackgroundNone) {
    issues.push('ImageMagick defaults to compositing SVG onto a solid black or opaque canvas unless -background none is passed.');
  }
  if (isImageMagick && !hasStrip) {
    issues.push('Command does not strip container metadata (EXIF/XMP/C2PA/software provenance).');
  }
  if (isJpegOutput && isSvgInput) {
    issues.push('Target format is JPEG, which cannot store transparency. Transparent regions will turn black unless an explicit background color is flattened.');
  }
  if (/\bcwebp\b/i.test(cmd) && isSvgInput) {
    issues.push('cwebp cannot decode vector SVG directly; passing SVG directly to cwebp fails.');
  }

  const safe = issues.length === 0;
  const inputMatch = cmd.match(/['"]?([a-zA-Z0-9_\-./\\]+\.(svg|png|jpe?g|webp|avif|gif|tiff?))['"]?/i);
  const file = inputMatch ? inputMatch[1] : 'image.svg';
  const outExt = isWebpOutput ? 'webp' : isJpegOutput ? 'jpg' : 'webp';
  const recommendedCommand = `zap "${file}" --to ${outExt} --clean`;

  return {
    safe,
    issues,
    recommendedCommand,
  };
}

/**
 * Explains the technical root causes of SVG-to-WebP black backgrounds and provides the correct remedy.
 * @param {object} [context]
 * @returns {{ cause: string, technicalDetails: string[], remedy: string, zapSolution: string }}
 */
function explainBlackBackground(context = {}) {
  return {
    cause: 'Single-step rasterization without explicit transparent canvas initialization or alpha quality retention.',
    technicalDetails: [
      'ImageMagick and Cairo default uninitialized raster canvases to solid black (RGB 0, 0, 0) instead of transparent RGBA (0, 0, 0, 0).',
      'Many WebP encoders drop alpha or set alpha compression quality to 0 in lossy mode unless explicitly given alpha_q: 100.',
      'JPEG targets lack an alpha channel entirely, collapsing all transparent pixels into black boxes.',
    ],
    remedy: 'Use a two-stage pipeline: (1) render SVG over explicit transparent canvas (resvg), then (2) encode to WebP with alpha retention (cwebp -alpha_q 100).',
    zapSolution: 'zap <file.svg> --to webp (or convert_image MCP tool). Zap always defaults background to "transparent" and enforces alpha preservation by construction.',
  };
}

function normalizeOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Conversion options must be an object.');
  const lockTarget = options.lockTarget || options.lock;
  const overrideLock = Boolean(options.overrideLock);
  const strict = options.strict !== undefined ? Boolean(options.strict) : true;
  let to;
  if (lockTarget && !overrideLock) {
    to = String(lockTarget).toLowerCase();
  } else {
    to = String(options.to ?? DEFAULT_OPTIONS.to).toLowerCase();
  }
  if (!OUTPUT_FORMATS.includes(to)) throw new Error(`Unsupported output format: ${to}. Choose ${OUTPUT_FORMATS.join(', ')}.`);
  const quality = Number(options.quality ?? DEFAULT_OPTIONS.quality);
  if (!Number.isInteger(quality) || quality < 0 || quality > 100) throw new Error('Quality must be an integer between 0 and 100.');
  const effort = Number(options.effort ?? DEFAULT_OPTIONS.effort);
  if (!Number.isInteger(effort) || effort < 0 || effort > 9) throw new Error('Effort must be an integer between 0 and 9.');
  const dimension = (key) => {
    if (options[key] === undefined) return undefined;
    const value = Number(options[key]);
    if (!Number.isInteger(value) || value < 1 || value > MAX_WIDTH) throw new Error(`${key} must be an integer between 1 and ${MAX_WIDTH}.`);
    return value;
  };
  const width = dimension('width');
  const height = dimension('height');
  const fit = String(options.fit ?? DEFAULT_OPTIONS.fit).toLowerCase();
  if (!FIT_MODES.includes(fit)) throw new Error(`Fit must be one of ${FIT_MODES.join(', ')}.`);
  if (options.lossless !== undefined && typeof options.lossless !== 'boolean') throw new Error('Lossless must be a boolean.');
  if (options.stripMetadata !== undefined && typeof options.stripMetadata !== 'boolean') throw new Error('stripMetadata must be a boolean.');
  if (options.clean !== undefined && typeof options.clean !== 'boolean') throw new Error('clean must be a boolean.');
  const clean = options.clean !== undefined ? Boolean(options.clean) : (options.stripMetadata ?? DEFAULT_OPTIONS.clean);
  const stripMetadata = clean;
  const verify = Boolean(options.verify || options.verifyClean);
  const assertAlpha = Boolean(options.assertAlpha);
  const report = Boolean(options.report);
  const transforms = Array.isArray(options.transforms)
    ? options.transforms.filter((t) => t && typeof t.apply === 'function')
    : undefined;
  for (const key of ['background', 'svgBackground']) if (options[key] !== undefined && (typeof options[key] !== 'string' || !options[key].trim() || options[key].length > 64)) throw new Error(`${key} must be a non-empty color string of 64 characters or fewer.`);
  return {
    to,
    width,
    height,
    fit,
    quality,
    lossless: options.lossless ?? false,
    effort,
    background: options.background,
    svgBackground: options.svgBackground,
    stripMetadata,
    clean,
    verify,
    assertAlpha,
    report,
    transforms,
    lockTarget,
    strict,
    overrideLock,
    policy: options.policy,
    maxOutputBytes: options.maxOutputBytes,
    targetOutputBytes: options.targetOutputBytes,
    accept: options.accept,
    reject: options.reject,
  };
}

function checkDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > MAX_WIDTH || height > MAX_WIDTH || width * height > MAX_PIXELS) {
    throw new Error(`Image dimensions exceed the ${MAX_WIDTH} px side or pixel-count limit.`);
  }
}

async function inspectImage(input) {
  const data = asBuffer(input);
  const format = detectFormat(data);
  const metadata = detectMetadata(data);
  if (format === 'svg') {
    const svg = validateSvg(data);
    const { width, height } = svgDimensions(svg);
    if (width && height && (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)) throw new Error('The SVG has invalid intrinsic dimensions.');
    return { format, width: width || undefined, height: height || undefined, hasAlpha: true, bytes: data.length, metadata };
  }
  const meta = await getSharp()(data, { limitInputPixels: MAX_PIXELS, pages: 1, animated: false, failOn: 'error' }).metadata();
  checkDimensions(meta.width, meta.height);
  return { format, width: meta.width, height: meta.height, hasAlpha: Boolean(meta.hasAlpha), bytes: data.length, metadata };
}

async function convertImage(input, options = {}) {
  const opts = normalizeOptions(options);
  const policy = resolvePolicy(opts.policy, opts);
  const data = asBuffer(input);

  // Policy check 1: Pre-decode input byte bounds
  if (policy.limits?.maxInputBytes && data.length > policy.limits.maxInputBytes) {
    throw new ZapwebpError({
      code: 'E_INPUT_TOO_LARGE',
      message: `Input is ${data.length} bytes, max is ${policy.limits.maxInputBytes}.`,
      fix: 'Compress the file, or increase maxInputBytes.',
      inputBytes: data.length,
      maxBytes: policy.limits.maxInputBytes,
      suggestedFix: {
        maxInputBytes: Math.ceil(data.length * 1.05),
        reason: 'Input exceeds maximum allowed ingress bytes.',
      },
    });
  }

  validateImageBytes(data);
  let format;
  try {
    format = detectFormat(data);
  } catch (err) {
    if (opts.lockTarget && !opts.strict) {
      return {
        data,
        format: 'unknown',
        width: undefined,
        height: undefined,
        size: data.length,
        alphaPreserved: false,
        alphaVerified: false,
        clean: false,
        removedMetadata: [],
        passedThrough: true,
        targetLockEnforced: Boolean(opts.lockTarget && !opts.overrideLock),
        targetLockBypassed: Boolean(opts.lockTarget && opts.overrideLock),
      };
    }
    if (opts.lockTarget && opts.strict) {
      throw new ZapwebpError({
        code: 'E_UNSUPPORTED_FORMAT',
        message: `Cannot decode this file into the locked target format (${opts.to}).`,
        fix: 'Upload a supported format, or install the format plugin for this file.',
        input: {
          detectedFormat: 'unknown',
          bytes: data.length,
        },
        target: opts.to,
      });
    }
    throw err;
  }

  // Policy check 2: Format allowlist & denylist based on detected bytes
  checkPolicyInput({ policy, data, detectedFormat: format });

  let source = data;
  let sourceHasAlpha;
  if (format === 'svg') {
    const svg = validateSvg(data);
    const dims = svgDimensions(svg);
    const aspect = dims.width && dims.height ? dims.height / dims.width : 1;
    const fitByCover = opts.fit === 'cover' || opts.fit === 'outside';
    const renderMode = opts.width && opts.height
      ? (fitByCover === (aspect > opts.height / opts.width) ? 'width' : 'height')
      : opts.height && !opts.width ? 'height' : 'width';
    const renderValue = renderMode === 'height' ? (opts.height ?? opts.width ?? 2048) : (opts.width ?? opts.height ?? 2048);
    const rasterWidth = renderMode === 'width' ? renderValue : Math.ceil(renderValue / aspect);
    const rasterHeight = renderMode === 'height' ? renderValue : Math.ceil(renderValue * aspect);
    checkDimensions(rasterWidth, rasterHeight);
    const resvgOptions = { background: opts.svgBackground ?? 'rgba(0, 0, 0, 0)' };
    resvgOptions.fitTo = { mode: renderMode, value: renderValue };
    const ResvgClass = getResvg();
    source = new ResvgClass(svg, resvgOptions).render().asPng();
    const svgMeta = await getSharp()(source, { limitInputPixels: MAX_PIXELS }).metadata();
    sourceHasAlpha = Boolean(svgMeta.hasAlpha);
  } else {
    const meta = await getSharp()(source, { limitInputPixels: MAX_PIXELS, pages: 1, animated: false, failOn: 'error' }).metadata();
    checkDimensions(meta.width, meta.height);
    sourceHasAlpha = Boolean(meta.hasAlpha);
  }

  const transformReports = [];
  let rawBufferInfo = null;

  if (opts.transforms && opts.transforms.length > 0) {
    let raw = await decodeToRgba(source, format === 'svg' ? 'png' : format);
    for (const step of opts.transforms) {
      if (typeof step.apply === 'function') {
        const inputDims = { width: raw.width, height: raw.height };
        const transformed = await step.apply(raw, opts);
        if (!transformed || !transformed.data || !transformed.width || !transformed.height) {
          throw new Error(`Transform "${step.name || 'unknown'}" returned an invalid RawImage.`);
        }
        checkDimensions(transformed.width, transformed.height);
        raw = transformed;
        const meta = typeof step.getMetadata === 'function' ? step.getMetadata() : (step.metadata || {});
        transformReports.push({
          name: step.name || 'transform',
          input: inputDims,
          output: { width: raw.width, height: raw.height },
          ...meta,
        });
      }
    }

    let hasAlpha = false;
    for (let i = 3; i < raw.data.length; i += 4) {
      if (raw.data[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
    sourceHasAlpha = hasAlpha;

    const rawBuffer = Buffer.isBuffer(raw.data)
      ? raw.data
      : Buffer.from(raw.data.buffer, raw.data.byteOffset, raw.data.byteLength);

    rawBufferInfo = {
      buffer: rawBuffer,
      rawOptions: {
        width: raw.width,
        height: raw.height,
        channels: 4,
      },
    };
  }

  // Quality & Compression Evaluation under Conversion Policy
  const evalQ = evaluateQuality({
    policy,
    inputFormat: format,
    inputBytes: data.length,
    hasAlpha: sourceHasAlpha,
    targetFormat: opts.to,
  });

  const targetQuality = options.quality !== undefined ? Number(options.quality) : evalQ.quality;
  const targetLossless = options.lossless !== undefined ? Boolean(options.lossless) : evalQ.lossless;

  if (opts.to === 'jpeg' && sourceHasAlpha && !opts.background) {
    throw new ZapwebpError({
      code: 'E_ALPHA_NOT_REPRESENTABLE',
      message: 'JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.',
      fix: 'Pass --background "#ffffff" or choose WebP/PNG/AVIF.',
      suggestedFix: { background: '#ffffff' },
    });
  }
  if (opts.to === 'jpeg' && targetLossless) throw new Error('JPEG output does not support lossless encoding.');

  const createPipeline = () => {
    const sharpInstance = getSharp();
    if (rawBufferInfo) {
      return sharpInstance(rawBufferInfo.buffer, { raw: rawBufferInfo.rawOptions });
    }
    return sharpInstance(source, { limitInputPixels: MAX_PIXELS, pages: 1, animated: false, failOn: 'error' });
  };

  const encodeWithQuality = async (q, isLossless) => {
    let p = createPipeline();
    if (opts.width || opts.height) p = p.resize({ width: opts.width, height: opts.height, fit: opts.fit, withoutEnlargement: false });
    if (opts.background && sourceHasAlpha) p = p.flatten({ background: opts.background });
    if (!policy.advanced.stripMetadata) p = p.withMetadata();
    const effort = policy.advanced.effort ?? opts.effort;
    if (opts.to === 'webp') p = p.webp({ quality: q, alphaQuality: 100, lossless: isLossless, effort: Math.round(effort * 6 / 9) });
    else if (opts.to === 'png') p = p.png({ compressionLevel: effort, adaptiveFiltering: true });
    else if (opts.to === 'jpeg') p = p.jpeg({ quality: q, mozjpeg: true });
    else p = p.avif({ quality: q, lossless: isLossless, effort });
    return await p.toBuffer({ resolveWithObject: true });
  };

  let effectiveQuality = targetQuality;
  let effectiveLossless = targetLossless;
  let { data: output, info } = await encodeWithQuality(effectiveQuality, effectiveLossless);
  checkDimensions(info.width, info.height);

  let qualityReducedBy = 0;
  let maxOutputHit = false;
  const limitMaxOutput = policy.limits?.maxOutputBytes || policy.limits?.targetOutputBytes;

  if (limitMaxOutput && output.length > limitMaxOutput) {
    let currentQ = effectiveQuality;
    while (output.length > limitMaxOutput && currentQ > 10) {
      currentQ -= 5;
      const res = await encodeWithQuality(currentQ, false);
      output = res.data;
      info = res.info;
    }

    if (output.length > limitMaxOutput) {
      throw new ZapwebpError({
        code: 'E_OUTPUT_TOO_LARGE',
        message: `Cannot fit output in ${limitMaxOutput} bytes (reached ${output.length} bytes at quality ${currentQ}).`,
        fix: 'Increase maxOutputBytes, or downscale the image.',
        actualBytes: output.length,
        maxBytes: limitMaxOutput,
        suggestedFix: {
          quality: 10,
          reason: 'Image exceeds maxOutputBytes even after reducing quality to 10.',
        },
      });
    }

    qualityReducedBy = effectiveQuality - currentQ;
    effectiveQuality = currentQ;
    effectiveLossless = false;
    maxOutputHit = true;
  }

  const inputMetadata = detectMetadata(data);
  const alphaPreserved = opts.to !== 'jpeg' && sourceHasAlpha && !opts.background;
  let certificate;
  if (opts.verify) {
    certificate = generateCleanCertificate(output);
  }

  if (opts.assertAlpha && sourceHasAlpha) {
    const check = await verifyAlpha(output);
    if (!check.hasAlpha) {
      throw new Error('Alpha assertion failed: output image does not contain transparent pixels.');
    }
  }

  const backgroundStatus = sourceHasAlpha
    ? (opts.background ? 'flattened' : 'preserved_alpha')
    : 'preserved_opaque';

  const transparency = backgroundStatus === 'flattened'
    ? 'flattened'
    : (sourceHasAlpha ? 'preserved' : 'preserved_opaque');

  return {
    data: output,
    format: opts.to,
    width: info.width,
    height: info.height,
    size: output.length,
    alphaPreserved,
    alphaVerified: alphaPreserved,
    backgroundStatus,
    transparency,
    flattenColor: opts.background || undefined,
    clean: opts.clean,
    removedMetadata: inputMetadata.summary,
    certificate,
    transforms: transformReports.length > 0 ? transformReports : undefined,
    targetLockEnforced: Boolean(opts.lockTarget && !opts.overrideLock),
    targetLockBypassed: Boolean(opts.lockTarget && opts.overrideLock),
    policy: {
      quality: {
        mode: evalQ.mode,
        used: effectiveQuality,
        target: evalQ.targetQuality,
        reducedBy: qualityReducedBy,
        reason: qualityReducedBy > 0 ? 'to fit maxOutputBytes' : 'as specified',
      },
      limits: {
        maxInputBytes: policy.limits.maxInputBytes,
        maxOutputBytes: limitMaxOutput,
        maxOutputHit,
      },
      format: {
        input: format,
        output: opts.to,
        accepted: true,
      },
    },
  };
}

/**
 * Universal conversion wrapper returning the converted bytes with metadata attached.
 * @param {Buffer|Uint8Array|string} input
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
async function convert(input, options = {}) {
  const result = await convertImage(input, options);
  const out = result.data;
  out.format = result.format;
  out.width = result.width;
  out.height = result.height;
  out.size = result.size;
  out.alphaPreserved = result.alphaPreserved;
  out.certificate = result.certificate;
  out.targetLockEnforced = result.targetLockEnforced;
  out.targetLockBypassed = result.targetLockBypassed;
  out.passedThrough = Boolean(result.passedThrough);
  out.data = result.data;
  out.policy = result.policy;
  return out;
}

/**
 * Decodes any supported image format to raw uncompressed RGBA pixel bytes.
 * @param {Buffer|Uint8Array|string} input - Image bytes or SVG string
 * @param {string} [format] - Optional format override ('svg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'tiff')
 * @returns {Promise<{ data: Uint8ClampedArray, width: number, height: number }>}
 */
async function decodeToRgba(input, format) {
  const data = asBuffer(input);
  const fmt = format ? String(format).toLowerCase() : detectFormat(data);
  let source = data;
  if (fmt === 'svg') {
    const svg = validateSvg(data);
    const dims = svgDimensions(svg);
    const width = dims.width || 2048;
    const height = dims.height || 2048;
    checkDimensions(width, height);
    const ResvgClass = getResvg();
    source = new ResvgClass(svg, { fitTo: { mode: 'original' }, background: 'rgba(0, 0, 0, 0)' }).render().asPng();
  }
  const pipeline = getSharp()(source, { limitInputPixels: MAX_PIXELS, pages: 1, animated: false, failOn: 'error' }).ensureAlpha();
  const { data: raw, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  checkDimensions(info.width, info.height);
  return {
    data: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength),
    width: info.width,
    height: info.height,
  };
}

/**
 * Encodes raw RGBA pixel bytes into a target format.
 * @param {{ data: Uint8ClampedArray|Buffer|Uint8Array, width: number, height: number }} image
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
async function encodeFromRgba(image, options = {}) {
  if (!image || !image.data || !Number.isInteger(image.width) || !Number.isInteger(image.height)) {
    throw new Error('image must be an object with data (RGBA bytes), width, and height.');
  }
  checkDimensions(image.width, image.height);
  const opts = normalizeOptions(options);
  const raw = Buffer.isBuffer(image.data)
    ? image.data
    : Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);

  let hasAlpha = false;
  for (let i = 3; i < raw.length; i += 4) {
    if (raw[i] < 255) {
      hasAlpha = true;
      break;
    }
  }

  if (opts.to === 'jpeg' && hasAlpha && !opts.background) {
    throw new ZapwebpError({
      code: 'E_ALPHA_NOT_REPRESENTABLE',
      message: 'JPEG cannot store transparency. Pass a background color to flatten the image, or choose WebP, PNG, or AVIF.',
      fix: 'Pass --background "#ffffff" or choose WebP/PNG/AVIF.',
      suggestedFix: { background: '#ffffff' },
    });
  }
  if (opts.to === 'jpeg' && opts.lossless) {
    throw new Error('JPEG output does not support lossless encoding.');
  }

  let pipeline = getSharp()(raw, {
    raw: {
      width: image.width,
      height: image.height,
      channels: 4,
    },
  });

  if (opts.width || opts.height) {
    pipeline = pipeline.resize({
      width: opts.width,
      height: opts.height,
      fit: opts.fit,
      withoutEnlargement: false,
    });
  }
  if (opts.background && hasAlpha) {
    pipeline = pipeline.flatten({ background: opts.background });
  }
  if (!opts.stripMetadata) {
    pipeline = pipeline.withMetadata();
  }

  const quality = Math.max(1, opts.quality);
  if (opts.to === 'webp') {
    pipeline = pipeline.webp({ quality, alphaQuality: 100, lossless: opts.lossless, effort: Math.round(opts.effort * 6 / 9) });
  } else if (opts.to === 'png') {
    pipeline = pipeline.png({ compressionLevel: opts.effort, adaptiveFiltering: true });
  } else if (opts.to === 'jpeg') {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else {
    pipeline = pipeline.avif({ quality, lossless: opts.lossless, effort: opts.effort });
  }

  const { data: outBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
  checkDimensions(info.width, info.height);
  return outBuffer;
}

async function convertSvgToWebp(input, options = {}) {
  return convertImage(input, { ...options, to: 'webp' });
}

/**
 * Parses and validates scale multipliers.
 * @param {number[]|string} [scaleInput] - e.g. [1, 2, 3] or "1,2,3"
 * @returns {number[]} sorted list of positive scale numbers
 */
function parseScales(scaleInput) {
  if (scaleInput === undefined || scaleInput === null) return [1];
  const list = Array.isArray(scaleInput)
    ? scaleInput
    : String(scaleInput).split(',').map((s) => s.trim()).filter(Boolean);
  const parsed = list.map((item) => {
    const num = Number(item);
    if (!Number.isFinite(num) || num <= 0) {
      throw new Error(`Scale multiplier must be a positive number, received: ${item}`);
    }
    return num;
  });
  if (!parsed.length) return [1];
  return [...new Set(parsed)].sort((a, b) => a - b);
}

/**
 * Generates scale suffix for filename according to industry standard.
 * @param {number} scale
 * @returns {string} e.g. "" for 1, "@2x" for 2, "@3x" for 3
 */
function scaleSuffix(scale) {
  if (scale === 1) return '';
  return `@${scale}x`;
}

/**
 * Constructs an output filename including scale suffix.
 * @param {string} inputPath
 * @param {string} [format='webp']
 * @param {number} [scale=1]
 * @returns {string}
 */
function outputName(inputPath, format = 'webp', scale = 1) {
  const extension = format === 'jpeg' ? 'jpg' : format;
  const base = path.basename(inputPath, path.extname(inputPath)) || 'image';
  const suffix = scaleSuffix(scale);
  return `${base}${suffix}.${extension}`;
}

/**
 * Generates ready-to-paste <img srcset> HTML tag.
 * @param {string} baseFile - Source path or base name
 * @param {number[]} [scales=[1]] - Array of scale numbers, e.g. [1, 2, 3]
 * @param {string} [format='webp'] - Output image format
 * @param {string} [alt=''] - Alt text
 * @returns {string} HTML img tag string
 */
function generateSrcset(baseFile, scales = [1], format = 'webp', alt = '') {
  const base = path.basename(baseFile, path.extname(baseFile)) || 'image';
  const ext = format === 'jpeg' ? 'jpg' : format;
  const sorted = parseScales(scales);
  const primaryFile = `${base}.${ext}`;
  const srcsetString = sorted
    .map((s) => `${base}${scaleSuffix(s)}.${ext} ${s}x`)
    .join(', ');
  return `<img src="${primaryFile}" srcset="${srcsetString}" alt="${alt}">`;
}

module.exports = {
  convert,
  convertImage,
  convertSvgToWebp,
  decodeToRgba,
  encodeFromRgba,
  detectFormat,
  detectMetadata,
  generateCleanCertificate,
  verifyAlpha,
  auditConversionCommand,
  explainBlackBackground,
  inspectImage,
  validateSvg,
  validateImageBytes,
  checkSvgSafety,
  normalizeOptions,
  parseScales,
  scaleSuffix,
  outputName,
  generateSrcset,
  resolvePolicy,
  checkPolicyInput,
  evaluateQuality,
  formats,
  registry: formats.registry,
  registerFormat: formats.registerFormat,
  getHandlerByName: formats.getHandlerByName,
  getHandlerByMime: formats.getHandlerByMime,
  detectFormatHandler: formats.detectFormatHandler,
  getAllHandlers: formats.getAllHandlers,
  metadata,
  MetadataRegistry: metadata.MetadataRegistry,
  metadataRegistry: metadata.metadataRegistry,
  registerMetadataHandler: metadata.registerMetadataHandler,
  getMetadataHandlers: metadata.getMetadataHandlers,
  cleanBytes: metadata.cleanBytes,
  getSharp,
  getResvg,
  MAX_WIDTH,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  FIT_MODES,
};
