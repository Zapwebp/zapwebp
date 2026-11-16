'use strict';

const sharp = require('sharp');
const { ZapwebpError } = require('@zapwebp/shared');

/**
 * Parses target size string or number into positive integer bytes.
 * Supports: 500000, "500kb", "500 KB", "1.5mb", "250b", etc.
 *
 * @param {number|string} val
 * @returns {number}
 * @throws {TypeError|RangeError}
 */
function parseTargetBytes(val) {
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val <= 0) {
      throw new RangeError(`Target bytes must be a positive number. Received: ${val}`);
    }
    return Math.round(val);
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) {
      throw new TypeError('Target bytes string cannot be empty.');
    }

    const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]*)$/);
    if (!match) {
      throw new TypeError(`Invalid target bytes specification: "${val}". Expected format like "500kb", "1.5mb", or positive number.`);
    }

    const num = Number.parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    let multiplier = 1;
    switch (unit) {
      case '':
      case 'b':
      case 'byte':
      case 'bytes':
        multiplier = 1;
        break;
      case 'k':
      case 'kb':
      case 'kib':
        multiplier = 1024;
        break;
      case 'm':
      case 'mb':
      case 'mib':
        multiplier = 1024 * 1024;
        break;
      case 'g':
      case 'gb':
      case 'gib':
        multiplier = 1024 * 1024 * 1024;
        break;
      default:
        throw new TypeError(`Unrecognized size unit: "${unit}" in "${val}". Supported units: B, KB, MB, GB.`);
    }

    const result = Math.round(num * multiplier);
    if (!Number.isFinite(result) || result <= 0) {
      throw new RangeError(`Target bytes must be greater than 0. Received: ${val} (${result})`);
    }
    return result;
  }

  throw new TypeError(`Target bytes must be a positive number or size string (e.g. 500000, "500kb"). Received: ${typeof val}`);
}

/**
 * Default encode function using sharp.
 * @param {object} image RawImage
 * @param {object} opts
 * @returns {Promise<Buffer>}
 */
async function defaultEncodeFn(image, opts = {}) {
  const format = String(opts.format || 'webp').toLowerCase();
  const quality = typeof opts.quality === 'number' ? Math.max(1, Math.min(100, Math.round(opts.quality))) : 80;
  const effort = typeof opts.effort === 'number' ? Math.max(0, Math.min(9, Math.round(opts.effort))) : 4;

  let pipeline = sharp(Buffer.from(image.data), {
    raw: {
      width: image.width,
      height: image.height,
      channels: image.channels || 4,
    },
  });

  if (opts.background && format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.flatten({ background: opts.background });
  }

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality, effort });
  } else if (format === 'avif') {
    pipeline = pipeline.avif({ quality, effort: Math.min(effort, 9) });
  } else if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9, quality });
  } else {
    pipeline = pipeline.webp({ quality, effort });
  }

  const { data } = await pipeline.toBuffer({ resolveWithObject: true });
  return data;
}

/**
 * Resamples raw image to new dimensions using sharp lanczos3.
 * @param {object} image RawImage
 * @param {number} newWidth
 * @param {number} newHeight
 * @returns {Promise<object>} Resized RawImage
 */
async function downscaleRawImage(image, newWidth, newHeight) {
  const channels = image.channels || 4;
  const resized = await sharp(Buffer.from(image.data), {
    raw: {
      width: image.width,
      height: image.height,
      channels,
    },
  })
    .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(resized.data.buffer, resized.data.byteOffset, resized.data.length),
    width: resized.info.width,
    height: resized.info.height,
    channels: resized.info.channels,
  };
}

/**
 * Runs binary search over quality range [minQuality, maxQuality] to find the highest
 * quality that satisfies targetBytes.
 *
 * @param {object} image RawImage
 * @param {number} targetBytes Maximum allowed bytes
 * @param {number} minQuality Minimum quality bound (e.g. 10)
 * @param {number} maxQuality Maximum quality bound (e.g. 95)
 * @param {object} [options]
 * @param {Function} [encodeFn]
 * @returns {Promise<{ bestCandidate: object|null, bestAttempt: object|null, iterations: number }>}
 */
async function binarySearchQuality(image, targetBytes, minQuality, maxQuality, options = {}, encodeFn = defaultEncodeFn) {
  let low = Math.max(1, Math.min(100, Math.round(minQuality)));
  let high = Math.max(low, Math.min(100, Math.round(maxQuality)));
  const maxIterations = typeof options.maxIterations === 'number' ? Math.max(1, Math.round(options.maxIterations)) : 8;

  let iterations = 0;
  let bestCandidate = null;
  let bestAttempt = null;

  while (low <= high && iterations < maxIterations) {
    iterations++;
    const mid = Math.floor((low + high) / 2);
    const encoded = await encodeFn(image, { ...options, quality: mid });
    const bytes = encoded.length;

    const attempt = {
      data: encoded,
      bytes,
      quality: mid,
      width: image.width,
      height: image.height,
    };

    if (!bestAttempt || bytes < bestAttempt.bytes) {
      bestAttempt = attempt;
    }

    if (bytes <= targetBytes) {
      bestCandidate = attempt;
      low = mid + 1; // Attempt higher quality while remaining within target
    } else {
      high = mid - 1; // Exceeded target, search lower quality
    }
  }

  // If binary search did not find a candidate within iterations, check minQuality as safety floor
  if (!bestCandidate && iterations < maxIterations && (!bestAttempt || bestAttempt.quality !== minQuality)) {
    iterations++;
    const encodedMin = await encodeFn(image, { ...options, quality: minQuality });
    const bytesMin = encodedMin.length;
    const minAttempt = {
      data: encodedMin,
      bytes: bytesMin,
      quality: minQuality,
      width: image.width,
      height: image.height,
    };

    if (!bestAttempt || bytesMin < bestAttempt.bytes) {
      bestAttempt = minAttempt;
    }

    if (bytesMin <= targetBytes) {
      bestCandidate = minAttempt;
    }
  }

  return { bestCandidate, bestAttempt, iterations };
}

/**
 * Intelligent size reduction algorithm. Optimizes quality and rescales dimensions
 * deterministically to fit within targetBytes.
 *
 * @param {object} image RawImage { data, width, height, channels? }
 * @param {object} options CompressOptions
 * @returns {Promise<object>} CompressionResult
 */
async function compress(image, options = {}) {
  if (!image || typeof image !== 'object' || !image.data || !image.width || !image.height) {
    throw new TypeError('Invalid RawImage provided to compressor. Expected { data, width, height }.');
  }

  const targetBytes = parseTargetBytes(options.targetBytes);
  let minQuality = options.minQuality !== undefined ? Math.max(1, Math.min(100, Math.round(options.minQuality))) : 10;
  let maxQuality = options.maxQuality !== undefined ? Math.max(1, Math.min(100, Math.round(options.maxQuality))) : 95;
  if (minQuality > maxQuality) {
    minQuality = maxQuality;
  }

  const allowDownscale = options.allowDownscale !== false;
  const downscaleStep = typeof options.downscaleStep === 'number' && options.downscaleStep > 0 && options.downscaleStep < 1
    ? options.downscaleStep
    : 0.9;
  const maxDownscaleAttempts = typeof options.maxDownscaleAttempts === 'number' ? Math.max(0, Math.round(options.maxDownscaleAttempts)) : 3;
  const maxIterations = typeof options.maxIterations === 'number' ? Math.max(1, Math.round(options.maxIterations)) : 8;
  const throwOnUnreachable = options.throwOnUnreachable !== false;
  const encodeFn = typeof options.encodeFn === 'function' ? options.encodeFn : defaultEncodeFn;

  let currentImage = image;
  let downscaleCount = 0;
  let totalIterations = 0;
  let bestOverallAttempt = null;

  while (true) {
    const { bestCandidate, bestAttempt, iterations } = await binarySearchQuality(
      currentImage,
      targetBytes,
      minQuality,
      maxQuality,
      { ...options, maxIterations },
      encodeFn
    );

    totalIterations += iterations;

    if (!bestOverallAttempt || (bestAttempt && bestAttempt.bytes < bestOverallAttempt.bytes)) {
      bestOverallAttempt = bestAttempt;
    }

    if (bestCandidate) {
      return {
        output: bestCandidate.data,
        quality: bestCandidate.quality,
        width: currentImage.width,
        height: currentImage.height,
        bytes: bestCandidate.bytes,
        downscaled: downscaleCount > 0,
        downscaleCount,
        iterations: totalIterations,
        achieved: true,
        reason: downscaleCount > 0
          ? `Achieved target (${targetBytes} B) after ${downscaleCount} downscale attempt(s) at quality ${bestCandidate.quality}.`
          : `Achieved target (${targetBytes} B) via quality optimization (${bestCandidate.quality}).`,
      };
    }

    if (allowDownscale && downscaleCount < maxDownscaleAttempts) {
      const nextWidth = Math.max(1, Math.round(currentImage.width * downscaleStep));
      const nextHeight = Math.max(1, Math.round(currentImage.height * downscaleStep));

      if (nextWidth === currentImage.width && nextHeight === currentImage.height) {
        break;
      }

      currentImage = await downscaleRawImage(currentImage, nextWidth, nextHeight);
      downscaleCount++;
      continue;
    }

    break;
  }

  if (throwOnUnreachable) {
    const actualBytes = bestOverallAttempt?.bytes || 0;
    const actualQuality = bestOverallAttempt?.quality || minQuality;
    const actualWidth = bestOverallAttempt?.width || currentImage.width;
    const actualHeight = bestOverallAttempt?.height || currentImage.height;

    throw new ZapwebpError({
      code: 'E_TARGET_UNREACHABLE',
      message: `Cannot fit image under target size of ${targetBytes} bytes (best attempt reached ${actualBytes} bytes at quality ${actualQuality}, ${actualWidth}x${actualHeight}).`,
      fix: 'The image is too complex for the target size. Increase targetBytes, enable downscaling, or lower minQuality.',
      actualBytes,
      targetBytes,
      suggestedFix: {
        targetBytes: Math.ceil((actualBytes || targetBytes) * 1.05),
        quality: actualQuality,
        allowDownscale: true,
      },
      bestAttempt: bestOverallAttempt ? {
        bytes: actualBytes,
        quality: actualQuality,
        width: actualWidth,
        height: actualHeight,
      } : undefined,
    });
  }

  return {
    output: bestOverallAttempt?.data || Buffer.alloc(0),
    quality: bestOverallAttempt?.quality || minQuality,
    width: bestOverallAttempt?.width || currentImage.width,
    height: bestOverallAttempt?.height || currentImage.height,
    bytes: bestOverallAttempt?.bytes || 0,
    downscaled: downscaleCount > 0,
    downscaleCount,
    iterations: totalIterations,
    achieved: false,
    reason: `Target byte limit (${targetBytes} B) unreachable within configured quality and downscale bounds.`,
    bestAttempt: bestOverallAttempt ? {
      bytes: bestOverallAttempt.bytes,
      quality: bestOverallAttempt.quality,
      width: bestOverallAttempt.width,
      height: bestOverallAttempt.height,
    } : undefined,
  };
}

module.exports = {
  parseTargetBytes,
  binarySearchQuality,
  downscaleRawImage,
  compress,
  defaultEncodeFn,
};
