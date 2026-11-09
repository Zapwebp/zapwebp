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

/**
 * Executes storage write with exponential backoff retry on transient network/rate-limit failures.
 * Fails immediately on permanent errors (auth, not found, forbidden, invalid credentials).
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
      const msg = (err && err.message ? err.message : String(err)).toLowerCase();
      const isPermanent = msg.includes('auth') || msg.includes('credential') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('not found') || msg.includes('permission');
      if (attempt >= maxRetries || isPermanent) {
        throw err;
      }
      const delay = Math.round(50 * Math.pow(2, attempt) + Math.random() * 20);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Wraps a StorageAdapter with the Zapwebp conversion and multi-scale pipeline.
 * Intercept -> Convert -> Upload.
 * @param {import('./types').StorageAdapter} adapter
 * @param {import('./types').ZapwebpStorageOptions} [options]
 * @returns {import('./types').ZapwebpStorageInstance}
 */
function withZapwebp(adapter, options) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('withZapwebp requires an adapter object implementing StorageAdapter.');
  }
  if (!adapter.name || typeof adapter.write !== 'function' || typeof adapter.read !== 'function' || typeof adapter.delete !== 'function') {
    throw new TypeError('Adapter must implement name, write, read, and delete methods.');
  }

  const resolved = resolveOptions(options);

  /**
   * Converts and uploads a single image asset across all configured scale multipliers.
   * @param {string} bucket
   * @param {string} filePath
   * @param {Uint8Array|Buffer} bytes
   * @param {object} [uploadOptions]
   * @returns {Promise<import('./types').UploadReport>}
   */
  async function upload(bucket, filePath, bytes, uploadOptions = {}) {
    if (!filePath || typeof filePath !== 'string') {
      throw new TypeError('filePath must be a non-empty string.');
    }
    if (!bytes || (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array))) {
      throw new TypeError('bytes must be a Buffer or Uint8Array.');
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

    // 1. Validate size constraint
    if (byteLength > resolved.maxBytes) {
      throw new Error(`E_TOO_LARGE: Original size ${byteLength} bytes exceeds maxBytes limit of ${resolved.maxBytes}`);
    }

    // 2. Detect & validate input format
    let format;
    try {
      format = detectFormat(bytes);
    } catch (err) {
      if (!isStrict) {
        // Pass-through in non-strict mode
        const normalizedPath = filePath.replace(/\\/g, '/');
        const ext = path.posix.extname(normalizedPath);
        const baseName = path.posix.basename(normalizedPath, ext) || 'image';
        let dir = path.posix.dirname(normalizedPath);
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

    // 3. Compute target paths and directory prefix
    const normalizedPath = filePath.replace(/\\/g, '/');
    const ext = path.posix.extname(normalizedPath);
    const baseName = path.posix.basename(normalizedPath, ext) || 'image';
    let dir = path.posix.dirname(normalizedPath);
    if (dir === '.' || dir === '/') {
      dir = '';
    }
    if (resolved.outPrefix) {
      dir = dir ? `${resolved.outPrefix}/${dir}` : resolved.outPrefix;
    }

    // 4. Pre-upload existence check (for 'skip' or 'error' conflict modes)
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

    // 5. Convert and write each scale
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
          throw new Error(`E_ALPHA_NOT_REPRESENTABLE: ${err.message}`);
        }
        throw err;
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

    // 6. Optionally upload original source
    if (resolved.keepOriginal) {
      const origFileName = path.posix.basename(normalizedPath);
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

    // 7. Emit manifest
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
   * @param {string} bucket
   * @param {Array<{ path: string, bytes: Uint8Array|Buffer }>} files
   * @param {object} [batchOptions]
   * @returns {Promise<import('./types').BatchUploadReport>}
   */
  async function uploadMany(bucket, files, batchOptions = {}) {
    if (!Array.isArray(files)) {
      throw new TypeError('files must be an array of { path, bytes } objects.');
    }

    let totalBytesIn = 0;
    let totalBytesOut = 0;
    const reports = [];

    for (const file of files) {
      const report = await upload(bucket, file.path, file.bytes);
      reports.push(report);
      if (!report.skipped) {
        totalBytesIn += report.source.bytes;
        for (const out of report.outputs) {
          totalBytesOut += out.bytes;
        }
      }
    }

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
   * @param {string} bucket
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async function remove(bucket, filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new TypeError('filePath must be a non-empty string.');
    }

    const normalizedPath = filePath.replace(/\\/g, '/');
    const ext = path.posix.extname(normalizedPath);
    const baseName = path.posix.basename(normalizedPath, ext) || 'image';
    let dir = path.posix.dirname(normalizedPath);
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
    const origFileName = path.posix.basename(normalizedPath);
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
};
