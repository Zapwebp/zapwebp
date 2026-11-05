/**
 * Zapwebp Web Worker
 * Performs client-side image conversion off the main UI thread.
 * Bounded concurrency, zero network access, memory-safe execution.
 * Enforces Size Modes (Auto, Limit strict, Target best-effort, Unlimited).
 */

async function encodeWorkerCanvas(canvas, mimeType, format, requestedQuality, isLossless, outputSizeMode, outputSizeLimitKb, compressionTarget) {
  if (isLossless || format === 'png') {
    const blob = await canvas.convertToBlob({ type: mimeType, quality: 1.0 });
    return { blob, qualityReduced: false, originalQuality: 100, finalQuality: 100 };
  }

  const baseQ = (requestedQuality || 85) / 100;
  const initialBlob = await canvas.convertToBlob({ type: mimeType, quality: baseQ });

  if (outputSizeMode !== 'custom' || !outputSizeLimitKb || outputSizeLimitKb <= 0) {
    return { blob: initialBlob, qualityReduced: false, originalQuality: requestedQuality, finalQuality: requestedQuality };
  }

  const targetBytes = outputSizeLimitKb * 1024;
  if (initialBlob.size <= targetBytes) {
    return { blob: initialBlob, qualityReduced: false, originalQuality: requestedQuality, finalQuality: requestedQuality, limitKb: outputSizeLimitKb };
  }

  // File exceeds targetBytes: apply compression loop
  if (compressionTarget === 'target') {
    let low = 10;
    let high = Math.min(95, requestedQuality);
    let bestBlob = initialBlob;
    let bestQ = requestedQuality;
    let minOverBlob = initialBlob;
    let minOverQ = requestedQuality;

    for (let iter = 0; iter < 5; iter++) {
      const mid = Math.round((low + high) / 2);
      const testBlob = await canvas.convertToBlob({ type: mimeType, quality: mid / 100 });
      if (testBlob.size <= targetBytes) {
        bestBlob = testBlob;
        bestQ = mid;
        low = mid + 1;
      } else {
        minOverBlob = testBlob;
        minOverQ = mid;
        high = mid - 1;
      }
    }

    const finalBlob = bestBlob.size <= targetBytes ? bestBlob : minOverBlob;
    const finalQ = bestBlob.size <= targetBytes ? bestQ : minOverQ;
    return {
      blob: finalBlob,
      qualityReduced: finalQ < requestedQuality,
      originalQuality: requestedQuality,
      finalQuality: finalQ,
      limitKb: outputSizeLimitKb
    };
  } else {
    // Limit mode (strict step down)
    const stepDownQualities = [75, 65, 55, 45, 35, 25, 15, 10].filter((q) => q < requestedQuality);
    let currentBlob = initialBlob;
    let currentQ = requestedQuality;

    for (const q of stepDownQualities) {
      const testBlob = await canvas.convertToBlob({ type: mimeType, quality: q / 100 });
      currentBlob = testBlob;
      currentQ = q;
      if (testBlob.size <= targetBytes) {
        break;
      }
    }

    return {
      blob: currentBlob,
      qualityReduced: currentQ < requestedQuality,
      originalQuality: requestedQuality,
      finalQuality: currentQ,
      limitKb: outputSizeLimitKb
    };
  }
}

self.onmessage = async (e) => {
  const { id, file, options } = e.data;

  try {
    const {
      format,
      quality = 85,
      clean = true,
      lossless = false,
      bgColor = '#ffffff',
      outputSizeMode = 'auto',
      outputSizeLimitKb = 500,
      compressionTarget = 'limit',
    } = options || {};

    const ext = (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    const isSvg = ext === '.svg';
    const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;

    // SVG Security Checks & Sanitization
    if (isSvg) {
      let svgText = await file.text();

      // Defensive vector ingestion: Reject unsafe active scripts or event handlers
      if (/<script[\s>]/i.test(svgText) || /on\w+\s*=/i.test(svgText) || /<foreignObject[\s>]/i.test(svgText) || /javascript:/i.test(svgText)) {
        throw new Error('E_UNSAFE_SVG: SVG contains active scripts or event handlers and was rejected for security.');
      }

      if (clean) {
        svgText = svgText
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
          .replace(/<title[\s\S]*?<\/title>/gi, '')
          .replace(/<desc[\s\S]*?<\/desc>/gi, '');
      }

      // Check dimensions
      const widthMatch = svgText.match(/\bwidth=["']?(\d+(?:\.\d+)?)(px)?["']?/i);
      const heightMatch = svgText.match(/\bheight=["']?(\d+(?:\.\d+)?)(px)?["']?/i);
      const viewBoxMatch = svgText.match(/\bviewBox=["']?([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)["']?/i);

      let parsedW = widthMatch ? parseFloat(widthMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[3]) : 512);
      let parsedH = heightMatch ? parseFloat(heightMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[4]) : 512);
      if (!parsedW || isNaN(parsedW) || parsedW <= 0) parsedW = 512;
      if (!parsedH || isNaN(parsedH) || parsedH <= 0) parsedH = 512;

      if (!svgText.includes('width=') || !svgText.includes('height=')) {
        svgText = svgText.replace(/<svg\b/i, `<svg width="${parsedW}" height="${parsedH}" `);
      }

      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });

      // If OffscreenCanvas and createImageBitmap can process SVG in worker
      if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function') {
        try {
          const imgBitmap = await createImageBitmap(svgBlob);
          const w = imgBitmap.width || parsedW;
          const h = imgBitmap.height || parsedH;

          const canvas = new OffscreenCanvas(w, h);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          ctx.clearRect(0, 0, w, h);
          if (format === 'jpeg') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(imgBitmap, 0, 0, w, h);
          imgBitmap.close();

          const encodeRes = await encodeWorkerCanvas(
            canvas,
            mimeType,
            format,
            quality,
            lossless,
            outputSizeMode,
            outputSizeLimitKb,
            compressionTarget
          );

          return self.postMessage({
            id,
            success: true,
            blob: encodeRes.blob,
            format,
            width: w,
            height: h,
            size: encodeRes.blob.size,
            qualityReduced: encodeRes.qualityReduced,
            originalQuality: encodeRes.originalQuality,
            finalQuality: encodeRes.finalQuality,
            limitKb: encodeRes.limitKb
          });
        } catch {
          // OffscreenCanvas may fail to rasterize SVG in some browsers: request main thread fallback
          return self.postMessage({ id, success: false, fallbackToMain: true });
        }
      } else {
        return self.postMessage({ id, success: false, fallbackToMain: true });
      }
    }

    // Raster Formats
    if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function') {
      try {
        const imgBitmap = await createImageBitmap(file);
        const w = imgBitmap.width;
        const h = imgBitmap.height;

        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        ctx.clearRect(0, 0, w, h);
        if (format === 'jpeg') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(imgBitmap, 0, 0, w, h);
        imgBitmap.close();

        const encodeRes = await encodeWorkerCanvas(
          canvas,
          mimeType,
          format,
          quality,
          lossless,
          outputSizeMode,
          outputSizeLimitKb,
          compressionTarget
        );

        return self.postMessage({
          id,
          success: true,
          blob: encodeRes.blob,
          format,
          width: w,
          height: h,
          size: encodeRes.blob.size,
          qualityReduced: encodeRes.qualityReduced,
          originalQuality: encodeRes.originalQuality,
          finalQuality: encodeRes.finalQuality,
          limitKb: encodeRes.limitKb
        });
      } catch {
        return self.postMessage({ id, success: false, fallbackToMain: true });
      }
    } else {
      return self.postMessage({ id, success: false, fallbackToMain: true });
    }
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err.message || 'Worker conversion failed'
    });
  }
};


