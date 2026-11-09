'use strict';

const SUPPORTED_OUTPUT_FORMATS = new Set(['webp', 'png', 'jpeg', 'jpg', 'avif']);
const DEFAULT_GLOB = '**/*.{svg,png,jpg,jpeg,webp,avif}';

/**
 * Normalizes and validates inputs from command-line arguments or GitHub Action environment variables.
 * Enforces strict input validation to prevent command/path injection and directory traversal.
 * @param {string[]} [argv=[]]
 * @param {Record<string, string>} [env=process.env]
 * @returns {{
 *   glob: string,
 *   inputGlob: string,
 *   format: string,
 *   scale: number[],
 *   baseWidth: number,
 *   quality: number,
 *   lossless: boolean,
 *   clean: boolean,
 *   outDir: string,
 *   mode: 'commit' | 'check' | 'comment',
 *   commitMessage: string,
 *   token: string
 * }}
 */
function parseInputs(argv = [], env = process.env) {
  // Support positional Docker arguments or standard GitHub Actions INPUT_* env variables
  let rawGlob = env.INPUT_INPUT_GLOB || env['INPUT_INPUT-GLOB'] || env.INPUT_GLOB;
  let rawFormat = env.INPUT_FORMAT;
  let rawScale = env.INPUT_SCALE;
  let rawBaseWidth = env['INPUT_BASE-WIDTH'] || env.INPUT_BASE_WIDTH;
  let rawQuality = env.INPUT_QUALITY;
  let rawLossless = env.INPUT_LOSSLESS;
  let rawClean = env.INPUT_CLEAN;
  let rawOutDir = env['INPUT_OUT-DIR'] || env.INPUT_OUT_DIR;
  let rawMode = env.INPUT_MODE;
  let rawCommitMessage = env['INPUT_COMMIT-MESSAGE'] || env.INPUT_COMMIT_MESSAGE;
  let rawToken = env.INPUT_TOKEN || env.GITHUB_TOKEN;

  // Support positional arguments passed by Docker entrypoint:
  if (argv.length > 0) {
    if (argv[0] !== undefined) rawGlob = argv[0];

    let hasFormat = false;
    if (argv[1] !== undefined) {
      const candidate = String(argv[1]).trim();
      const isScaleLike = /^[\d.,\s]+$/.test(candidate);
      if (isScaleLike) {
        hasFormat = false;
      } else {
        rawFormat = candidate.toLowerCase();
        hasFormat = true;
      }
    }

    if (hasFormat) {
      if (argv[2] !== undefined) rawScale = argv[2];
      if (argv[3] !== undefined) rawBaseWidth = argv[3];
      if (argv[4] !== undefined) rawQuality = argv[4];
      if (argv[5] !== undefined) rawLossless = argv[5];
      if (argv[6] !== undefined) rawClean = argv[6];
      if (argv[7] !== undefined) rawOutDir = argv[7];
      if (argv[8] !== undefined) rawMode = argv[8];
      if (argv[9] !== undefined) rawCommitMessage = argv[9];
      if (argv[10] !== undefined) rawToken = argv[10];
    } else {
      if (argv[1] !== undefined) rawScale = argv[1];
      if (argv[2] !== undefined) rawBaseWidth = argv[2];
      if (argv[3] !== undefined) rawQuality = argv[3];
      if (argv[4] !== undefined) rawLossless = argv[4];
      if (argv[5] !== undefined) rawClean = argv[5];
      if (argv[6] !== undefined) rawOutDir = argv[6];
      if (argv[7] !== undefined) rawMode = argv[7];
      if (argv[8] !== undefined) rawCommitMessage = argv[8];
      if (argv[9] !== undefined) rawToken = argv[9];
    }
  }

  // 1. Glob validation (no path traversal, relative only, bounded length)
  if (rawGlob !== undefined && (typeof rawGlob !== 'string' || !rawGlob.trim())) {
    throw new TypeError('Input glob must be a non-empty string.');
  }
  const glob = (rawGlob?.trim()) || DEFAULT_GLOB;
  if (glob.length > 500) {
    throw new RangeError('Input `glob` cannot exceed 500 characters.');
  }
  if (glob.startsWith('/') || glob.startsWith('\\') || /^[A-Za-z]:/.test(glob)) {
    throw new TypeError('Input `glob` must be a relative path pattern.');
  }
  if (glob.includes('..')) {
    throw new TypeError('Input `glob` cannot traverse parent directories with `..`.');
  }
  if (/[\r\n]/.test(glob)) {
    throw new TypeError('Input `glob` cannot contain newline characters.');
  }

  // 2. Format validation
  let format = typeof rawFormat === 'string' && rawFormat.trim() ? rawFormat.trim().toLowerCase() : 'webp';
  if (format === 'jpg') format = 'jpeg';
  if (!SUPPORTED_OUTPUT_FORMATS.has(format)) {
    throw new TypeError(`Invalid target format: "${format}". Supported formats: webp, png, jpeg, avif.`);
  }

  // 3. Scale multipliers validation
  const scaleInput = rawScale !== undefined && rawScale !== '' ? String(rawScale) : '1';
  if (/[\r\n]/.test(scaleInput)) {
    throw new TypeError('Input `scale` cannot contain newline characters.');
  }
  const scaleParts = scaleInput.split(',').map((s) => Number(s.trim()));
  if (scaleParts.some((n) => !Number.isFinite(n) || n <= 0 || n > 10)) {
    throw new RangeError(`Invalid scale factor in "${scaleInput}". Multipliers must be positive numbers between 0.1 and 10.`);
  }
  const scale = Array.from(new Set(scaleParts)).sort((a, b) => a - b);
  if (scale.length === 0) {
    throw new RangeError('At least one valid scale multiplier must be provided.');
  }

  // 4. Base width validation
  const baseWidthInput = rawBaseWidth !== undefined && rawBaseWidth !== '' ? Number(rawBaseWidth) : 512;
  if (!Number.isInteger(baseWidthInput) || baseWidthInput < 16 || baseWidthInput > 16384) {
    throw new RangeError('Zapwebp action input `base-width` must be an integer between 16 and 16384.');
  }

  // 5. Quality validation
  const qualityInput = rawQuality !== undefined && rawQuality !== '' ? Number(rawQuality) : 85;
  if (!Number.isInteger(qualityInput) || qualityInput < 1 || qualityInput > 100) {
    throw new RangeError('Zapwebp action input `quality` must be an integer between 1 and 100.');
  }

  // 6. Booleans
  const lossless = String(rawLossless).toLowerCase() === 'true';
  const clean = rawClean !== undefined ? String(rawClean).toLowerCase() !== 'false' : true;

  // 7. Output directory validation
  const outDir = typeof rawOutDir === 'string' ? rawOutDir.trim() : '';
  if (outDir) {
    if (outDir.length > 500) {
      throw new RangeError('Input `out-dir` cannot exceed 500 characters.');
    }
    if (outDir.startsWith('/') || outDir.startsWith('\\') || /^[A-Za-z]:/.test(outDir)) {
      throw new TypeError('Input `out-dir` must be a relative directory path.');
    }
    if (outDir.includes('..')) {
      throw new TypeError('Input `out-dir` cannot traverse parent directories with `..`.');
    }
    if (/[\r\n]/.test(outDir)) {
      throw new TypeError('Input `out-dir` cannot contain newline characters.');
    }
  }

  // 8. Action mode validation
  const mode = typeof rawMode === 'string' ? rawMode.toLowerCase() : 'commit';
  if (!['commit', 'check', 'comment'].includes(mode)) {
    throw new TypeError(`Invalid action mode: "${mode}". Must be 'commit', 'check', or 'comment'.`);
  }

  // 9. Commit message validation
  let commitMessage = rawCommitMessage || 'chore: optimize images [zapwebp]';
  if (typeof commitMessage !== 'string' || !commitMessage.trim()) {
    commitMessage = 'chore: optimize images [zapwebp]';
  }
  if (commitMessage.length > 200) {
    throw new RangeError('Input `commit-message` cannot exceed 200 characters.');
  }
  if (/[\r\n]/.test(commitMessage)) {
    throw new TypeError('Input `commit-message` cannot contain newline characters.');
  }

  const token = typeof rawToken === 'string' ? rawToken.trim() : '';

  return {
    glob,
    inputGlob: glob,
    format,
    scale,
    baseWidth: baseWidthInput,
    quality: qualityInput,
    lossless,
    clean,
    outDir,
    mode,
    commitMessage,
    token,
  };
}

module.exports = {
  SUPPORTED_OUTPUT_FORMATS,
  DEFAULT_GLOB,
  parseInputs,
};
