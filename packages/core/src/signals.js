'use strict';

/**
 * Zapwebp Smart Layer: Content Signals, Suggestions, and Custom Metadata
 * 
 * Provides deterministic, dependency-free content signals and heuristics
 * to power developer-provided AI and vision model pipelines.
 * 
 * THE RULE: Zapwebp never imports an AI library. It never calls an AI API.
 * It provides structured signals and hooks; the developer brings the model.
 */

// IEEE 802.3 CRC32 Table for standard PNG chunk generation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

/**
 * Calculates 32-bit cyclic redundancy check.
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Analyzes raw RGBA pixel thumbnail to compute mathematical content signals.
 * 
 * @param {Buffer|Uint8Array} rawData - Raw 8-bit RGBA pixel buffer
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @param {object} [context] - Contextual format and metadata hints
 * @returns {{ content: object, palette: object }}
 */
function extractSignalsFromRgba(rawData, width, height, context = {}) {
  const totalPixels = width * height;
  if (!totalPixels || !rawData || rawData.length < totalPixels * 4) {
    return {
      content: {
        edgeDensity: 0,
        colorCount: 1,
        sharpness: 0,
        luminanceMean: 0.5,
        luminanceVariance: 0,
        transparencyCoverage: 0,
        estimatedType: 'photo',
        estimatedTypeConfidence: 0.5,
      },
      palette: {
        dominant: '#000000',
        colors: [{ hex: '#000000', percentage: 1 }],
      },
    };
  }

  const lum = new Float32Array(totalPixels);
  let alphaTransparentCount = 0;
  let sumL = 0;
  const colorMap = new Map();

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = rawData[offset];
    const g = rawData[offset + 1];
    const b = rawData[offset + 2];
    const a = rawData[offset + 3];

    if (a < 255) {
      alphaTransparentCount++;
    }

    // Standard Rec. 709 Luminance
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lum[i] = l;
    sumL += l;

    // Quantize RGB to 15-bit (5 bits per channel: 32x32x32 buckets)
    // Ignore fully transparent background pixels (alpha < 16)
    if (a >= 16) {
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
  }

  // 1. Transparency coverage
  const transparencyCoverage = Number((alphaTransparentCount / totalPixels).toFixed(4));

  // 2. Luminance Mean & Variance (Contrast)
  const meanL = sumL / totalPixels;
  let sumSqDiff = 0;
  for (let i = 0; i < totalPixels; i++) {
    const diff = lum[i] - meanL;
    sumSqDiff += diff * diff;
  }
  const varL = sumSqDiff / totalPixels;
  const luminanceMean = Number(meanL.toFixed(4));
  const luminanceVariance = Number(varL.toFixed(4));

  // 3. Laplacian Sharpness & Edge Density
  let edgeCount = 0;
  let lapSum = 0;
  let lapSumSq = 0;
  let innerPixels = 0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const center = row + x;
      const lap = lum[center - width] + lum[center + width] + lum[center - 1] + lum[center + 1] - 4 * lum[center];
      lapSum += lap;
      lapSumSq += lap * lap;
      innerPixels++;

      if (Math.abs(lap) > 0.08) {
        edgeCount++;
      }
    }
  }

  const lapMean = innerPixels > 0 ? lapSum / innerPixels : 0;
  const lapVar = innerPixels > 0 ? (lapSumSq / innerPixels) - (lapMean * lapMean) : 0;
  const sharpness = Number(Math.min(1, Math.max(0, Math.sqrt(Math.max(0, lapVar)) * 4)).toFixed(4));
  const edgeDensity = Number((innerPixels > 0 ? edgeCount / innerPixels : 0).toFixed(4));

  // 4. Color count & Palette
  const colorCount = colorMap.size;
  const sortedColors = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);
  const totalColoredPixels = Array.from(colorMap.values()).reduce((a, b) => a + b, 0);

  function binToHex(key) {
    const r5 = (key >> 10) & 0x1f;
    const g5 = (key >> 5) & 0x1f;
    const b5 = key & 0x1f;
    const r8 = Math.round((r5 * 255) / 31);
    const g8 = Math.round((g5 * 255) / 31);
    const b8 = Math.round((b5 * 255) / 31);
    return `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`;
  }

  const dominant = sortedColors.length > 0 ? binToHex(sortedColors[0][0]) : '#000000';
  const colors = sortedColors.slice(0, 6).map(([key, count]) => ({
    hex: binToHex(key),
    percentage: Number((count / (totalColoredPixels || 1)).toFixed(4)),
  }));

  // 5. Estimated Type Heuristics
  let estimatedType = 'photo';
  let estimatedTypeConfidence = 0.8;
  const format = String(context.format || '').toLowerCase();
  const rawString = context.rawString || '';
  const origWidth = context.width || width;
  const origHeight = context.height || height;

  if (format === 'svg') {
    if (rawString && /<(?:text|tspan)/i.test(rawString)) {
      estimatedType = 'text';
      estimatedTypeConfidence = 0.92;
    } else if (transparencyCoverage > 0.05) {
      estimatedType = (origWidth <= 256 && origHeight <= 256) ? 'icon' : 'logo';
      estimatedTypeConfidence = 0.9;
    } else {
      estimatedType = 'diagram';
      estimatedTypeConfidence = 0.85;
    }
  } else if (transparencyCoverage > 0.15 && colorCount <= 256) {
    estimatedType = (origWidth <= 256 && origHeight <= 256) ? 'icon' : 'logo';
    estimatedTypeConfidence = 0.88;
  } else if (colorCount < 80 && edgeDensity > 0.04 && luminanceVariance > 0.03) {
    estimatedType = 'text';
    estimatedTypeConfidence = 0.85;
  } else if (colorCount > 500 && luminanceVariance > 0.012 && transparencyCoverage < 0.05) {
    estimatedType = 'photo';
    estimatedTypeConfidence = 0.92;
  } else if (edgeDensity > 0.12 && colorCount <= 750) {
    estimatedType = 'screenshot';
    estimatedTypeConfidence = 0.8;
  } else if (colorCount <= 200) {
    estimatedType = 'diagram';
    estimatedTypeConfidence = 0.76;
  }

  return {
    content: {
      edgeDensity,
      colorCount,
      sharpness,
      luminanceMean,
      luminanceVariance,
      transparencyCoverage,
      estimatedType,
      estimatedTypeConfidence,
    },
    palette: {
      dominant,
      colors: colors.length ? colors : [{ hex: dominant, percentage: 1 }],
    },
  };
}

/**
 * Computes content signals and dominant color palette for any image input.
 * 
 * @param {Buffer} data
 * @param {object} meta - Basic inspected format and dimensions
 * @param {Function} getSharp
 * @returns {Promise<{ content: object, palette: object }>}
 */
async function computeContentSignals(data, meta, getSharp) {
  const format = (meta.format || '').toLowerCase();
  let rawString = '';
  if (format === 'svg') {
    rawString = data.toString('utf8');
  }

  try {
    const sharp = getSharp();
    const thumbnail = await sharp(data, { failOn: 'none', limitInputPixels: 16777216 })
      .resize(128, 128, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return extractSignalsFromRgba(thumbnail.data, thumbnail.info.width, thumbnail.info.height, {
      format,
      rawString,
      width: meta.width,
      height: meta.height,
    });
  } catch {
    // Graceful fallback for non-renderable or unusual vector inputs
    return extractSignalsFromRgba(null, 0, 0, { format, rawString, width: meta.width, height: meta.height });
  }
}

/**
 * Recommends target formats and quality profiles based on content signals and intended placement context.
 * 
 * @param {object} info - InspectResult with content signals
 * @param {'icon'|'photo'|'hero'|'thumbnail'|'logo'|'banner'|'general'} [useCase='general']
 * @returns {Array<{ to: string, quality: number, lossless: boolean, reason: string, expectedBytes: number, expectedSavings: number }>}
 */
function suggest(info, useCase = 'general') {
  const srcBytes = info.bytes || 100000;
  const content = info.content || {};
  const estType = content.estimatedType || (info.hasAlpha ? 'icon' : 'photo');
  const targetCase = useCase || 'general';

  const explicitPhoto = targetCase === 'photo' || targetCase === 'hero' || targetCase === 'banner';
  const explicitIcon = targetCase === 'icon' || targetCase === 'logo';

  const isVectorOrIcon = explicitIcon || (!explicitPhoto && (info.format === 'svg' || estType === 'icon' || estType === 'logo' || estType === 'diagram'));
  const isPhoto = explicitPhoto || (targetCase === 'general' && (estType === 'photo' || estType === 'screenshot'));

  if (isVectorOrIcon) {
    return [
      {
        to: 'webp',
        quality: 90,
        lossless: content.colorCount !== undefined ? content.colorCount < 128 : true,
        reason: 'Icon and logo assets benefit from crisp alpha edges and high transparency fidelity in WebP.',
        expectedBytes: Math.max(128, Math.round(srcBytes * 0.45)),
        expectedSavings: 0.55,
      },
      {
        to: 'avif',
        quality: 80,
        lossless: false,
        reason: 'Modern AVIF format provides extreme transparency compression for modern web browsers.',
        expectedBytes: Math.max(128, Math.round(srcBytes * 0.38)),
        expectedSavings: 0.62,
      },
      {
        to: 'png',
        quality: 100,
        lossless: true,
        reason: 'Lossless fallback for legacy rendering engines requiring pixel-perfect transparency.',
        expectedBytes: Math.max(256, Math.round(srcBytes * 0.85)),
        expectedSavings: 0.15,
      },
    ];
  }

  if (isPhoto) {
    const qAvif = targetCase === 'thumbnail' ? 65 : (targetCase === 'hero' ? 82 : 75);
    const qWebp = targetCase === 'thumbnail' ? 75 : (targetCase === 'hero' ? 85 : 80);

    const suggestions = [
      {
        to: 'avif',
        quality: qAvif,
        lossless: false,
        reason: 'Photographic content achieves maximum compression with modern AVIF chroma subsampling.',
        expectedBytes: Math.max(512, Math.round(srcBytes * 0.35)),
        expectedSavings: 0.65,
      },
      {
        to: 'webp',
        quality: qWebp,
        lossless: false,
        reason: 'Universally supported web format delivering high visual fidelity with ~30% smaller size than JPEG.',
        expectedBytes: Math.max(512, Math.round(srcBytes * 0.5)),
        expectedSavings: 0.5,
      },
    ];

    if (!info.hasAlpha) {
      suggestions.push({
        to: 'jpeg',
        quality: targetCase === 'hero' ? 85 : 80,
        lossless: false,
        reason: 'Universal legacy fallback for systems without WebP or AVIF support.',
        expectedBytes: Math.max(512, Math.round(srcBytes * 0.72)),
        expectedSavings: 0.28,
      });
    }

    return suggestions;
  }

  // General fallback
  if (info.hasAlpha) {
    return [
      {
        to: 'webp',
        quality: 85,
        lossless: false,
        reason: 'Image has transparency; WebP guarantees lossless or near-lossless alpha preservation.',
        expectedBytes: Math.max(256, Math.round(srcBytes * 0.48)),
        expectedSavings: 0.52,
      },
      {
        to: 'avif',
        quality: 75,
        lossless: false,
        reason: 'AVIF delivers high-efficiency lossy compression with alpha channel preservation.',
        expectedBytes: Math.max(256, Math.round(srcBytes * 0.4)),
        expectedSavings: 0.6,
      },
    ];
  }

  return [
    {
      to: 'avif',
      quality: 70,
      lossless: false,
      reason: 'Opaque image; AVIF produces the smallest payload for modern web delivery.',
      expectedBytes: Math.max(512, Math.round(srcBytes * 0.38)),
      expectedSavings: 0.62,
    },
    {
      to: 'webp',
      quality: 80,
      lossless: false,
      reason: 'Fast, high-fidelity universal delivery across all browsers and devices.',
      expectedBytes: Math.max(512, Math.round(srcBytes * 0.52)),
      expectedSavings: 0.48,
    },
  ];
}

/**
 * Attaches developer-defined custom metadata to an output image buffer.
 * 
 * @param {Buffer} buffer
 * @param {string} format
 * @param {Record<string, string|number|boolean>} customMetadata
 * @returns {Buffer}
 */
function attachCustomMetadata(buffer, format, customMetadata) {
  if (!customMetadata || typeof customMetadata !== 'object' || !buffer || !buffer.length) {
    return buffer;
  }

  const fmt = (format || '').toLowerCase();
  const jsonString = JSON.stringify(customMetadata);

  // 1. SVG: Inject into <metadata id="zapwebp-custom">
  if (fmt === 'svg') {
    const str = buffer.toString('utf8');
    const tag = `<metadata id="zapwebp-custom"><script type="application/json">${jsonString}</script></metadata>`;
    const closingTagIndex = str.lastIndexOf('</svg>');
    if (closingTagIndex !== -1) {
      const updated = str.slice(0, closingTagIndex) + tag + str.slice(closingTagIndex);
      return Buffer.from(updated, 'utf8');
    }
    return Buffer.concat([buffer, Buffer.from(tag, 'utf8')]);
  }

  // 2. PNG: Inject standardized tEXt chunk before IEND
  if (fmt === 'png' && buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    const keyword = 'zapwebp:custom';
    const textData = Buffer.concat([
      Buffer.from(keyword + '\0', 'latin1'),
      Buffer.from(jsonString, 'utf8'),
    ]);

    const chunkLen = Buffer.alloc(4);
    chunkLen.writeUInt32BE(textData.length, 0);

    const chunkType = Buffer.from('tEXt', 'ascii');
    const crcData = Buffer.concat([chunkType, textData]);
    const chunkCrc = Buffer.alloc(4);
    chunkCrc.writeUInt32BE(crc32(crcData), 0);

    const tExtChunk = Buffer.concat([chunkLen, chunkType, textData, chunkCrc]);

    // Locate IEND (last 12 bytes: 00 00 00 00 49 45 4E 44 AE 42 60 82)
    const iendOffset = buffer.lastIndexOf(Buffer.from('IEND', 'ascii'));
    if (iendOffset >= 4) {
      const beforeIend = buffer.subarray(0, iendOffset - 4);
      const iendAndAfter = buffer.subarray(iendOffset - 4);
      return Buffer.concat([beforeIend, tExtChunk, iendAndAfter]);
    }
  }

  // 3. JPEG: Inject COM marker right after SOI (0xFFD8)
  if (fmt === 'jpeg' || fmt === 'jpg') {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      const payload = Buffer.from(`zapwebp:custom:${jsonString}`, 'utf8');
      if (payload.length <= 65530) {
        const markerLen = payload.length + 2;
        const comMarker = Buffer.alloc(4 + payload.length);
        comMarker[0] = 0xff;
        comMarker[1] = 0xfe; // COM
        comMarker.writeUInt16BE(markerLen, 2);
        payload.copy(comMarker, 4);

        return Buffer.concat([buffer.subarray(0, 2), comMarker, buffer.subarray(2)]);
      }
    }
  }

  // 4. WebP: Append standard ZAPM RIFF chunk
  if (fmt === 'webp' && buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    const payload = Buffer.from(jsonString, 'utf8');
    const chunkLen = payload.length;
    const pad = chunkLen % 2;
    const chunk = Buffer.alloc(8 + chunkLen + pad);
    chunk.write('ZAPM', 0, 4, 'ascii');
    chunk.writeUInt32LE(chunkLen, 4);
    payload.copy(chunk, 8);

    const out = Buffer.concat([buffer, chunk]);
    out.writeUInt32LE(out.length - 8, 4); // Update RIFF payload size
    return out;
  }

  return buffer;
}

/**
 * Extracts developer custom metadata if present in the container.
 * 
 * @param {Buffer} buffer
 * @param {string} format
 * @returns {Record<string, any>|null}
 */
function extractCustomMetadata(buffer, format) {
  if (!buffer || !buffer.length) return null;
  const fmt = (format || '').toLowerCase();

  try {
    // 1. SVG
    if (fmt === 'svg') {
      const str = buffer.toString('utf8');
      const match = str.match(/<metadata id="zapwebp-custom">\s*<script type="application\/json">([\s\S]*?)<\/script>\s*<\/metadata>/i);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    }

    // 2. PNG
    if (fmt === 'png' && buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      let offset = 8;
      while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
        if (type === 'tEXt' || type === 'iTXt') {
          const chunkData = buffer.subarray(offset + 8, Math.min(offset + 8 + length, buffer.length));
          const nullIdx = chunkData.indexOf(0x00);
          if (nullIdx !== -1) {
            const keyword = chunkData.subarray(0, nullIdx).toString('latin1');
            if (keyword === 'zapwebp:custom') {
              const text = chunkData.subarray(nullIdx + 1).toString('utf8');
              return JSON.parse(text);
            }
          }
        }
        offset += 12 + length;
      }
    }

    // 3. JPEG
    if ((fmt === 'jpeg' || fmt === 'jpg') && buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 <= buffer.length) {
        if (buffer[offset] !== 0xff) { offset++; continue; }
        const marker = buffer[offset + 1];
        if (marker === 0xda || marker === 0xd9) break;
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
        const length = buffer.readUInt16BE(offset + 2);
        if (marker === 0xfe) { // COM
          const comment = buffer.subarray(offset + 4, Math.min(offset + 2 + length, buffer.length)).toString('utf8');
          if (comment.startsWith('zapwebp:custom:')) {
            return JSON.parse(comment.slice('zapwebp:custom:'.length));
          }
        }
        offset += 2 + length;
      }
    }

    // 4. WebP
    if (fmt === 'webp' && buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF') {
      let offset = 12;
      while (offset + 8 <= buffer.length) {
        const fourcc = buffer.subarray(offset, offset + 4).toString('ascii');
        const size = buffer.readUInt32LE(offset + 4);
        if (fourcc === 'ZAPM') {
          const jsonText = buffer.subarray(offset + 8, offset + 8 + size).toString('utf8');
          return JSON.parse(jsonText);
        }
        offset += 8 + size + (size % 2);
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Evaluates the quality integrity of the source asset.
 * 
 * @param {string} format
 * @param {Buffer} data
 * @param {object} [content]
 * @returns {{ estimated: 'high'|'medium'|'low', reason: string }}
 */
function evaluateSourceQuality(format, data, content) {
  const fmt = String(format || '').toLowerCase();
  if (fmt === 'svg') {
    return {
      estimated: 'high',
      reason: 'Vector (SVG) input is mathematically pristine with zero prior rasterization loss.',
    };
  }
  if (fmt === 'jpeg' || fmt === 'jpg') {
    return {
      estimated: 'low',
      reason: 'Input is JPEG (already lossy). Lossless preserves existing compression artifacts.',
    };
  }
  if (fmt === 'png' || fmt === 'tiff') {
    if (content && content.sharpness < 0.15 && content.edgeDensity > 0.12) {
      return {
        estimated: 'medium',
        reason: 'PNG input shows potential compression noise or blurring.',
      };
    }
    return {
      estimated: 'high',
      reason: 'PNG input with no prior lossy compression detected.',
    };
  }
  if (fmt === 'webp' || fmt === 'avif') {
    return {
      estimated: 'medium',
      reason: `${fmt.toUpperCase()} input may have undergone previous lossy compression.`,
    };
  }
  return {
    estimated: 'medium',
    reason: 'Source format quality is indeterminate.',
  };
}

/**
 * Calculates byte size impact comparing lossless actual vs estimated lossy equivalent.
 * 
 * @param {number} outputBytes
 * @param {number} sourceBytes
 * @param {string} inputFormat
 * @param {string} targetFormat
 * @param {boolean} isLossless
 * @returns {{ lossyEstimate: number, losslessActual: number, ratio: number, note: string }}
 */
function evaluateSizeImpact(outputBytes, sourceBytes, inputFormat, targetFormat, isLossless) {
  const fmt = String(inputFormat || '').toLowerCase();
  const isJpeg = fmt === 'jpeg' || fmt === 'jpg';

  if (!isLossless) {
    return {
      lossyEstimate: outputBytes,
      losslessActual: Math.round(outputBytes * 2.5),
      ratio: 1.0,
      note: 'Lossy compression applied. Output is optimized for minimal byte size.',
    };
  }

  let lossyEstimate;
  if (isJpeg) {
    lossyEstimate = Math.max(512, Math.round(sourceBytes * 0.7));
  } else if (fmt === 'svg') {
    lossyEstimate = Math.max(256, Math.round(outputBytes * 0.4));
  } else {
    lossyEstimate = Math.max(512, Math.round(outputBytes * 0.35));
  }

  const ratio = Number((outputBytes / Math.max(1, lossyEstimate)).toFixed(1));
  let note;
  if (isJpeg) {
    note = `Lossless is not recommended for JPEG sources. Output is ${ratio}× larger than a lossy equivalent. Switch to lossy.`;
  } else if (ratio > 2.0) {
    note = `Lossless output is ${ratio}× larger than a lossy equivalent. Use lossy if quality permits.`;
  } else {
    note = 'Lossless output preserves full pixel fidelity with reasonable compression ratio.';
  }

  return {
    lossyEstimate,
    losslessActual: outputBytes,
    ratio,
    note,
  };
}

/**
 * Verifies that decoded output pixels match input pixels identically in lossless mode.
 * 
 * @param {Buffer} inputData - Source image bytes or raw transformed RGBA buffer
 * @param {Buffer} outputData - Encoded output buffer
 * @param {string} inputFormat - Source format
 * @param {string} outputFormat - Target format
 * @param {Function} getSharp - Sharp loader
 * @returns {Promise<boolean>}
 */
async function verifyLosslessPixels(inputData, outputData, inputFormat, outputFormat, getSharp) {
  try {
    const sharp = getSharp();
    const r1 = await sharp(inputData, { failOn: 'error' }).ensureAlpha().raw().toBuffer();
    const r2 = await sharp(outputData, { failOn: 'error' }).ensureAlpha().raw().toBuffer();

    if (r1.length !== r2.length) return false;
    if (r1.equals(r2)) return true;

    // Tolerance for zeroed RGB on fully transparent pixels (alpha = 0)
    for (let i = 0; i < r1.length; i += 4) {
      const a1 = r1[i + 3];
      const a2 = r2[i + 3];
      if (a1 === 0 && a2 === 0) continue;
      if (r1[i] !== r2[i] || r1[i + 1] !== r2[i + 1] || r1[i + 2] !== r2[i + 2] || a1 !== a2) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  crc32,
  extractSignalsFromRgba,
  computeContentSignals,
  suggest,
  attachCustomMetadata,
  extractCustomMetadata,
  evaluateSourceQuality,
  evaluateSizeImpact,
  verifyLosslessPixels,
};
