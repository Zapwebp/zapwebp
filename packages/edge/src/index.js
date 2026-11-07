'use strict';

const { convertImage, detectFormat } = require('@zapwebp/core');
const { getMimeType, OUTPUT_FORMATS, ZapwebpError, validateSafeUrl } = require('@zapwebp/shared');

/**
 * Creates an edge request handler for locked target format conversions.
 * Designed for Cloudflare Workers, Vercel Edge, Deno, and standard web Fetch handlers.
 *
 * @param {object} [config]
 * @param {string} [config.targetFormat='webp'] Forced canonical target format
 * @param {boolean} [config.strict=true] Enforce failure on unconvertible inputs
 * @param {string|Function} [config.source] Source URL prefix, R2 bucket, or resolver function
 * @param {number} [config.quality=85] Output compression quality
 * @param {boolean} [config.clean=true] Strip EXIF/metadata
 * @returns {(req: Request) => Promise<Response>}
 */
function createZapHandler(config = {}) {
  const targetFormat = String(config.targetFormat || config.lockTarget || 'webp').toLowerCase();
  if (!OUTPUT_FORMATS.includes(targetFormat)) {
    throw new TypeError(`Target format must be one of ${OUTPUT_FORMATS.join(', ')}, received: "${targetFormat}"`);
  }
  const strict = config.strict !== undefined ? Boolean(config.strict) : true;
  const quality = config.quality !== undefined ? Number(config.quality) : 85;
  const clean = config.clean !== undefined ? Boolean(config.clean) : true;
  const mimeType = getMimeType(targetFormat);

  return async function zapHandler(request) {
    if (!request || typeof request.url !== 'string') {
      return new Response('Invalid request', { status: 400 });
    }

    try {
      let inputBytes;

      // 1. Ingestion from request body (POST/PUT) or resolver/source (GET)
      if (request.method === 'POST' || request.method === 'PUT') {
        const arrayBuf = await request.arrayBuffer();
        inputBytes = Buffer.from(arrayBuf);
      } else if (typeof config.source === 'function') {
        const resolved = await config.source(request);
        if (resolved instanceof Uint8Array || Buffer.isBuffer(resolved)) {
          inputBytes = Buffer.from(resolved);
        } else if (resolved instanceof Response) {
          const ab = await resolved.arrayBuffer();
          inputBytes = Buffer.from(ab);
        } else {
          return new Response('Source resolver returned invalid content', { status: 404 });
        }
      } else if (typeof config.source === 'string') {
        const url = new URL(request.url);
        const subPath = url.pathname.replace(/^\/img\//, '').replace(/^\//, '');
        const sourceUrl = `${config.source.replace(/\/$/, '')}/${subPath}`;
        validateSafeUrl(sourceUrl);
        const fetched = await fetch(sourceUrl);
        if (!fetched.ok) {
          return new Response(`Source image not found: ${fetched.status}`, { status: fetched.status });
        }
        const ab = await fetched.arrayBuffer();
        inputBytes = Buffer.from(ab);
      } else {
        return new Response('Zap Edge Handler: Provide request body or configure source resolver.', { status: 400 });
      }

      if (!inputBytes || inputBytes.length === 0) {
        return new Response(JSON.stringify({
          error: 'E_EMPTY_FILE',
          message: 'The file is empty (0 bytes).',
          fix: 'Provide a valid image payload.',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2. Conversion with target lock & strict enforcement
      let detected = 'unknown';
      try {
        detected = detectFormat(inputBytes);
      } catch {
        detected = 'unknown';
      }

      let result;
      try {
        result = await convertImage(inputBytes, {
          to: targetFormat,
          lockTarget: targetFormat,
          strict,
          quality,
          clean,
        });
      } catch (err) {
        if (strict) {
          return new Response(JSON.stringify({
            error: err.code || 'E_UNSUPPORTED_FORMAT',
            message: err.message || `Cannot decode this file into the locked target format (${targetFormat}).`,
            input: {
              detectedFormat: detected,
              bytes: inputBytes.length,
            },
            target: targetFormat,
            fix: err.fix || 'Upload a supported format, or install the format plugin for this file.',
          }), {
            status: 415,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Non-strict pass-through
        return new Response(inputBytes, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(inputBytes.length),
            'X-Zapwebp-Target-Lock': 'bypassed-passthrough',
          },
        });
      }

      if (result.passedThrough) {
        return new Response(inputBytes, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(inputBytes.length),
            'X-Zapwebp-Target-Lock': 'bypassed-passthrough',
          },
        });
      }

      // 3. Return converted response
      return new Response(result.data, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(result.data.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Zapwebp-Target-Lock': 'enforced',
          'X-Zapwebp-Clean': String(result.clean),
          'X-Zapwebp-Format': targetFormat,
        },
      });
    } catch (unexpectedErr) {
      return new Response(JSON.stringify({
        error: 'E_INTERNAL_ERROR',
        message: unexpectedErr.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

module.exports = {
  createZapHandler,
};
