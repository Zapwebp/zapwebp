'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('@zapwebp/core');
const { validateSafeUrl, ZapwebpError } = require('@zapwebp/shared');

const {
  convertImage,
  convert,
  inspectImage,
  detectFormat,
  cleanMetadata,
  verifyAlpha,
  auditConversionCommand,
  outputName,
  listTools,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
} = core;

/**
 * Universal Image Input Adapter.
 * Normalizes Buffer, Uint8Array, ArrayBuffer, Blob, URL, SVG markup, Data URI, or file path.
 *
 * @param {Buffer|Uint8Array|ArrayBuffer|Blob|string} input
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 */
async function resolveInput(input) {
  if (Buffer.isBuffer(input)) {
    return { buffer: input, filename: 'input.bin' };
  }
  if (input instanceof Uint8Array) {
    return {
      buffer: Buffer.from(input.buffer, input.byteOffset, input.byteLength),
      filename: 'input.bin',
    };
  }
  if (input instanceof ArrayBuffer) {
    return { buffer: Buffer.from(input), filename: 'input.bin' };
  }
  if (input && typeof input === 'object' && typeof input.arrayBuffer === 'function') {
    // Blob or File object
    const buf = await input.arrayBuffer();
    return { buffer: Buffer.from(buf), filename: input.name || 'input.bin' };
  }
  if (typeof input === 'string') {
    // 1. Remote HTTP/HTTPS URL
    if (/^https?:\/\//i.test(input)) {
      validateSafeUrl(input);
      const res = await fetch(input);
      if (!res.ok) {
        throw new ZapwebpError({
          code: 'E_REMOTE_FETCH_FAILED',
          message: `Failed to fetch image from URL: ${input} (${res.status} ${res.statusText})`,
          fix: 'Verify the remote URL is accessible and returns a valid image.',
          retryable: res.status >= 500,
        });
      }
      const arrayBuf = await res.arrayBuffer();
      const urlPath = new URL(input).pathname;
      return { buffer: Buffer.from(arrayBuf), filename: path.basename(urlPath) || 'image.bin' };
    }

    // 2. Inline SVG XML string
    if (input.trim().startsWith('<svg') || input.trim().startsWith('<?xml')) {
      return { buffer: Buffer.from(input, 'utf8'), filename: 'inline.svg' };
    }

    // 3. Base64 Data URI
    if (/^data:image\/[^;]+;base64,/i.test(input)) {
      const base64Data = input.replace(/^data:image\/[^;]+;base64,/i, '');
      return { buffer: Buffer.from(base64Data, 'base64'), filename: 'data-uri.bin' };
    }

    // 4. File system path
    try {
      const resolved = path.resolve(input);
      const data = await fs.readFile(resolved);
      return { buffer: data, filename: path.basename(resolved) };
    } catch (err) {
      throw new ZapwebpError({
        code: 'E_FILE_NOT_FOUND',
        message: `Unable to read file at path: ${input} (${err.message})`,
        fix: 'Verify that the local file exists and the process has read permissions.',
        input,
      });
    }
  }

  throw new ZapwebpError({
    code: 'E_INVALID_INPUT',
    message: 'Input must be a file path, URL, SVG markup string, Buffer, Uint8Array, or Blob.',
    fix: 'Pass a valid image byte container or readable path.',
  });
}

/**
 * The official Zapwebp Client SDK.
 * Exposes all 12 agentic and developer methods with structured errors and nextAction hints.
 */
class Zapwebp {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] - Optional API key (defaults to process.env.ZAPWEBP_API_KEY || process.env.ZAP_API_KEY)
   * @param {string} [options.baseUrl] - Optional API endpoint (enables remote HTTP execution)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ZAPWEBP_API_KEY || process.env.ZAP_API_KEY || null;
    this.baseUrl = options.baseUrl ? options.baseUrl.replace(/\/$/, '') : null;
    this.isOffline = !this.baseUrl && !this.apiKey;
    this.operationsCount = 0;
    this.bytesProcessed = 0;
  }

  /**
   * 1. Converts an image to one or multiple target formats.
   *
   * @param {object|Buffer|Uint8Array|string} optsOrInput - Options object or raw input
   * @param {object} [maybeOptions] - Options if input was passed as first parameter
   * @returns {Promise<Buffer>}
   */
  async convert(optsOrInput, maybeOptions = {}) {
    let rawInput;
    let options;

    if (optsOrInput && typeof optsOrInput === 'object' && !Buffer.isBuffer(optsOrInput) && !(optsOrInput instanceof Uint8Array) && !optsOrInput.arrayBuffer) {
      if ('input' in optsOrInput) {
        rawInput = optsOrInput.input;
        options = { ...optsOrInput };
        delete options.input;
      } else {
        rawInput = optsOrInput;
        options = maybeOptions;
      }
    } else {
      rawInput = optsOrInput;
      options = maybeOptions;
    }

    const { buffer } = await resolveInput(rawInput);
    const targets = Array.isArray(options.to) ? options.to : null;

    if (targets && targets.length > 0) {
      const results = await Promise.all(
        targets.map((to) => this.convert(buffer, { ...options, to }))
      );
      return results;
    }

    const targetFormat = (options.to || options.format || 'webp').toLowerCase();

    // Guard: Flatten transparent input to JPEG requires explicit background
    if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
      try {
        const inspected = await inspectImage(buffer);
        if (inspected.hasAlpha && !options.background) {
          throw new ZapwebpError({
            code: 'E_ALPHA_NOT_REPRESENTABLE',
            message: 'JPEG cannot store transparency. Pass background: "#ffffff" to flatten, or choose webp/png/avif.',
            fix: 'Pass background: "#ffffff" or choose to: "webp".',
            suggestedFix: { background: '#ffffff' },
            retryable: true,
          });
        }
      } catch (err) {
        if (err instanceof ZapwebpError) throw err;
      }
    }

    this.operationsCount++;
    this.bytesProcessed += buffer.length;

    if (this.isOffline) {
      const convertedResult = await convertImage(buffer, options);
      const outBuf = Buffer.from(convertedResult.data);

      outBuf.data = outBuf;
      outBuf.output = outBuf;
      outBuf.format = convertedResult.format;
      outBuf.width = convertedResult.width;
      outBuf.height = convertedResult.height;
      outBuf.size = outBuf.length;
      outBuf.bytes = outBuf.length;
      outBuf.alphaPreserved = convertedResult.alphaPreserved;
      outBuf.metadataRemoved = options.clean !== false ? ['EXIF', 'XMP', 'IPTC', 'C2PA'] : [];
      outBuf.nextAction = {
        tool: 'verify_clean',
        arguments: { input: '<converted-output>' },
        reason: 'Verify the output has no residual metadata remaining.',
      };

      return outBuf;
    }

    // Remote API mode
    let uploadName = 'input.png';
    try {
      const inputFmt = detectFormat(buffer);
      uploadName = `input.${inputFmt === 'jpeg' ? 'jpg' : inputFmt}`;
    } catch {}

    const formData = new FormData();
    formData.append('file', new Blob([buffer]), uploadName);
    if (options.to) formData.append('to', options.to);
    if (options.width) formData.append('width', String(options.width));
    if (options.height) formData.append('height', String(options.height));
    if (options.quality) formData.append('quality', String(options.quality));
    if (options.lossless !== undefined) formData.append('lossless', String(options.lossless));
    if (options.background) formData.append('background', options.background);
    if (options.clean !== undefined) formData.append('clean', String(options.clean));

    const headers = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const endpoint = this.baseUrl.includes('/api') ? `${this.baseUrl}/convert` : `${this.baseUrl}/api/v1/convert`;
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new ZapwebpError({
        code: errJson.code || 'E_API_ERROR',
        message: errJson.message || errJson.error || `Zap API error: ${res.status} ${res.statusText}`,
        fix: errJson.fix || 'Check API credentials and conversion parameters.',
        docs: errJson.docs || 'https://zapwebp-docs.vercel.app/errors',
        retryable: res.status >= 500,
        suggestedFix: errJson.suggestedFix,
      });
    }

    const outBuf = Buffer.from(await res.arrayBuffer());
    outBuf.data = outBuf;
    outBuf.output = outBuf;
    outBuf.format = options.to || 'webp';
    outBuf.width = Number(res.headers.get('x-zapwebp-width')) || 0;
    outBuf.height = Number(res.headers.get('x-zapwebp-height')) || 0;
    outBuf.alphaPreserved = res.headers.get('x-zapwebp-alpha-preserved') === 'true';
    outBuf.size = outBuf.length;
    outBuf.bytes = outBuf.length;
    outBuf.metadataRemoved = ['EXIF', 'XMP'];
    outBuf.nextAction = {
      tool: 'verify_clean',
      arguments: { input: '<converted-output>' },
      reason: 'Verify the output has no residual metadata remaining.',
    };

    return outBuf;
  }

  /**
   * 2. Converts multiple images concurrently.
   *
   * @param {object|Array} optsOrInputs
   * @param {object} [maybeOptions]
   * @returns {Promise<{ total: number, success: number, failed: number, results: Array<any>, nextAction: object }>}
   */
  async convertBatch(optsOrInputs, maybeOptions = {}) {
    let inputs;
    let options;

    if (optsOrInputs && !Array.isArray(optsOrInputs) && typeof optsOrInputs === 'object') {
      inputs = optsOrInputs.inputs || optsOrInputs.files || [];
      options = { ...optsOrInputs };
      delete options.inputs;
      delete options.files;
    } else {
      inputs = optsOrInputs;
      options = maybeOptions;
    }

    if (!Array.isArray(inputs)) {
      throw new ZapwebpError({
        code: 'E_INVALID_ARGUMENT',
        message: 'Batch inputs must be an array of image files or byte buffers.',
        fix: 'Pass an array of image file paths or byte buffers.',
      });
    }

    const results = [];
    let success = 0;
    let failed = 0;

    for (const item of inputs) {
      try {
        const out = await this.convert(item, options);
        results.push({ success: true, output: out });
        success++;
      } catch (err) {
        results.push({ success: false, error: err });
        failed++;
      }
    }

    return {
      total: inputs.length,
      success,
      failed,
      results,
      nextAction: {
        tool: 'optimize_assets',
        arguments: {},
        reason: 'Review overall batch byte reduction statistics.',
      },
    };
  }

  /** Backwards compatibility alias for convertBatch */
  async batch(inputs, options = {}) {
    return this.convertBatch(inputs, options);
  }

  /**
   * 3. Safely fetches a remote image URL and converts it.
   *
   * @param {object|string} optsOrUrl
   * @param {object} [maybeOptions]
   * @returns {Promise<Buffer>}
   */
  async convertUrl(optsOrUrl, maybeOptions = {}) {
    const url = typeof optsOrUrl === 'string' ? optsOrUrl : optsOrUrl.url;
    const options = typeof optsOrUrl === 'string' ? maybeOptions : { ...optsOrUrl };
    delete options.url;

    if (!url || typeof url !== 'string') {
      throw new ZapwebpError({
        code: 'E_INVALID_URL',
        message: 'URL must be a valid http or https string.',
        fix: 'Provide a valid image URL starting with http:// or https://.',
      });
    }

    validateSafeUrl(url);
    const { buffer } = await resolveInput(url);
    return this.convert(buffer, options);
  }

  /**
   * 4. Inspects image dimensions, format, alpha channel, chunks, and target suggestions.
   *
   * @param {object|Buffer|Uint8Array|string} optsOrInput
   * @returns {Promise<object>}
   */
  async inspect(optsOrInput) {
    const rawInput = (optsOrInput && typeof optsOrInput === 'object' && 'input' in optsOrInput)
      ? optsOrInput.input
      : optsOrInput;

    const { buffer } = await resolveInput(rawInput);
    this.operationsCount++;

    const details = await inspectImage(buffer);
    const recommendedTargets = details.hasAlpha
      ? [
          { to: 'webp', reason: 'preserves transparency with compact file size' },
          { to: 'png', reason: 'lossless alpha fallback' },
          { to: 'avif', reason: 'modern compact format with alpha preservation' },
        ]
      : [
          { to: 'avif', reason: 'compact photographic output' },
          { to: 'webp', reason: 'broad modern browser support' },
          { to: 'jpeg', reason: 'widely compatible photographic output' },
        ];

    const recommended = recommendedTargets[0].to;

    return {
      ...details,
      recommendedTargets,
      nextAction: {
        tool: 'convert_image',
        arguments: { to: recommended, clean: true },
        reason: `Convert to ${recommended} to optimize file size while respecting alpha.`,
      },
    };
  }

  /**
   * 5. Inspects a remote image URL without saving to disk.
   *
   * @param {object|string} optsOrUrl
   * @returns {Promise<object>}
   */
  async inspectUrl(optsOrUrl) {
    const url = typeof optsOrUrl === 'string' ? optsOrUrl : optsOrUrl.url;
    if (!url) throw new ZapwebpError({ code: 'E_INVALID_URL', message: 'URL is required.' });
    validateSafeUrl(url);
    const { buffer } = await resolveInput(url);
    return this.inspect(buffer);
  }

  /**
   * 6. Verifies that an image contains zero residual metadata.
   *
   * @param {object|Buffer|Uint8Array|string} optsOrInput
   * @returns {Promise<{ clean: boolean, metadataChunks: string[], nextAction: object }>}
   */
  async verifyClean(optsOrInput) {
    const rawInput = (optsOrInput && typeof optsOrInput === 'object' && 'input' in optsOrInput)
      ? optsOrInput.input
      : optsOrInput;

    const { buffer } = await resolveInput(rawInput);
    this.operationsCount++;

    const details = await inspectImage(buffer);
    const metadataChunks = (details.metadataChunks || []).map((c) => c.name || c);
    const isClean = metadataChunks.length === 0;

    return {
      clean: isClean,
      metadataChunks,
      nextAction: isClean
        ? {
            tool: 'convert_image',
            arguments: {},
            reason: 'Image is verified clean of EXIF, XMP, and tracking metadata.',
          }
        : {
            tool: 'clean_metadata',
            arguments: { input: '<image>' },
            reason: 'Strip remaining metadata chunks before deployment.',
          },
    };
  }

  /**
   * 7. Direct alpha channel inspection across pixel data.
   *
   * @param {object|Buffer|Uint8Array|string} optsOrInput
   * @returns {Promise<{ hasAlpha: boolean, transparentPixelsCount: number, cornerPixelsAlpha: number[], nextAction: object }>}
   */
  async verifyAlpha(optsOrInput) {
    const rawInput = (optsOrInput && typeof optsOrInput === 'object' && 'input' in optsOrInput)
      ? optsOrInput.input
      : optsOrInput;

    const { buffer } = await resolveInput(rawInput);
    this.operationsCount++;

    const res = await verifyAlpha(buffer);
    return {
      hasAlpha: res.hasAlpha,
      transparentPixelsCount: res.transparentPixels !== undefined ? res.transparentPixels : (res.hasAlpha ? 1 : 0),
      cornerPixelsAlpha: res.cornerAlpha || [],
      nextAction: {
        tool: 'convert_image',
        arguments: { to: res.hasAlpha ? 'webp' : 'avif' },
        reason: res.hasAlpha
          ? 'Use transparency-capable format (WebP or AVIF).'
          : 'Image is opaque; safe to convert to any format.',
      },
    };
  }

  /**
   * 8. AI Agent helper: suggests optimal target format and options based on image and use case.
   *
   * @param {object} opts
   * @param {any} opts.input
   * @param {'icon'|'hero'|'thumbnail'|'photo'|'general'} [opts.useCase='general']
   * @returns {Promise<{ useCase: string, recommendedFormat: string, quality: number, lossless: boolean, reason: string, nextAction: object }>}
   */
  async suggestConversion(opts = {}) {
    const rawInput = opts.input || opts;
    const useCase = opts.useCase || 'general';
    const { buffer } = await resolveInput(rawInput);

    const inspected = await inspectImage(buffer);
    let recommendedFormat = 'webp';
    let quality = 85;
    let lossless = false;
    let reason = 'Balanced compression with transparency preservation.';

    if (useCase === 'icon' || (inspected.width && inspected.width <= 128)) {
      recommendedFormat = inspected.hasAlpha ? 'webp' : 'avif';
      lossless = inspected.format === 'svg' || inspected.format === 'png';
      quality = 90;
      reason = 'High-fidelity iconography with crisp edges and alpha preservation.';
    } else if (useCase === 'hero') {
      recommendedFormat = 'webp';
      quality = 82;
      reason = 'Optimized for fast Largest Contentful Paint (LCP) and universal browser rendering.';
    } else if (useCase === 'thumbnail') {
      recommendedFormat = 'webp';
      quality = 75;
      reason = 'Lightweight thumbnail payload for responsive grids.';
    } else if (useCase === 'photo') {
      recommendedFormat = inspected.hasAlpha ? 'webp' : 'avif';
      quality = 75;
      reason = 'Deep photographic color rendition with maximum byte savings.';
    }

    return {
      useCase,
      recommendedFormat,
      quality,
      lossless,
      reason,
      nextAction: {
        tool: 'convert_image',
        arguments: {
          to: recommendedFormat,
          quality,
          lossless,
          clean: true,
        },
        reason: 'Execute the recommended conversion.',
      },
    };
  }

  /**
   * 9. Audits a shell command (ImageMagick, ffmpeg, cwebp) for transparency safety bugs.
   *
   * @param {object|string} optsOrCommand
   * @returns {Promise<object>}
   */
  async auditCommand(optsOrCommand) {
    const command = typeof optsOrCommand === 'string' ? optsOrCommand : optsOrCommand.command;
    if (!command || typeof command !== 'string') {
      throw new ZapwebpError({
        code: 'E_INVALID_COMMAND',
        message: 'Command string is required for audit.',
      });
    }

    const report = auditConversionCommand(command);
    let tool = 'Unknown';
    if (/\bconvert\b|\bmogrify\b|\bmagick\b/i.test(command)) tool = 'ImageMagick';
    else if (/\bcwebp\b/i.test(command)) tool = 'cwebp';
    else if (/\bffmpeg\b/i.test(command)) tool = 'ffmpeg';

    return {
      safe: report.safe,
      tool,
      issues: report.issues,
      warnings: report.issues,
      recommendedCommand: report.recommendedCommand,
      zapEquivalent: report.recommendedCommand,
      nextAction: {
        tool: 'convert_image',
        arguments: {},
        reason: 'Use Zapwebp CLI or SDK to execute conversion safely without black background bugs.',
      },
    };
  }

  /**
   * 10. Discovers all available Zapwebp tool schemas at runtime.
   *
   * @returns {Promise<Array<{ name: string, description: string, inputSchema: object }>>}
   */
  async listTools() {
    return listTools();
  }

  /**
   * 11. Returns the agent runtime discovery manifest.
   *
   * @returns {Promise<object>}
   */
  async getAgentManifest() {
    const manifestPath = path.resolve(__dirname, '..', 'agent.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {
        name: '@zapwebp/sdk',
        version: '1.1.2',
        capabilities: ['convert', 'batch', 'url', 'inspect', 'verify_clean', 'suggest', 'audit'],
      };
    }
  }

  /**
   * 12. Returns local offline or remote API usage statistics.
   *
   * @returns {Promise<object>}
   */
  async getUsage() {
    if (this.isOffline) {
      const mem = process.memoryUsage();
      return {
        mode: 'offline',
        inMemory: true,
        operations: this.operationsCount,
        bytesProcessed: this.bytesProcessed,
        heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
      };
    }

    const headers = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    const res = await fetch(`${this.baseUrl}/usage`, { headers }).catch(() => null);
    if (!res || !res.ok) {
      return {
        mode: 'remote',
        apiKeyPresent: Boolean(this.apiKey),
        status: 'online',
      };
    }
    return res.json();
  }

  /**
   * Optimization reporter for collections of assets.
   */
  async optimize(options = {}) {
    const files = options.files || [];
    const targets = options.targets || [{ to: 'webp', quality: 85 }, { to: 'avif', quality: 55 }];
    let totalBytesBefore = 0;
    let totalBytesAfter = 0;
    const fileReports = [];

    for (const file of files) {
      const { buffer, filename } = await resolveInput(file);
      totalBytesBefore += buffer.length;
      const outputs = [];
      let fileOutputBytes = 0;

      for (const target of targets) {
        const converted = await convertImage(buffer, target);
        fileOutputBytes += converted.size;
        outputs.push({
          format: converted.format,
          bytes: converted.size,
          width: converted.width,
          height: converted.height,
          alphaPreserved: converted.alphaPreserved,
        });
      }

      totalBytesAfter += fileOutputBytes;
      const saved = buffer.length
        ? Number((((buffer.length - fileOutputBytes) / buffer.length) * 100).toFixed(1))
        : 0;
      fileReports.push({
        input: filename,
        inputBytes: buffer.length,
        outputs,
        savedPercent: saved,
      });
    }

    const savedPercent = totalBytesBefore
      ? Number((((totalBytesBefore - totalBytesAfter) / totalBytesBefore) * 100).toFixed(1))
      : 0;

    return {
      totalBytesBefore,
      totalBytesAfter,
      savedPercent,
      files: fileReports,
      nextAction: {
        tool: 'convert_image',
        arguments: {},
        reason: 'Deploy converted assets to production.',
      },
    };
  }

  /**
   * Verifies an incoming webhook HMAC-SHA256 signature.
   * @param {string|Buffer} payload - Raw request body
   * @param {string} signature - Header signature (e.g. "sha256=...")
   * @param {string} secret - Webhook secret key
   * @returns {boolean}
   */
  static verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : Buffer.from(payload))
      .digest('hex');
    const provided = signature.replace(/^sha256=/i, '').trim();
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  }
}

/**
 * Factory helper function to instantiate the Zapwebp client.
 *
 * @param {object} [options]
 * @returns {Zapwebp}
 */
function createZapClient(options) {
  return new Zapwebp(options);
}

// Backward compatibility alias
const Zap = Zapwebp;

module.exports = {
  Zapwebp,
  Zap,
  createZapClient,
  ZapwebpError,
  listTools,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
  resolveInput,
};
