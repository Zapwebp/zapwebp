/**
 * Zapwebp Web Worker
 * Performs client-side image conversion off the main UI thread.
 * Bounded concurrency, zero network access, memory-safe execution.
 */

self.onmessage = async (e) => {
  const { id, file, options } = e.data;

  try {
    const { format, quality = 85, clean = true, lossless = false, bgColor = '#ffffff' } = options || {};
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

          let encodeQuality = quality / 100;
          if (lossless || format === 'png') encodeQuality = 1.0;

          const outBlob = await canvas.convertToBlob({ type: mimeType, quality: encodeQuality });
          return self.postMessage({
            id,
            success: true,
            blob: outBlob,
            format,
            width: w,
            height: h,
            size: outBlob.size
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

        let encodeQuality = quality / 100;
        if (lossless || format === 'png') encodeQuality = 1.0;

        const outBlob = await canvas.convertToBlob({ type: mimeType, quality: encodeQuality });
        return self.postMessage({
          id,
          success: true,
          blob: outBlob,
          format,
          width: w,
          height: h,
          size: outBlob.size
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
