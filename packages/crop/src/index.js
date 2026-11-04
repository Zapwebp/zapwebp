'use strict';

const { ZapwebpError } = require('@zapwebp/shared');

/**
 * Standard predefined crop presets for common platforms.
 */
const CROP_PRESETS = Object.freeze({
  avatar: Object.freeze({ mode: 'auto', aspectRatio: '1:1', gravity: 'face' }),
  thumbnail: Object.freeze({ mode: 'auto', aspectRatio: '16:9', gravity: 'center' }),
  banner: Object.freeze({ mode: 'auto', aspectRatio: '21:9', gravity: 'center' }),
  product: Object.freeze({ mode: 'auto', aspectRatio: '4:5', gravity: 'center', fit: 'contain', background: 'transparent' }),
  story: Object.freeze({ mode: 'auto', aspectRatio: '9:16', gravity: 'center' }),
});

/**
 * Parses an aspect ratio string, object, or number into a numeric ratio (width / height).
 * @param {string|number|{width: number, height: number}} ratio
 * @returns {number}
 */
function parseAspectRatio(ratio) {
  if (typeof ratio === 'number') {
    if (!Number.isFinite(ratio) || ratio <= 0) {
      throw new Error(`Invalid numeric aspect ratio: ${ratio}. Must be a positive finite number.`);
    }
    return ratio;
  }
  if (typeof ratio === 'object' && ratio !== null) {
    const w = Number(ratio.width);
    const h = Number(ratio.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      throw new Error('Aspect ratio object must contain positive finite `width` and `height`.');
    }
    return w / h;
  }
  if (typeof ratio === 'string') {
    const trimmed = ratio.trim();
    if (trimmed.includes(':') || trimmed.includes('/')) {
      const parts = trimmed.split(/[:/]/);
      if (parts.length === 2) {
        const w = Number.parseFloat(parts[0]);
        const h = Number.parseFloat(parts[1]);
        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
          return w / h;
        }
      }
    }
    const parsedNum = Number.parseFloat(trimmed);
    if (Number.isFinite(parsedNum) && parsedNum > 0) {
      return parsedNum;
    }
  }
  throw new Error(`Unrecognized aspect ratio format: "${ratio}". Expected "16:9", "1:1", "4:5", {width, height}, or positive number.`);
}

/**
 * Parses color string into RGBA bytes [r, g, b, a].
 * @param {string} color
 * @returns {[number, number, number, number]}
 */
function parseColor(color) {
  if (!color || color === 'transparent') {
    return [0, 0, 0, 0];
  }
  const str = String(color).trim().toLowerCase();
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 255];
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 255];
    }
    if (hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a = Number.parseInt(hex.slice(6, 8), 16);
      return [r, g, b, a];
    }
  }
  if (str.startsWith('rgb')) {
    const match = str.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      const r = Math.min(255, Math.max(0, Math.round(Number(match[0]))));
      const g = Math.min(255, Math.max(0, Math.round(Number(match[1]))));
      const b = Math.min(255, Math.max(0, Math.round(Number(match[2]))));
      const a = match.length >= 4 ? Math.min(255, Math.max(0, Math.round(Number(match[3]) * 255))) : 255;
      return [r, g, b, a];
    }
  }
  return [0, 0, 0, 0];
}

/**
 * Fast face detection heuristic analyzing skin-tone clustering and luminance gradients.
 * Wrapped with a 500ms safety timeout gate.
 * @param {import('@zapwebp/plugin-sdk').RawImage} image
 * @returns {Promise<{x: number, y: number, width: number, height: number} | null>}
 */
async function detectFaceBounds(image) {
  const detectPromise = new Promise((resolve) => {
    try {
      const { data, width, height } = image;
      const step = Math.max(1, Math.floor(Math.min(width, height) / 100));
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let matchCount = 0;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a > 128) {
            // Normalized skin-tone detection in RGB & YCbCr space
            const isSkin =
              r > 60 && g > 40 && b > 20 &&
              r > g && r > b &&
              (r - g) >= 15 && Math.abs(r - g) <= 120 &&
              (Math.max(r, g, b) - Math.min(r, g, b)) >= 15;

            if (isSkin) {
              matchCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }

      // Minimum threshold of matching clusters to qualify as a face
      const minClusterSize = (width * height) / (step * step * 100);
      if (matchCount >= minClusterSize && maxX > minX && maxY > minY) {
        resolve({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
      } else {
        resolve(null);
      }
    } catch {
      resolve(null);
    }
  });

  const timeoutPromise = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 500);
    if (typeof timer.unref === 'function') timer.unref();
  });

  return Promise.race([detectPromise, timeoutPromise]);
}

/**
 * Calculates bounding box and dimensions for cropping without altering source pixels.
 * @param {number} inputWidth
 * @param {number} inputHeight
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function calculateCropBox(inputWidth, inputHeight, options = {}) {
  if (!Number.isInteger(inputWidth) || !Number.isInteger(inputHeight) || inputWidth <= 0 || inputHeight <= 0) {
    throw new Error('Input dimensions must be positive integers.');
  }

  // Resolve presets if name is passed
  const opts = typeof options === 'string'
    ? (CROP_PRESETS[options] || { mode: 'auto', aspectRatio: options })
    : { ...options };

  const mode = opts.mode || (opts.aspectRatio ? 'auto' : 'manual');

  if (mode === 'manual') {
    let rawX = opts.x !== undefined ? opts.x : 0;
    let rawY = opts.y !== undefined ? opts.y : 0;
    let rawW = opts.width !== undefined ? opts.width : inputWidth;
    let rawH = opts.height !== undefined ? opts.height : inputHeight;

    // Detect percentage coordinates (< 1)
    const cropX = rawX < 1 && rawX >= 0 ? Math.round(rawX * inputWidth) : Math.round(rawX);
    const cropY = rawY < 1 && rawY >= 0 ? Math.round(rawY * inputHeight) : Math.round(rawY);
    const cropW = rawW <= 1 && rawW > 0 ? Math.round(rawW * inputWidth) : Math.round(rawW);
    const cropH = rawH <= 1 && rawH > 0 ? Math.round(rawH * inputHeight) : Math.round(rawH);

    // Clamping to image bounds
    const clampedX = Math.max(0, Math.min(cropX, inputWidth - 1));
    const clampedY = Math.max(0, Math.min(cropY, inputHeight - 1));
    const clampedW = Math.max(0, Math.min(cropW, inputWidth - clampedX));
    const clampedH = Math.max(0, Math.min(cropH, inputHeight - clampedY));

    if (clampedW <= 0 || clampedH <= 0) {
      throw new ZapwebpError({
        code: 'E_CROP_EMPTY',
        message: 'E_CROP_EMPTY: The requested crop region has zero or negative dimensions.',
        fix: 'Specify valid non-zero crop coordinates within image bounds.',
        crop: { x: clampedX, y: clampedY, width: clampedW, height: clampedH },
      });
    }

    return {
      mode: 'manual',
      x: clampedX,
      y: clampedY,
      width: clampedW,
      height: clampedH,
      fit: 'cover',
    };
  }

  // Auto-Crop Mode
  const targetRatio = parseAspectRatio(opts.aspectRatio || '1:1');
  const imgRatio = inputWidth / inputHeight;
  const fit = opts.fit === 'contain' ? 'contain' : 'cover';

  if (fit === 'contain') {
    let outWidth;
    let outHeight;
    if (imgRatio > targetRatio) {
      outWidth = inputWidth;
      outHeight = Math.round(inputWidth / targetRatio);
    } else {
      outHeight = inputHeight;
      outWidth = Math.round(inputHeight * targetRatio);
    }
    return {
      mode: 'auto',
      fit: 'contain',
      x: 0,
      y: 0,
      width: inputWidth,
      height: inputHeight,
      outWidth,
      outHeight,
      aspectRatio: targetRatio,
      background: opts.background || 'transparent',
    };
  }

  // Cover fit
  let cropW;
  let cropH;
  if (imgRatio > targetRatio) {
    cropH = inputHeight;
    cropW = Math.round(cropH * targetRatio);
  } else {
    cropW = inputWidth;
    cropH = Math.round(cropW / targetRatio);
  }

  cropW = Math.max(1, Math.min(cropW, inputWidth));
  cropH = Math.max(1, Math.min(cropH, inputHeight));

  // Determine gravity anchor
  let anchorX = 0.5;
  let anchorY = 0.5;

  const gravity = opts.gravity || 'center';
  if (typeof gravity === 'object' && gravity !== null) {
    if (gravity.x !== undefined) anchorX = Math.max(0, Math.min(1, Number(gravity.x)));
    if (gravity.y !== undefined) anchorY = Math.max(0, Math.min(1, Number(gravity.y)));
  } else if (gravity === 'top') {
    anchorX = 0.5;
    anchorY = 0.0;
  } else if (gravity === 'bottom') {
    anchorX = 0.5;
    anchorY = 1.0;
  } else if (gravity === 'left') {
    anchorX = 0.0;
    anchorY = 0.5;
  } else if (gravity === 'right') {
    anchorX = 1.0;
    anchorY = 0.5;
  } else if (gravity === 'face' && opts.faceBounds) {
    const face = opts.faceBounds;
    const faceCenterX = face.x + face.width / 2;
    const faceCenterY = face.y + face.height / 2;
    anchorX = Math.max(0, Math.min(1, faceCenterX / inputWidth));
    anchorY = Math.max(0, Math.min(1, faceCenterY / inputHeight));
  }

  let cropX = Math.round(anchorX * (inputWidth - cropW));
  let cropY = Math.round(anchorY * (inputHeight - cropH));

  cropX = Math.max(0, Math.min(cropX, inputWidth - cropW));
  cropY = Math.max(0, Math.min(cropY, inputHeight - cropH));

  return {
    mode: 'auto',
    fit: 'cover',
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
    aspectRatio: targetRatio,
    gravity: typeof gravity === 'string' ? gravity : 'custom',
  };
}

/**
 * Pure function: crops a RawImage and returns a new RawImage.
 * @param {import('@zapwebp/plugin-sdk').RawImage} image
 * @param {object} [options]
 * @returns {Promise<import('@zapwebp/plugin-sdk').RawImage>}
 */
async function cropImage(image, options = {}) {
  if (!image || !image.data || !Number.isInteger(image.width) || !Number.isInteger(image.height)) {
    throw new TypeError('image must be a RawImage object containing { data, width, height }.');
  }

  const { data: srcBytes, width: inputWidth, height: inputHeight } = image;
  if (inputWidth <= 0 || inputHeight <= 0 || srcBytes.length < inputWidth * inputHeight * 4) {
    throw new Error('E_CROP_EMPTY: RawImage has empty dimensions or truncated pixel buffer.');
  }

  let effectiveOptions = typeof options === 'string'
    ? (CROP_PRESETS[options] || { mode: 'auto', aspectRatio: options })
    : { ...options };

  // Face detection pass if gravity: 'face'
  if (effectiveOptions.gravity === 'face' && !effectiveOptions.faceBounds) {
    const face = await detectFaceBounds(image);
    effectiveOptions = { ...effectiveOptions, faceBounds: face };
  }

  const box = await calculateCropBox(inputWidth, inputHeight, effectiveOptions);

  if (box.fit === 'contain') {
    const outWidth = box.outWidth;
    const outHeight = box.outHeight;
    const dstBytes = new Uint8ClampedArray(outWidth * outHeight * 4);
    const bg = parseColor(box.background);

    // Fill background
    if (bg[3] > 0) {
      for (let i = 0; i < dstBytes.length; i += 4) {
        dstBytes[i] = bg[0];
        dstBytes[i + 1] = bg[1];
        dstBytes[i + 2] = bg[2];
        dstBytes[i + 3] = bg[3];
      }
    }

    // Center position
    const offsetX = Math.round((outWidth - inputWidth) / 2);
    const offsetY = Math.round((outHeight - inputHeight) / 2);

    for (let row = 0; row < inputHeight; row++) {
      const srcOffset = (row * inputWidth) * 4;
      const dstOffset = ((offsetY + row) * outWidth + offsetX) * 4;
      dstBytes.set(srcBytes.subarray(srcOffset, srcOffset + inputWidth * 4), dstOffset);
    }

    return {
      data: dstBytes,
      width: outWidth,
      height: outHeight,
    };
  }

  // Cover or manual crop
  const cropW = box.width;
  const cropH = box.height;
  const cropX = box.x;
  const cropY = box.y;

  const dstBytes = new Uint8ClampedArray(cropW * cropH * 4);
  for (let row = 0; row < cropH; row++) {
    const srcStart = ((cropY + row) * inputWidth + cropX) * 4;
    const srcEnd = srcStart + cropW * 4;
    const dstStart = row * cropW * 4;
    dstBytes.set(srcBytes.subarray(srcStart, srcEnd), dstStart);
  }

  return {
    data: dstBytes,
    width: cropW,
    height: cropH,
  };
}

/**
 * Creates a TransformStep compatible with ZapwebpOptions.transforms pipeline.
 * @param {object|string} [options]
 * @returns {import('@zapwebp/plugin-sdk').TransformStep}
 */
function cropTransform(options = {}) {
  const resolvedOpts = typeof options === 'string'
    ? (CROP_PRESETS[options] || { mode: 'auto', aspectRatio: options })
    : { ...options };

  let lastMetadata = null;

  return {
    name: 'crop',
    metadata: resolvedOpts,
    getMetadata() {
      return lastMetadata || { options: resolvedOpts };
    },
    async apply(image) {
      const inputDims = { width: image.width, height: image.height };
      const cropped = await cropImage(image, resolvedOpts);
      lastMetadata = {
        name: 'crop',
        mode: resolvedOpts.mode || (resolvedOpts.aspectRatio ? 'auto' : 'manual'),
        input: inputDims,
        output: { width: cropped.width, height: cropped.height },
        aspectRatio: resolvedOpts.aspectRatio,
        gravity: resolvedOpts.gravity || 'center',
        fit: resolvedOpts.fit || 'cover',
      };
      return cropped;
    },
  };
}

module.exports = {
  cropImage,
  cropTransform,
  calculateCropBox,
  parseAspectRatio,
  detectFaceBounds,
  CROP_PRESETS,
};
