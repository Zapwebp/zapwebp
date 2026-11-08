'use strict';

/**
 * Validates and resolves user options for zapwebp-next.
 * @param {import('./index').ZapwebpNextOptions} [rawOptions={}]
 * @returns {Required<import('./index').ZapwebpNextOptions>}
 */
function resolveConfig(rawOptions = {}) {
  if (rawOptions !== null && typeof rawOptions !== 'object') {
    throw new TypeError('Zapwebp Next.js plugin options must be an object.');
  }

  const options = { ...rawOptions };

  // 1. Scales
  let scale = [1];
  if (options.scale !== undefined) {
    if (!Array.isArray(options.scale) || options.scale.length === 0) {
      throw new TypeError('Zapwebp option `scale` must be a non-empty array of positive numbers (e.g. [1, 2, 3]).');
    }
    scale = options.scale.map((s) => {
      const num = Number(s);
      if (!Number.isFinite(num) || num <= 0 || num > 10) {
        throw new RangeError(`Invalid scale factor: ${s}. Multipliers must be positive numbers between 0.1 and 10.`);
      }
      return num;
    });
    scale = Array.from(new Set(scale)).sort((a, b) => a - b);
  }

  // 2. Base width
  let baseWidth = 512;
  if (options.baseWidth !== undefined) {
    const bw = Number(options.baseWidth);
    if (!Number.isInteger(bw) || bw < 16 || bw > 16384) {
      throw new RangeError('Zapwebp option `baseWidth` must be an integer between 16 and 16384 pixels.');
    }
    baseWidth = bw;
  }

  // 3. Quality
  let quality = 85;
  if (options.quality !== undefined) {
    const q = Number(options.quality);
    if (!Number.isInteger(q) || q < 1 || q > 100) {
      throw new RangeError('Zapwebp option `quality` must be an integer between 1 and 100.');
    }
    quality = q;
  }

  // 4. Lossless
  const lossless = Boolean(options.lossless ?? false);

  // 5. Clean (metadata stripping)
  const clean = Boolean(options.clean ?? true);

  // 6. Source dirs
  let sourceDirs = ['public', 'src/assets', 'app'];
  if (options.sourceDirs !== undefined) {
    if (!Array.isArray(options.sourceDirs) || !options.sourceDirs.every((d) => typeof d === 'string' && d.trim().length > 0)) {
      throw new TypeError('Zapwebp option `sourceDirs` must be an array of non-empty directory path strings.');
    }
    sourceDirs = options.sourceDirs.map((d) => d.trim());
  }

  // 7. OutDir
  let outDir = 'public/icons';
  if (options.outDir !== undefined) {
    if (typeof options.outDir !== 'string' || options.outDir.trim() === '') {
      throw new TypeError('Zapwebp option `outDir` must be a non-empty string path.');
    }
    outDir = options.outDir.trim();
  }

  // 8. Emit flags
  const emitManifest = Boolean(options.emitManifest ?? true);
  const respectNextImage = Boolean(options.respectNextImage ?? true);

  // 9. Formats
  let format = 'webp';
  if (options.format !== undefined) {
    if (typeof options.format !== 'string' || options.format.trim() === '') {
      throw new TypeError('Zapwebp option `format` must be a string (e.g. "webp", "avif").');
    }
    format = options.format.trim().toLowerCase();
  }

  let formats = [format];
  if (options.formats !== undefined) {
    if (!Array.isArray(options.formats) || options.formats.length === 0) {
      throw new TypeError('Zapwebp option `formats` must be a non-empty array of format strings (e.g. ["webp", "avif"]).');
    }
    formats = Array.from(new Set(options.formats.map((f) => String(f).trim().toLowerCase())));
  }

  // 10. Background color for non-alpha targets
  const background = options.background !== undefined ? String(options.background) : undefined;

  // 11. Custom loader flag
  const customLoader = Boolean(options.customLoader ?? true);

  // 12. OnConflict
  let onConflict = 'overwrite';
  if (options.onConflict !== undefined) {
    if (!['overwrite', 'skip', 'error'].includes(options.onConflict)) {
      throw new TypeError("Zapwebp option `onConflict` must be one of: 'overwrite', 'skip', 'error'.");
    }
    onConflict = options.onConflict;
  }

  return {
    format,
    formats,
    background,
    customLoader,
    scale,
    baseWidth,
    quality,
    lossless,
    clean,
    sourceDirs,
    outDir,
    emitManifest,
    respectNextImage,
    onConflict,
  };
}

module.exports = {
  resolveConfig,
};

