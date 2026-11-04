'use strict';

/**
 * Validates and resolves user options for zapwebp-vite.
 * @param {import('./index').ZapwebpPluginOptions} [rawOptions={}]
 * @returns {Required<import('./index').ZapwebpPluginOptions>}
 */
function resolveConfig(rawOptions = {}) {
  if (rawOptions !== null && typeof rawOptions !== 'object') {
    throw new TypeError('Zapwebp Vite plugin options must be an object.');
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
    // Deduplicate and sort ascending
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

  // 6. OutDir
  let outDir = 'public/icons';
  if (options.outDir !== undefined) {
    if (typeof options.outDir !== 'string' || options.outDir.trim() === '') {
      throw new TypeError('Zapwebp option `outDir` must be a non-empty string path.');
    }
    outDir = options.outDir.trim();
  }

  // 7. Emit flags
  const emitManifest = Boolean(options.emitManifest ?? true);
  const emitToPublic = Boolean(options.emitToPublic ?? true);

  // 8. OnConflict
  let onConflict = 'overwrite';
  if (options.onConflict !== undefined) {
    if (!['overwrite', 'skip', 'error'].includes(options.onConflict)) {
      throw new TypeError("Zapwebp option `onConflict` must be one of: 'overwrite', 'skip', 'error'.");
    }
    onConflict = options.onConflict;
  }

  // 9. Include / Exclude patterns
  let include = ['**/*.svg'];
  if (options.include !== undefined) {
    if (!Array.isArray(options.include) || !options.include.every((p) => typeof p === 'string' && p.length > 0)) {
      throw new TypeError('Zapwebp option `include` must be an array of non-empty string glob patterns.');
    }
    include = options.include;
  }

  let exclude = ['node_modules/**', 'dist/**', '.git/**'];
  if (options.exclude !== undefined) {
    if (!Array.isArray(options.exclude) || !options.exclude.every((p) => typeof p === 'string' && p.length > 0)) {
      throw new TypeError('Zapwebp option `exclude` must be an array of non-empty string glob patterns.');
    }
    exclude = options.exclude;
  }

  return {
    scale,
    baseWidth,
    quality,
    lossless,
    clean,
    outDir,
    emitManifest,
    emitToPublic,
    onConflict,
    include,
    exclude,
  };
}

module.exports = {
  resolveConfig,
};

