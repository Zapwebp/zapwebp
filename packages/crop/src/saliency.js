'use strict';

/**
 * Smart-Subject detection via pure algorithmic saliency analysis (Attention & Entropy).
 * Zero model download, runs in < 10ms, memory-bounded.
 */

/**
 * Computes attention saliency score using edge density (Sobel gradient) and color contrast.
 * @param {Uint8ClampedArray} data - RGBA pixel buffer
 * @param {number} width - image width
 * @param {number} height - image height
 * @param {number} [gridSize=64] - sampling resolution
 * @returns {{ grid: Float32Array, gridW: number, gridH: number, meanX: number, meanY: number }}
 */
function computeAttentionMap(data, width, height, gridSize = 64) {
  const stepX = Math.max(1, Math.floor(width / gridSize));
  const stepY = Math.max(1, Math.floor(height / gridSize));
  const gridW = Math.max(1, Math.floor(width / stepX));
  const gridH = Math.max(1, Math.floor(height / stepY));
  const grid = new Float32Array(gridW * gridH);

  // Compute global mean color for contrast scoring
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sampleCount = 0;
  const skip = Math.max(1, Math.floor((width * height) / 1000));

  for (let i = 0; i < data.length; i += skip * 4) {
    if (data[i + 3] > 64) {
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      sampleCount++;
    }
  }

  const meanR = sampleCount > 0 ? sumR / sampleCount : 128;
  const meanG = sampleCount > 0 ? sumG / sampleCount : 128;
  const meanB = sampleCount > 0 ? sumB / sampleCount : 128;

  let totalWeight = 0;
  let weightedSumX = 0;
  let weightedSumY = 0;

  for (let gy = 0; gy < gridH; gy++) {
    const y = Math.min(height - 1, gy * stepY);
    for (let gx = 0; gx < gridW; gx++) {
      const x = Math.min(width - 1, gx * stepX);
      const idx = (y * width + x) * 4;

      const alpha = data[idx + 3];
      if (alpha <= 32) {
        grid[gy * gridW + gx] = 0;
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Neighbor luminance difference (Sobel-like gradient)
      const xPrev = Math.max(0, x - stepX);
      const xNext = Math.min(width - 1, x + stepX);
      const yPrev = Math.max(0, y - stepY);
      const yNext = Math.min(height - 1, y + stepY);

      const lumLeft = 0.299 * data[(y * width + xPrev) * 4] + 0.587 * data[(y * width + xPrev) * 4 + 1] + 0.114 * data[(y * width + xPrev) * 4 + 2];
      const lumRight = 0.299 * data[(y * width + xNext) * 4] + 0.587 * data[(y * width + xNext) * 4 + 1] + 0.114 * data[(y * width + xNext) * 4 + 2];
      const lumTop = 0.299 * data[(yPrev * width + x) * 4] + 0.587 * data[(yPrev * width + x) * 4 + 1] + 0.114 * data[(yPrev * width + x) * 4 + 2];
      const lumBottom = 0.299 * data[(yNext * width + x) * 4] + 0.587 * data[(yNext * width + x) * 4 + 1] + 0.114 * data[(yNext * width + x) * 4 + 2];

      const edgeGrad = Math.abs(lumRight - lumLeft) + Math.abs(lumBottom - lumTop);

      // Color distance from global mean
      const colorDist = Math.hypot(r - meanR, g - meanG, b - meanB);

      // Combined attention score
      const score = edgeGrad * 0.6 + colorDist * 0.4;
      grid[gy * gridW + gx] = score;

      totalWeight += score;
      weightedSumX += gx * score;
      weightedSumY += gy * score;
    }
  }

  const meanX = totalWeight > 0 ? weightedSumX / totalWeight : gridW / 2;
  const meanY = totalWeight > 0 ? weightedSumY / totalWeight : gridH / 2;

  return { grid, gridW, gridH, meanX, meanY };
}

/**
 * Computes local information entropy across image blocks.
 * @param {Uint8ClampedArray} data - RGBA pixel buffer
 * @param {number} width - image width
 * @param {number} height - image height
 * @param {number} [gridSize=64] - sampling resolution
 * @returns {{ grid: Float32Array, gridW: number, gridH: number, meanX: number, meanY: number }}
 */
function computeEntropyMap(data, width, height, gridSize = 64) {
  const stepX = Math.max(1, Math.floor(width / gridSize));
  const stepY = Math.max(1, Math.floor(height / gridSize));
  const gridW = Math.max(1, Math.floor(width / stepX));
  const gridH = Math.max(1, Math.floor(height / stepY));
  const grid = new Float32Array(gridW * gridH);

  const blockSize = Math.max(2, Math.floor(Math.min(stepX, stepY)));
  let totalWeight = 0;
  let weightedSumX = 0;
  let weightedSumY = 0;

  for (let gy = 0; gy < gridH; gy++) {
    const startY = Math.min(height - 1, gy * stepY);
    for (let gx = 0; gx < gridW; gx++) {
      const startX = Math.min(width - 1, gx * stepX);

      // 16-bin histogram of luminance in this local block
      const bins = new Uint16Array(16);
      let count = 0;

      for (let dy = 0; dy < blockSize && startY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && startX + dx < width; dx++) {
          const idx = ((startY + dy) * width + (startX + dx)) * 4;
          if (data[idx + 3] > 64) {
            const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
            const bin = Math.min(15, Math.floor(lum / 16));
            bins[bin]++;
            count++;
          }
        }
      }

      if (count === 0) {
        grid[gy * gridW + gx] = 0;
        continue;
      }

      // Shannon entropy calculation
      let entropy = 0;
      for (let b = 0; b < 16; b++) {
        if (bins[b] > 0) {
          const p = bins[b] / count;
          entropy -= p * Math.log2(p);
        }
      }

      grid[gy * gridW + gx] = entropy;
      totalWeight += entropy;
      weightedSumX += gx * entropy;
      weightedSumY += gy * entropy;
    }
  }

  const meanX = totalWeight > 0 ? weightedSumX / totalWeight : gridW / 2;
  const meanY = totalWeight > 0 ? weightedSumY / totalWeight : gridH / 2;

  return { grid, gridW, gridH, meanX, meanY };
}

/**
 * Builds a 2D integral image (Summed-Area Table) for O(1) rectangle query.
 * @param {Float32Array} grid
 * @param {number} gridW
 * @param {number} gridH
 * @returns {Float64Array}
 */
function buildIntegralImage(grid, gridW, gridH) {
  const sat = new Float64Array((gridW + 1) * (gridH + 1));
  const satW = gridW + 1;

  for (let y = 0; y < gridH; y++) {
    let rowSum = 0;
    for (let x = 0; x < gridW; x++) {
      rowSum += grid[y * gridW + x];
      sat[(y + 1) * satW + (x + 1)] = sat[y * satW + (x + 1)] + rowSum;
    }
  }

  return sat;
}

/**
 * Queries the sum of scores inside a rectangle in O(1) time using the SAT.
 * @param {Float64Array} sat
 * @param {number} satW
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
function queryIntegralRect(sat, satW, x, y, w, h) {
  const x1 = x;
  const y1 = y;
  const x2 = x + w;
  const y2 = y + h;

  const a = sat[y1 * satW + x1];
  const b = sat[y1 * satW + x2];
  const c = sat[y2 * satW + x1];
  const d = sat[y2 * satW + x2];

  return d - b - c + a;
}

/**
 * Detects the smart-subject bounds using attention or entropy saliency maps.
 * @param {import('@zapwebp/plugin-sdk').RawImage} image
 * @param {'attention' | 'entropy'} [strategy='attention']
 * @param {number} [targetAspectRatio=1]
 * @returns {Promise<{ bounds: { x: number, y: number, width: number, height: number }, strategy: string, confidence: number }>}
 */
async function detectSubject(image, strategy = 'attention', targetAspectRatio = 1) {
  const { data, width, height } = image;
  const strat = strategy === 'entropy' ? 'entropy' : 'attention';

  const { grid, gridW, gridH, meanX, meanY } = strat === 'entropy'
    ? computeEntropyMap(data, width, height, 64)
    : computeAttentionMap(data, width, height, 64);

  const sat = buildIntegralImage(grid, gridW, gridH);
  const satW = gridW + 1;
  const totalScore = sat[(gridH) * satW + (gridW)];

  // Scale of subject relative to grid
  // Scan multiple window sizes matching targetAspectRatio (or enclosing subject)
  let bestScore = -1;
  let bestWindow = { x: 0, y: 0, w: gridW, h: gridH };

  const scales = [0.25, 0.35, 0.5, 0.65, 0.8, 1.0];
  const step = Math.max(1, Math.floor(Math.min(gridW, gridH) / 16));

  for (const scale of scales) {
    let winW;
    let winH;

    if (targetAspectRatio >= 1) {
      winW = Math.max(2, Math.round(gridW * scale));
      winH = Math.max(2, Math.round(winW / targetAspectRatio));
    } else {
      winH = Math.max(2, Math.round(gridH * scale));
      winW = Math.max(2, Math.round(winH * targetAspectRatio));
    }

    if (winW > gridW || winH > gridH) continue;

    // Scan positions
    for (let gy = 0; gy <= gridH - winH; gy += step) {
      for (let gx = 0; gx <= gridW - winW; gx += step) {
        const rawScore = queryIntegralRect(sat, satW, gx, gy, winW, winH);
        const area = winW * winH;
        // Density with mild center prior
        const centerX = gx + winW / 2;
        const centerY = gy + winH / 2;
        const distFromMean = Math.hypot((centerX - meanX) / gridW, (centerY - meanY) / gridH);
        const centerBonus = 1 - Math.min(0.4, distFromMean * 0.4);

        const score = (rawScore / Math.sqrt(area)) * centerBonus;

        if (score > bestScore) {
          bestScore = score;
          bestWindow = { x: gx, y: gy, w: winW, h: winH };
        }
      }
    }
  }

  // Scale grid coordinates back to original image coordinates
  const scaleX = width / gridW;
  const scaleY = height / gridH;

  const cropX = Math.max(0, Math.min(width - 1, Math.round(bestWindow.x * scaleX)));
  const cropY = Math.max(0, Math.min(height - 1, Math.round(bestWindow.y * scaleY)));
  const cropW = Math.max(1, Math.min(width - cropX, Math.round(bestWindow.w * scaleX)));
  const cropH = Math.max(1, Math.min(height - cropY, Math.round(bestWindow.h * scaleY)));

  const confidence = totalScore > 0 ? Math.min(0.99, Math.max(0.3, bestScore / (totalScore / 10 + 1))) : 0.5;

  return {
    bounds: {
      x: cropX,
      y: cropY,
      width: cropW,
      height: cropH,
    },
    strategy: strat,
    confidence: Number(confidence.toFixed(2)),
  };
}

module.exports = {
  detectSubject,
  computeAttentionMap,
  computeEntropyMap,
};

