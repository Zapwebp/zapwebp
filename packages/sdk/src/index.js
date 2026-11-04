'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('@zapwebp/core');

const { convertImage, convert, inspectImage, detectFormat, outputName, INPUT_FORMATS, OUTPUT_FORMATS } = core;

/**
 * Normalizes input into a Buffer.
 * @param {Buffer|Uint8Array|string} input - File path, URL, or raw bytes
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 */
async function resolveInput(input) {
  if (Buffer.isBuffer(input)) {
    return { buffer: input, filename: 'input.bin' };
  }
  if (input instanceof Uint8Array) {
    return { buffer: Buffer.from(input.buffer, input.byteOffset, input.byteLength), filename: 'input.bin' };
  }
  if (typeof input === 'string') {
    if (/^https?:\/\//i.test(input)) {
      const res = await fetch(input);
      if (!res.ok) throw new Error(`Failed to fetch image from URL: ${input} (${res.status} ${res.statusText})`);
      const arrayBuf = await res.arrayBuffer();
      const urlPath = new URL(input).pathname;
      return { buffer: Buffer.from(arrayBuf), filename: path.basename(urlPath) || 'image.bin' };
    }
    const resolved = path.resolve(input);
    const data = await fs.readFile(resolved);
    return { buffer: data, filename: path.basename(resolved) };
  }
  throw new Error('Input must be a file path string, URL, Buffer, or Uint8Array.');
}

class Zap {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] - Optional API key (defaults to process.env.ZAP_API_KEY)
   * @param {string} [options.baseUrl] - Optional API endpoint (enables remote HTTP execution)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ZAP_API_KEY || null;
    this.baseUrl = options.baseUrl ? options.baseUrl.replace(/\/$/, '') : null;
    this.isOffline = !this.baseUrl && !this.apiKey;
  }

  /**
   * Converts an image to one or multiple target formats.
   * @param {Buffer|Uint8Array|string} input
   * @param {object} [options]
   * @returns {Promise<Buffer|Array<{ format: string, data: Buffer, width: number, height: number, size: number, alphaPreserved: boolean }>>}
   */
  async convert(input, options = {}) {
    const { buffer } = await resolveInput(input);
    const targets = Array.isArray(options.to) ? options.to : null;

    if (targets && targets.length > 0) {
      const results = await Promise.all(
        targets.map((to) => convertImage(buffer, { ...options, to }))
      );
      return results.map((r) => ({
        format: r.format,
        data: r.data,
        width: r.width,
        height: r.height,
        size: r.size,
        alphaPreserved: r.alphaPreserved,
      }));
    }

    if (this.isOffline) {
      return convert(buffer, options);
    }

    // Remote API mode
    const formData = new FormData();
    formData.append('svg', new Blob([buffer]), 'input.bin');
    if (options.to) formData.append('to', options.to);
    if (options.width) formData.append('width', String(options.width));
    if (options.height) formData.append('height', String(options.height));
    if (options.quality) formData.append('quality', String(options.quality));
    if (options.lossless !== undefined) formData.append('lossless', String(options.lossless));
    if (options.background) formData.append('background', options.background);
    if (options.fit) formData.append('fit', options.fit);

    const headers = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const res = await fetch(`${this.baseUrl}/api/v1/convert`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `Zap API error: ${res.status} ${res.statusText}`);
    }

    const outBuf = Buffer.from(await res.arrayBuffer());
    outBuf.format = options.to || 'webp';
    outBuf.width = Number(res.headers.get('x-zapwebp-width')) || 0;
    outBuf.height = Number(res.headers.get('x-zapwebp-height')) || 0;
    outBuf.alphaPreserved = res.headers.get('x-zapwebp-alpha-preserved') === 'true';
    outBuf.size = outBuf.length;
    outBuf.data = outBuf;
    return outBuf;
  }

  /**
   * Inspects image properties, dimensions, transparency, and returns target suggestions.
   * @param {Buffer|Uint8Array|string} input
   * @returns {Promise<{ format: string, width?: number, height?: number, hasAlpha: boolean, bytes: number, recommendedTargets: Array<{ to: string, reason: string }> }>}
   */
  async inspect(input) {
    const { buffer } = await resolveInput(input);
    const details = await inspectImage(buffer);
    const recommendedTargets = details.hasAlpha
      ? [
          { to: 'webp', reason: 'preserves transparency with compact output' },
          { to: 'png', reason: 'lossless transparency fallback' },
          { to: 'avif', reason: 'modern compact format with alpha support' },
        ]
      : [
          { to: 'avif', reason: 'compact photographic output' },
          { to: 'webp', reason: 'broad modern web support' },
          { to: 'jpeg', reason: 'widely compatible photographic output' },
        ];
    return {
      ...details,
      recommendedTargets,
    };
  }

  /**
   * Converts a collection of images concurrently.
   * @param {Array<Buffer|Uint8Array|string>} inputs
   * @param {object} [options]
   * @returns {Promise<Array<any>>}
   */
  async batch(inputs, options = {}) {
    if (!Array.isArray(inputs)) throw new Error('inputs must be an array.');
    return Promise.all(inputs.map((item) => this.convert(item, options)));
  }

  /**
   * Project-level asset optimization tool.
   * @param {object} options
   * @param {Array<string|Buffer>} [options.files]
   * @param {Array<{ to: string, quality?: number, width?: number }>} [options.targets]
   * @returns {Promise<{ totalBytesBefore: number, totalBytesAfter: number, savedPercent: number, files: Array<any> }>}
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
      const saved = buffer.length ? Number(((buffer.length - fileOutputBytes) / buffer.length * 100).toFixed(1)) : 0;
      fileReports.push({
        input: filename,
        inputBytes: buffer.length,
        outputs,
        savedPercent: saved,
      });
    }

    const savedPercent = totalBytesBefore
      ? Number(((totalBytesBefore - totalBytesAfter) / totalBytesBefore * 100).toFixed(1))
      : 0;

    return {
      totalBytesBefore,
      totalBytesAfter,
      savedPercent,
      files: fileReports,
    };
  }

  /**
   * Verifies an incoming webhook HMAC-SHA256 signature.
   * @param {string|Buffer} payload - Raw request body
   * @param {string} signature - Header signature (e.g., "sha256=...")
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

function createZapClient(options) {
  return new Zap(options);
}

module.exports = {
  Zap,
  createZapClient,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
};

