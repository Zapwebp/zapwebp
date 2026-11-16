'use strict';

const { ZapwebpError } = require('@zapwebp/shared');

/**
 * Smart Optimization Recommendation Mapping
 * Aligns strictly with the Zapwebp Three Missing Pillars Masterplan.
 */
const RECOMMENDATION_PROFILES = {
  photo: {
    format: 'avif',
    quality: 55,
    lossless: false,
    fallbackFormat: null,
    reason: 'Photos compress best with AVIF\'s lossy algorithm.',
  },
  photo_text: {
    format: 'webp',
    quality: 80,
    lossless: false,
    fallbackFormat: null,
    reason: 'WebP handles mixed photographic content with text better than AVIF.',
  },
  icon: {
    format: 'webp',
    quality: 100,
    lossless: true,
    fallbackFormat: null,
    reason: 'Icons need pixel-perfect fidelity with lossless WebP encoding.',
  },
  logo: {
    format: 'webp',
    quality: 90,
    lossless: false,
    fallbackFormat: 'png',
    reason: 'Small, sharp logos benefit from WebP at 90 with transparent PNG fallback.',
  },
  screenshot: {
    format: 'webp',
    quality: 85,
    lossless: false,
    fallbackFormat: null,
    reason: 'Good balance for UI screenshots preserving crisp text readability.',
  },
  diagram: {
    format: 'png',
    quality: 100,
    lossless: true,
    fallbackFormat: null,
    reason: 'Lossless PNG preserves sharp technical lines and diagram strokes.',
  },
  graphic_alpha: {
    format: 'avif',
    quality: 65,
    lossless: false,
    fallbackFormat: null,
    reason: 'AVIF handles alpha transparency better than WebP at low-to-medium quality.',
  },
  thumbnail: {
    format: 'webp',
    quality: 60,
    lossless: false,
    fallbackFormat: null,
    reason: 'Small dimensions allow aggressive WebP compression for thumbnails.',
  },
  hero: {
    format: 'avif',
    quality: 60,
    lossless: false,
    fallbackFormat: null,
    reason: 'High-quality hero banners achieve maximum compression with AVIF at 60.',
  },
  banner: {
    format: 'avif',
    quality: 70,
    lossless: false,
    fallbackFormat: null,
    reason: 'Large panoramic banners compress efficiently with AVIF at 70.',
  },
};

/**
 * Computes horizontal and vertical Sobel gradient energy for text and edge detection.
 * 
 * @param {Float32Array} luminance
 * @param {number} width
 * @param {number} height
 * @returns {{ edgeDensity: number, gradientSmoothness: number, textDetected: boolean }}
 */
function computeSobelSignals(luminance, width, height) {
  if (width < 3 || height < 3) {
    return { edgeDensity: 0, gradientSmoothness: 1, textDetected: false };
  }

  let totalSobel = 0;
  let horizEnergy = 0;
  let vertEnergy = 0;
  let edgePixelCount = 0;
  const innerPixels = (width - 2) * (height - 2);

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;

      // 3x3 Sobel Operator
      // Gx:
      // -1  0  1
      // -2  0  2
      // -1  0  1
      const gx =
        -luminance[idx - width - 1] + luminance[idx - width + 1] +
        -2 * luminance[idx - 1] + 2 * luminance[idx + 1] +
        -luminance[idx + width - 1] + luminance[idx + width + 1];

      // Gy:
      // -1 -2 -1
      //  0  0  0
      //  1  2  1
      const gy =
        -luminance[idx - width - 1] - 2 * luminance[idx - width] - luminance[idx - width + 1] +
        luminance[idx + width - 1] + 2 * luminance[idx + width] + luminance[idx + width + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      totalSobel += mag;
      horizEnergy += Math.abs(gx);
      vertEnergy += Math.abs(gy);

      if (mag > 0.25) {
        edgePixelCount++;
      }
    }
  }

  const edgeDensity = Number((edgePixelCount / innerPixels).toFixed(4));
  const avgSobel = totalSobel / innerPixels;
  // Smoothness: inverse of gradient energy scaled to [0, 1]
  const gradientSmoothness = Number(Math.max(0, Math.min(1, 1 - avgSobel * 2)).toFixed(4));

  // Text detection: high localized edge density with balanced horizontal and vertical stroke energy
  const hvRatio = horizEnergy > 0 && vertEnergy > 0 ? horizEnergy / vertEnergy : 0;
  const textDetected = edgeDensity > 0.08 && edgeDensity < 0.35 && hvRatio > 0.6 && hvRatio < 1.6;

  return { edgeDensity, gradientSmoothness, textDetected };
}

/**
 * Extracts deterministic pixel signals from raw RGBA buffer.
 * 
 * @param {Buffer|Uint8Array} rawData - 8-bit RGBA pixel stream
 * @param {number} width - Buffer width
 * @param {number} height - Buffer height
 * @param {object} [meta] - Inspected file metadata
 * @returns {object} Signals dictionary
 */
function extractSmartSignals(rawData, width, height, meta = {}) {
  const totalPixels = width * height;
  if (!totalPixels || !rawData || rawData.length < totalPixels * 4) {
    return {
      edgeDensity: 0,
      colorCount: 1,
      alphaCoverage: 0,
      gradientSmoothness: 1,
      textDetected: false,
      photoDetected: false,
      iconDetected: false,
      width: meta.width || width,
      height: meta.height || height,
    };
  }

  const lum = new Float32Array(totalPixels);
  let alphaCount = 0;
  const colorMap = new Map();

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = rawData[offset];
    const g = rawData[offset + 1];
    const b = rawData[offset + 2];
    const a = rawData[offset + 3];

    if (a < 255) {
      alphaCount++;
    }

    // Rec. 709 Luminance
    lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    // 15-bit color quantization bucket
    if (a >= 16) {
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
  }

  const alphaCoverage = Number((alphaCount / totalPixels).toFixed(4));
  const colorCount = colorMap.size;
  const { edgeDensity, gradientSmoothness, textDetected } = computeSobelSignals(lum, width, height);

  const origWidth = meta.width || width;
  const origHeight = meta.height || height;

  const iconDetected = (origWidth <= 256 && origHeight <= 256) && (colorCount <= 64 || meta.format === 'svg') && edgeDensity > 0.02;
  const photoDetected = colorCount > 400 && gradientSmoothness > 0.55 && alphaCoverage < 0.1;

  return {
    edgeDensity,
    colorCount,
    alphaCoverage,
    gradientSmoothness,
    textDetected,
    photoDetected,
    iconDetected,
    width: origWidth,
    height: origHeight,
    format: (meta.format || '').toLowerCase(),
  };
}

/**
 * Classifies an image into one of the 10 detected content types.
 * 
 * @param {object} signals - Computed signals from extractSmartSignals
 * @returns {string} Detected type key
 */
function classifyContentType(signals) {
  const {
    width,
    height,
    colorCount,
    alphaCoverage,
    edgeDensity,
    gradientSmoothness,
    textDetected,
    photoDetected,
    iconDetected,
    format,
  } = signals;

  const aspectRatio = width && height ? width / height : 1;

  // 1. Panoramic Banner: width >= 800 and aspect ratio >= 2.5:1
  if (width >= 800 && aspectRatio >= 2.5) {
    return 'banner';
  }

  // 2. High-res Hero image: width >= 1200, height >= 600, photo characteristics
  if (width >= 1200 && height >= 600 && colorCount > 300 && alphaCoverage < 0.05) {
    return 'hero';
  }

  // 3. Thumbnail: small dimensions with photo color density
  if (width <= 320 && height <= 320 && colorCount > 150 && !iconDetected && alphaCoverage < 0.1) {
    return 'thumbnail';
  }

  // 4. Icon: small dimensions, few colors, sharp edges, or SVG icons
  if (iconDetected || (width <= 256 && height <= 256 && (format === 'svg' || colorCount <= 64))) {
    return 'icon';
  }

  // 5. Logo: vector or moderate colors with alpha transparency
  if (format === 'svg' || (alphaCoverage > 0.05 && colorCount <= 128 && edgeDensity > 0.03)) {
    return 'logo';
  }

  // 6. Photo with Text: mixed photo with prominent text lines
  if (photoDetected && textDetected) {
    return 'photo_text';
  }

  // 7. Graphic with Alpha: illustration or composite with transparency
  if (alphaCoverage > 0.15) {
    return 'graphic_alpha';
  }

  // 8. Screenshot: UI elements, high edge density, limited color palette
  if (edgeDensity > 0.12 && colorCount <= 750 && !photoDetected) {
    return 'screenshot';
  }

  // 9. Diagram: line art, technical plots, low color count without alpha
  if (colorCount <= 200 && alphaCoverage < 0.05 && edgeDensity > 0.04) {
    return 'diagram';
  }

  // 10. Default: Photo
  return 'photo';
}

/**
 * Analyzes an image and generates smart optimization recommendations.
 * 
 * @param {Buffer} buffer - Image file bytes
 * @param {object} meta - Basic inspected format and dimensions
 * @param {Function} getSharp - Sharp instance provider
 * @returns {Promise<object>} Smart recommendation result
 */
async function analyzeSmart(buffer, meta, getSharp) {
  let signals;
  try {
    const sharp = getSharp();
    const thumbnail = await sharp(buffer, { failOn: 'none', limitInputPixels: 16777216 })
      .resize(128, 128, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    signals = extractSmartSignals(thumbnail.data, thumbnail.info.width, thumbnail.info.height, meta);
  } catch {
    signals = extractSmartSignals(null, 0, 0, meta);
  }

  const detectedType = classifyContentType(signals);
  const profile = RECOMMENDATION_PROFILES[detectedType] || RECOMMENDATION_PROFILES.photo;

  const alphaDesc = signals.alphaCoverage > 0.05
    ? `transparency ${(signals.alphaCoverage * 100).toFixed(0)}%`
    : 'opaque';

  const formatTargetDesc = profile.lossless
    ? `${profile.format.toUpperCase()} lossless`
    : `${profile.format.toUpperCase()} at ${profile.quality}`;

  const explanation = [
    `Detected: ${detectedType} (${signals.width}×${signals.height}, ${signals.colorCount} colors, ${alphaDesc})`,
    `Recommended: ${formatTargetDesc}`,
    `Reason: ${profile.reason}`,
  ].join('\n');

  return {
    detectedType,
    signals,
    recommendation: {
      format: profile.format,
      quality: profile.quality,
      lossless: profile.lossless,
      fallbackFormat: profile.fallbackFormat,
      reason: profile.reason,
      explanation,
    },
  };
}

module.exports = {
  RECOMMENDATION_PROFILES,
  extractSmartSignals,
  classifyContentType,
  analyzeSmart,
};
