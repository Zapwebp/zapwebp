'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const {
  convertImage,
  detectFormat,
  checkSvgSafety,
  generateSrcset,
  scaleSuffix,
} = require('@zapwebp/core');
const { getMimeType } = require('@zapwebp/shared');
const { resolveOptions } = require('./options');
const {
  validateStoragePath,
  stripCredentials,
  validateAdapterContract,
  validateSafeUrl,
} = require('./sanitize');

/**
 * Executes storage write with exponential backoff retry on transient network/rate-limit failures.
 * Fails immediately on permanent errors (auth, not found, forbidden, invalid credentials).
 * Redacts any sensitive tokens, secrets, or passwords from error outputs.
 *
 * @param {object} adapter
 * @param {string} bucket
 * @param {string} targetPath
 * @param {Uint8Array|Buffer} data
 * @param {object} writeOpts
 * @param {number} [maxRetries=3]
 * @returns {Promise<any>}
 */
async function writeWithRetry(adapter, bucket, targetPath, data, writeOpts, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await adapter.write(bucket, targetPath, data, writeOpts);
    } catch (err) {
      attempt++;
      const rawMsg = err && err.message ? err.message : String(err);
      const sanitizedMsg = stripCredentials(rawMsg);
      const msgLower = sanitizedMsg.toLowerCase();
      const isPermanent =
        msgLower.includes('auth') ||
        msgLower.includes('credential') ||
        msgLower.includes('unauthorized') ||
        msgLower.includes('forbidden') ||
        msgLower.includes('not found') ||
        msgLower.includes('permission') ||
        msgLower.includes('e_path_traversal') ||
        msgLower.includes('e_unsafe_svg');

      if (attempt >= maxRetries || isPermanent) {
        const sanitizedErr = new Error(sanitizedMsg);
        if (err && err.code) sanitizedErr.code = err.code;
        throw sanitizedErr;
      }
      const delay = Math.round(50 * Math.pow(2, attempt) + Math.random() * 20);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Wraps a StorageAdapter with the Zapwebp conversion and multi-scale pipeline.
 * Enforces ISO 27001/27017 Security Baseline, path sandboxing, and zero-leakage credentials.
 * Intercept -> Validate -> Convert -> Upload.
 *
 * @param {import('./types').StorageAdapter} adapter
 * @param {import('./types').ZapwebpStorageOptions} [options]
 * @returns {import('./types').ZapwebpStorageInstance}
 */
function withZapwebp(adapter, options) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('withZapwebp requires an adapter object implementing StorageAdapter.');
  }

  const contract = validateAdapterContract(adapter);
  if (!contract.valid) {
    throw new TypeError(`Adapter must implement name, write, read, and delete methods: ${contract.errors.join('; ')}`);
  }

  const resolved = resolveOptions(options);

  /**
   * Converts and uploads a single image asset across all configured scale multipliers.
   * Enforces path sandboxing (<= 1024 bytes, no '..', no absolute filesystem paths).
   *
   * @param {string} bucket
   * @param {string} filePath
   * @param {Uint8Array|Buffer|string} bytesOrUrl
   * @param {object} [uploadOptions]
   * @returns {Promise<import('./types').UploadReport>}
   */
  async function upload(bucket, filePath, bytesOrUrl, uploadOptions = {}) {
    // 1. Path Sandboxing & Length Limits
    const sanitizedPath = validateStoragePath(filePath);

    // 2. Remote URL resolution with SSRF defense
    let bytes = bytesOrUrl;
    if (typeof bytesOrUrl === 'string' && (bytesOrUrl.startsWith('http://') || bytesOrUrl.startsWith('https://'))) {
      validateSafeUrl(bytesOrUrl);
      const res = await fetch(bytesOrUrl);
      if (!res.ok) {
        throw new Error(`E_STORAGE: Failed to fetch remote source image "${bytesOrUrl}": HTTP ${res.status}`);
      }
      bytes = new Uint8Array(await res.arrayBuffer());
    }

    if (!bytes || (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array))) {
      throw new TypeError('bytes must be a Buffer, Uint8Array, or safe HTTP(S) URL.');
    }

    const byteLength = bytes.byteLength || bytes.length;

    // Resolve target format and lock state
    const overrideLock = Boolean(uploadOptions.overrideLock);
    const targetFormat = (overrideLock && uploadOptions.targetFormat)
      ? uploadOptions.targetFormat
      : (uploadOptions.targetFormat || resolved.targetFormat || 'webp');
    const isStrict = uploadOptions.strict !== undefined ? Boolean(uploadOptions.strict) : resolved.strict;
    const targetLockBypassed = Boolean(overrideLock && uploadOptions.targetFormat && uploadOptions.targetFormat !== resolved.targetFormat);
    const targetLockEnforced = Boolean(!targetLockBypassed);
    const extForFormat = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const mimeForFormat = getMimeType(targetFormat);

    // 3. Validate size constraint
    if (byteLength > resolved.maxBytes) {
      throw new Error(`E_TOO_LARGE: Original size ${byteLength} bytes exceeds maxBytes limit of ${resolved.maxBytes}`);
    }

    // 4. Detect & validate input format
    let format;
    try {
      format = detectFormat(bytes);
    } catch (err) {
      if (!isStrict) {
        // Pass-through in non-strict mode
        const ext = path.posix.extname(sanitizedPath);
        const baseName = path.posix.basename(sanitizedPath, ext) || 'image';
        let dir = path.posix.dirname(sanitizedPath);
        if (dir === '.' || dir === '/') dir = '';
        if (resolved.outPrefix) dir = dir ? `${resolved.outPrefix}/${dir}` : resolved.outPrefix;
        const passThroughPath = dir ? `${dir}/${baseName}${ext}` : `${baseName}${ext}`;
        await writeWithRetry(adapter, bucket, passThroughPath, bytes, {
          contentType: 'application/octet-stream',
          cacheControl: 'public, max-age=31536000, immutable',
          upsert: resolved.onConflict === 'overwrite',
        });
        return {
          source: { path: filePath, bytes: byteLength, format: 'unknown' },
          outputs: [{ scale: 1, path: passThroughPath, bytes: byteLength, format: 'unknown', passedThrough: true }],
          manifest: null,
          skipped: false,
          passedThrough: true,
          targetLockEnforced,
          targetLockBypassed,
        };
      }
      throw new Error(`E_UNSUPPORTED_FORMAT: Cannot decode this file into the locked target format (${targetFormat}).`);
    }

    // Validate SVG active scripts and dangerous external links
    if (format === 'svg') {
      const safety = checkSvgSafety(bytes);
      if (!safety.safe) {
        throw new Error(`E_UNSAFE_SVG: ${safety.detail || safety.reason || 'Unsafe SVG content'}`);
      }
    }

    // 5. Compute target paths and directory prefix
    const ext = path.posix.extname(sanitizedPath);
    const baseName = path.posix.basename(sanitizedPath, ext) || 'image';
    let dir = path.posix.dirname(sanitizedPath);
    if (dir === '.' || dir === '/') {
      dir = '';
    }
    if (resolved.outPrefix) {
      dir = dir ? `${resolved.outPrefix}/${dir}` : resolved.outPrefix;
    }

    // 6. Pre-upload existence check (for 'skip' or 'error' conflict modes)
    if (resolved.onConflict !== 'overwrite' && typeof adapter.exists === 'function') {
      const primaryFileName = `${baseName}.${extForFormat}`;
      const primaryTargetPath = dir ? `${dir}/${primaryFileName}` : primaryFileName;
      const alreadyExists = await adapter.exists(bucket, primaryTargetPath);

      if (alreadyExists) {
        if (resolved.onConflict === 'error') {
          throw new Error(`E_CONFLICT: Destination file already exists at "${primaryTargetPath}"`);
        }
        return {
          source: {
            path: filePath,
            bytes: byteLength,
            format,
          },
          outputs: [],
          manifest: null,
          skipped: true,
          targetLockEnforced,
          targetLockBypassed,
        };
      }
    }

    // 7. Convert and write each scale
    const uploadedOutputs = [];
    for (const scale of resolved.scale) {
      const width = Math.round(resolved.baseWidth * scale);
      const suffix = scaleSuffix(scale);
      const outFileName = `${baseName}${suffix}.${extForFormat}`;
      const targetPath = dir ? `${dir}/${outFileName}` : outFileName;

      let result;
      try {
        result = await convertImage(bytes, {
          to: targetFormat,
          width,
          quality: resolved.quality,
          lossless: resolved.lossless,
          clean: resolved.clean,
          stripMetadata: resolved.clean,
          background: resolved.background,
          transforms: uploadOptions.transforms || resolved.transforms,
          assertAlpha: false,
          policy: uploadOptions.policy || resolved.policy,
        });
      } catch (err) {
        if (err.message && err.message.includes('JPEG cannot store transparency')) {
          throw new Error(`E_ALPHA_NOT_REPRESENTABLE: ${stripCredentials(err.message)}`);
        }
        throw new Error(stripCredentials(err));
      }

      const writeRes = await writeWithRetry(
        adapter,
        bucket,
        targetPath,
        result.data,
        {
          contentType: mimeForFormat,
          cacheControl: 'public, max-age=31536000, immutable',
          upsert: resolved.onConflict === 'overwrite',
        },
      );

      uploadedOutputs.push({
        path: writeRes?.path || targetPath,
        bytes: writeRes?.bytes || result.data.length,
        publicUrl: writeRes?.publicUrl,
        scale,
        width: result.width || width,
        sha256: crypto.createHash('sha256').update(result.data).digest('hex'),
      });
    }

    // 8. Optionally upload original source
    if (resolved.keepOriginal) {
      const origFileName = path.posix.basename(sanitizedPath);
      const origTargetPath = dir ? `${dir}/${origFileName}` : origFileName;
      const origMime = getMimeType(format) || 'application/octet-stream';

      await writeWithRetry(
        adapter,
        bucket,
        origTargetPath,
        bytes,
        {
          contentType: origMime,
          upsert: resolved.onConflict === 'overwrite',
        },
      );
    }

    // 9. Emit manifest
    const manifestData = {
      source: filePath,
      format,
      targetFormat,
      originalBytes: byteLength,
      scales: resolved.scale,
      outputs: uploadedOutputs,
      srcset: generateSrcset(baseName, resolved.scale, targetFormat),
    };

    if (resolved.emitManifest) {
      const manifestPath = dir ? `${dir}/${baseName}.manifest.json` : `${baseName}.manifest.json`;
      const manifestBytes = Buffer.from(JSON.stringify(manifestData, null, 2), 'utf8');
      await writeWithRetry(
        adapter,
        bucket,
        manifestPath,
        manifestBytes,
        {
          contentType: 'application/json',
          cacheControl: 'public, max-age=31536000, immutable',
          upsert: resolved.onConflict === 'overwrite',
        },
      );
    }

    return {
      source: {
        path: filePath,
        bytes: byteLength,
        format,
      },
      outputs: uploadedOutputs,
      manifest: manifestData,
      skipped: false,
      targetFormat,
      targetLockEnforced,
      targetLockBypassed,
    };
  }

  /**
   * Batch converts and uploads multiple assets returning aggregate summary.
   * Executes via bounded worker concurrency pool (default: 4 concurrent uploads).
   *
   * @param {string} bucket
   * @param {Array<{ path: string, bytes: Uint8Array|Buffer|string }>} files
   * @param {{ concurrency?: number }} [batchOptions]
   * @returns {Promise<import('./types').BatchUploadReport>}
   */
  async function uploadMany(bucket, files, batchOptions = {}) {
    if (!Array.isArray(files)) {
      throw new TypeError('files must be an array of { path, bytes } objects.');
    }

    const concurrency = Math.max(1, Math.min(16, Number(batchOptions.concurrency) || 4));
    const reports = new Array(files.length);
    let totalBytesIn = 0;
    let totalBytesOut = 0;
    let cursor = 0;

    async function worker() {
      while (cursor < files.length) {
        const index = cursor++;
        const file = files[index];
        const report = await upload(bucket, file.path, file.bytes);
        reports[index] = report;
        if (!report.skipped) {
          totalBytesIn += report.source.bytes;
          for (const out of report.outputs) {
            totalBytesOut += out.bytes;
          }
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
    await Promise.all(workers);

    const savedBytes = Math.max(0, totalBytesIn - totalBytesOut);
    const savedPercent = totalBytesIn > 0 ? Math.round((savedBytes / totalBytesIn) * 100) : 0;

    return {
      summary: {
        files: reports.length,
        bytesIn: totalBytesIn,
        bytesOut: totalBytesOut,
        savedBytes,
        saved: savedPercent,
      },
      reports,
      manifest: {
        generatedAt: new Date().toISOString(),
        totalFiles: reports.length,
        items: reports.map((r) => r.manifest).filter(Boolean),
      },
    };
  }

  /**
   * Deletes an asset and cascades to every derived scale, manifest, and optional original.
   * Deterministically removes targets regardless of whether adapter supports listing.
   *
   * @param {string} bucket
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async function remove(bucket, filePath) {
    const sanitizedPath = validateStoragePath(filePath);

    const ext = path.posix.extname(sanitizedPath);
    const baseName = path.posix.basename(sanitizedPath, ext) || 'image';
    let dir = path.posix.dirname(sanitizedPath);
    if (dir === '.' || dir === '/') {
      dir = '';
    }
    if (resolved.outPrefix) {
      dir = dir ? `${resolved.outPrefix}/${dir}` : resolved.outPrefix;
    }

    const targets = new Set();

    // 1. Configured scales + standard @1x/@2x/@3x scales
    const allScales = new Set([...resolved.scale, 1, 2, 3]);
    for (const s of allScales) {
      const suffix = scaleSuffix(s);
      targets.add(dir ? `${dir}/${baseName}${suffix}.webp` : `${baseName}${suffix}.webp`);
    }

    // 2. Manifest file
    targets.add(dir ? `${dir}/${baseName}.manifest.json` : `${baseName}.manifest.json`);

    // 3. Original file
    const origFileName = path.posix.basename(sanitizedPath);
    targets.add(dir ? `${dir}/${origFileName}` : origFileName);

    // 4. If adapter supports list(), discover any additional files matching the prefix
    if (typeof adapter.list === 'function') {
      try {
        const listed = await adapter.list(bucket, dir);
        for (const item of listed) {
          const itemBase = path.posix.basename(item);
          if (itemBase.startsWith(`${baseName}.`) || itemBase.startsWith(`${baseName}@`)) {
            targets.add(item);
          }
        }
      } catch {
        // Fall back to deterministic set
      }
    }

    // 5. Delete all targets idempotently
    for (const target of targets) {
      try {
        await adapter.delete(bucket, target);
      } catch {
        // Idempotent deletion ignores missing file errors
      }
    }
  }

  return {
    adapter,
    options: resolved,
    upload,
    uploadMany,
    remove,
  };
}

module.exports = {
  withZapwebp,
  writeWithRetry,
};
