'use strict';

/**
 * Zapwebp Web Application Controller
 * High-performance, zero-tracking, transparency-safe image conversion engine.
 */

const SUPPORTED_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tif', '.tiff']);

// DOM References
const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const idleGlyph = document.querySelector('#idle-glyph');
const convertingState = document.querySelector('#converting-state');
const currentThumbnail = document.querySelector('#current-thumbnail');
const resultsContainer = document.querySelector('#results');
const qualitySlider = document.querySelector('#quality');
const qualityDisplay = document.querySelector('#quality-display');
const cleanToggle = document.querySelector('#clean-toggle');
const losslessToggle = document.querySelector('#lossless-toggle');
const formatPills = document.querySelectorAll('.fmt-select-btn');
const scaleButtons = document.querySelectorAll('.scale-btn');
const themeToggleBtn = document.querySelector('#theme-toggle-btn');

// Background color picker for JPEG flattening
const bgItem = document.getElementById('bar-bg-item');
const bgPicker = document.getElementById('bg-color-picker');
const bgHexLabel = document.getElementById('bg-hex-label');

// Error Dialog
const errorDialog = document.querySelector('#error-dialog');
const errorDetail = document.querySelector('#error-detail');
const errorClose = document.querySelector('#error-close');

// Preview Dialog
const previewDialog = document.querySelector('#preview-dialog');
const previewTitle = document.querySelector('#preview-title');
const previewFormatBadge = document.querySelector('#preview-format-badge');
const previewScaleBadge = document.querySelector('#preview-scale-badge');
const previewAlphaBadge = document.querySelector('#preview-alpha-badge');
const previewCleanBadge = document.querySelector('#preview-clean-badge');
const previewStage = document.querySelector('#preview-stage');
const previewDimVal = document.querySelector('#preview-dim-val');
const previewSizeVal = document.querySelector('#preview-size-val');
const previewSavingsWrap = document.querySelector('#preview-savings-wrap');
const previewSavingsVal = document.querySelector('#preview-savings-val');
const previewDownloadBtn = document.querySelector('#preview-download-btn');
const previewCloseBtn = document.querySelector('#preview-close-btn');
const viewTabConverted = document.querySelector('#view-tab-converted');
const viewTabOriginal = document.querySelector('#view-tab-original');
const viewTabSplit = document.querySelector('#view-tab-split');

// Global State
const convertedItems = new Map(); // id -> item object
let isConverting = false;
let currentPreviewItem = null;
let activePreviewTab = 'converted'; // 'converted' | 'original' | 'split'
let qualityDebounceTimer = null;

// Settings & Defaults
function getTargetFromRoute() {
  const p = window.location.pathname.toLowerCase();
  if (p.endsWith('-to-avif')) return 'avif';
  if (p.endsWith('-to-png')) return 'png';
  if (p.endsWith('-to-jpeg') || p.endsWith('-to-jpg')) return 'jpeg';
  return 'webp';
}

const settings = {
  format: 'webp',
  scales: [1],
  quality: 85,
  clean: true,
  lossless: false,
  background: '#ffffff',
};

// ==========================================================================
// 1. Theme Management (Dark / Light with Local Persistence)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('zapwebp_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('zapwebp_theme', next);
    });
  }
}
initTheme();

// ==========================================================================
// 2. Settings Persistence (localStorage)
// ==========================================================================
function loadSettings() {
  const routeFmt = getTargetFromRoute();
  const savedFmt = localStorage.getItem('zapwebp_format');
  if (savedFmt && ['webp', 'avif', 'png', 'jpeg'].includes(savedFmt)) {
    settings.format = savedFmt;
  } else if (routeFmt) {
    settings.format = routeFmt;
  }

  const savedQuality = localStorage.getItem('zapwebp_quality');
  if (savedQuality) {
    const q = parseInt(savedQuality, 10);
    if (!isNaN(q) && q >= 1 && q <= 100) settings.quality = q;
  }

  const savedLossless = localStorage.getItem('zapwebp_lossless');
  if (savedLossless !== null) {
    settings.lossless = savedLossless === 'true';
  }

  const savedClean = localStorage.getItem('zapwebp_clean');
  if (savedClean !== null) {
    settings.clean = savedClean === 'true';
  }

  const savedScales = localStorage.getItem('zapwebp_scales');
  if (savedScales) {
    try {
      const parsed = JSON.parse(savedScales);
      if (Array.isArray(parsed) && parsed.length) {
        settings.scales = parsed.filter((s) => [1, 2, 3].includes(s));
        if (!settings.scales.length) settings.scales = [1];
      }
    } catch {}
  }

  const savedBg = localStorage.getItem('zapwebp_background');
  if (savedBg && /^#[0-9a-fA-F]{6}$/.test(savedBg)) {
    settings.background = savedBg;
  }
}

function persistSettings() {
  try {
    localStorage.setItem('zapwebp_format', settings.format);
    localStorage.setItem('zapwebp_quality', String(settings.quality));
    localStorage.setItem('zapwebp_lossless', String(settings.lossless));
    localStorage.setItem('zapwebp_clean', String(settings.clean));
    localStorage.setItem('zapwebp_scales', JSON.stringify(settings.scales));
    if (bgPicker?.value) {
      settings.background = bgPicker.value;
      localStorage.setItem('zapwebp_background', bgPicker.value);
    }
  } catch {}
}

loadSettings();

// Apply Target Lock configuration (hides format picker when locked)
function applyTargetLockConfig() {
  const cfg = window.ZAPWEBP_CONFIG || {};
  const lockTarget = cfg.webApp?.lockTarget || cfg.output?.lock || cfg.ingest?.target || cfg.lockTarget;
  if (lockTarget) {
    settings.format = lockTarget;
    const pills = document.querySelector('#format-pills');
    if (pills && pills.parentElement && pills.parentElement.classList.contains('bar-control-item')) {
      pills.parentElement.hidden = true;
      pills.parentElement.style.display = 'none';
    } else if (pills) {
      pills.hidden = true;
      pills.style.display = 'none';
    }
  }
}
applyTargetLockConfig();
if (!window.ZAPWEBP_CONFIG && typeof fetch === 'function') {
  fetch('/zapwebp.json')
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (data) {
        window.ZAPWEBP_CONFIG = data;
        applyTargetLockConfig();
      }
    })
    .catch(() => {});
}

// UI Initialization from Settings
function syncUiWithSettings() {
  // Format pills
  formatPills.forEach((btn) => {
    const isMatch = btn.dataset.format === settings.format;
    btn.classList.toggle('is-active', isMatch);
    btn.setAttribute('aria-checked', String(isMatch));
  });

  // Scale buttons
  scaleButtons.forEach((btn) => {
    const scale = Number(btn.dataset.scale);
    const isMatch = settings.scales.includes(scale);
    btn.classList.toggle('is-active', isMatch);
    btn.setAttribute('aria-pressed', String(isMatch));
  });

  // Quality slider
  if (qualitySlider) {
    qualitySlider.value = settings.quality;
    if (qualityDisplay) qualityDisplay.textContent = `${settings.quality}%`;
  }

  // Lossless toggle
  if (losslessToggle) {
    losslessToggle.checked = settings.lossless;
  }

  // Clean toggle
  if (cleanToggle) {
    cleanToggle.checked = settings.clean;
  }

  // Background picker
  if (bgPicker && settings.background) {
    bgPicker.value = settings.background;
    if (bgHexLabel) bgHexLabel.textContent = settings.background.toUpperCase();
  }

  updateQualitySliderState();
  updateBackgroundPickerVisibility();
}

function updateQualitySliderState() {
  const isLossless = settings.lossless || settings.format === 'png';
  const sliderItem = qualitySlider?.closest('.bar-slider-item');
  if (sliderItem) {
    sliderItem.classList.toggle('is-disabled', isLossless);
  }
  if (qualitySlider) {
    qualitySlider.disabled = isLossless;
  }
  if (qualityDisplay) {
    if (settings.format === 'png') {
      qualityDisplay.textContent = 'Lossless';
    } else if (settings.lossless) {
      qualityDisplay.textContent = '100% (Lossless)';
    } else {
      qualityDisplay.textContent = `${settings.quality}%`;
    }
  }
}

function updateBackgroundPickerVisibility() {
  if (bgItem) {
    bgItem.hidden = (settings.format !== 'jpeg');
  }
}

syncUiWithSettings();

// ==========================================================================
// 3. Reactive Controls: Immediate Re-conversion on Settings Changes
// ==========================================================================
if (formatPills.length) {
  formatPills.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newFmt = btn.dataset.format;
      if (settings.format === newFmt) return;
      settings.format = newFmt;
      persistSettings();
      syncUiWithSettings();
      reconvertAllItems();
    });
  });
}

scaleButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const scale = Number(btn.dataset.scale);
    const set = new Set(settings.scales);
    if (set.has(scale)) {
      if (set.size > 1) {
        set.delete(scale);
      }
    } else {
      set.add(scale);
    }
    settings.scales = Array.from(set).sort((a, b) => a - b);
    persistSettings();
    syncUiWithSettings();
    reconvertAllItems();
  });
});

if (qualitySlider) {
  qualitySlider.addEventListener('input', () => {
    settings.quality = Number(qualitySlider.value);
    if (qualityDisplay) qualityDisplay.textContent = `${settings.quality}%`;
    persistSettings();
    clearTimeout(qualityDebounceTimer);
    qualityDebounceTimer = setTimeout(() => {
      reconvertAllItems();
    }, 200);
  });
}

if (losslessToggle) {
  losslessToggle.addEventListener('change', () => {
    settings.lossless = losslessToggle.checked;
    persistSettings();
    updateQualitySliderState();
    reconvertAllItems();
  });
}

if (cleanToggle) {
  cleanToggle.addEventListener('change', () => {
    settings.clean = cleanToggle.checked;
    persistSettings();
    reconvertAllItems();
  });
}

if (bgPicker && bgHexLabel) {
  bgPicker.addEventListener('input', () => {
    bgHexLabel.textContent = bgPicker.value.toUpperCase();
    settings.background = bgPicker.value;
    persistSettings();
    if (settings.format === 'jpeg') {
      clearTimeout(qualityDebounceTimer);
      qualityDebounceTimer = setTimeout(() => {
        reconvertAllItems();
      }, 200);
    }
  });
}

function formatKb(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileExtension(filename) {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

function generateSrcsetHtml(baseName, scales, toFormat) {
  const ext = toFormat === 'jpeg' ? 'jpg' : toFormat;
  const primary = `${baseName}.${ext}`;
  const sorted = Array.from(scales).sort((a, b) => a - b);
  const srcsetString = sorted
    .map((s) => `${baseName}${s === 1 ? '' : `@${s}x`}.${ext} ${s}x`)
    .join(', ');
  return `<img src="${primary}" srcset="${srcsetString}" alt="">`;
}

// ==========================================================================
// 4. Dual-Layer Conversion Engine (In-Browser Canvas + API Fallback)
// ==========================================================================
async function convertImageFile(file, toFormat, quality, scales, isClean, isLossless, bgColor, cropOptions = null) {
  try {
    return await convertInBrowser(file, toFormat, quality, scales, isClean, isLossless, bgColor, cropOptions);
  } catch (err) {
    // If browser canvas cannot decode/encode (e.g. TIFF or browser lacking AVIF canvas export), fallback seamlessly to server
    try {
      return await convertViaApi(file, toFormat, quality, scales, isClean, isLossless, bgColor);
    } catch (apiErr) {
      throw new Error(err.message || apiErr.message || 'Conversion failed');
    }
  }
}

/**
 * Client-Side in-browser canvas converter
 */
async function convertInBrowser(file, toFormat, quality, scales = [1], isClean = true, isLossless = false, bgColor = '#ffffff', cropOptions = null) {
  const ext = getFileExtension(file.name);
  const mimeType = toFormat === 'jpeg' ? 'image/jpeg' : `image/${toFormat}`;

  let img;
  const isSvg = ext === '.svg';
  let baseWidth = 512;
  let baseHeight = 512;

  if (isSvg) {
    let svgText = await file.text();

    if (isClean) {
      svgText = svgText
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
        .replace(/<title[\s\S]*?<\/title>/gi, '')
        .replace(/<desc[\s\S]*?<\/desc>/gi, '');
    }

    if (/<script[\s>]/i.test(svgText) || /on\w+\s*=/i.test(svgText) || /<foreignObject[\s>]/i.test(svgText)) {
      throw new Error('SVG contains active content (scripts or event handlers) and was rejected.');
    }

    // Normalizing SVG intrinsic sizing so vectors render with high fidelity
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

    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to render SVG vector geometry.'));
      };
      image.src = blobUrl;
    });
    baseWidth = img.naturalWidth || parsedW;
    baseHeight = img.naturalHeight || parsedH;
  } else {
    // Raster formats (PNG, WebP, JPEG, AVIF, GIF)
    img = await createImageBitmap(file).catch(async () => {
      const blobUrl = URL.createObjectURL(file);
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Unsupported raster format in browser canvas.'));
        };
        image.src = blobUrl;
      });
    });
    baseWidth = img.width || img.naturalWidth || 512;
    baseHeight = img.height || img.naturalHeight || 512;
  }

  // Handle Crop Rectangles (auto or manual)
  const crop = cropOptions || file.cropOptions;
  let srcX = 0;
  let srcY = 0;
  let srcW = baseWidth;
  let srcH = baseHeight;

  if (crop && crop.width > 0 && crop.height > 0) {
    srcX = Math.max(0, Math.min(crop.x, baseWidth - 1));
    srcY = Math.max(0, Math.min(crop.y, baseHeight - 1));
    srcW = Math.max(1, Math.min(crop.width, baseWidth - srcX));
    srcH = Math.max(1, Math.min(crop.height, baseHeight - srcY));
  }

  const outputs = [];
  const sortedScales = Array.from(scales).sort((a, b) => a - b);
  const baseName = file.name.replace(/\.[^.]+$/, '');

  let encodeQuality = quality / 100;
  if (isLossless || toFormat === 'png') {
    encodeQuality = 1.0;
  }

  for (const scale of sortedScales) {
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, width, height);

    if (toFormat === 'jpeg') {
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

    let alphaPreserved = false;
    if (toFormat !== 'jpeg') {
      const sampleW = Math.min(width, 32);
      const sampleH = Math.min(height, 32);
      const sample = ctx.getImageData(0, 0, sampleW, sampleH);
      for (let i = 3; i < sample.data.length; i += 4) {
        if (sample.data[i] < 255) {
          alphaPreserved = true;
          break;
        }
      }
    }

    const scaleSuffix = scale === 1 ? '' : `@${scale}x`;
    const outExt = toFormat === 'jpeg' ? 'jpg' : toFormat;
    const outName = `${baseName}${scaleSuffix}.${outExt}`;

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b && (b.type === mimeType || b.size > 0)) resolve(b);
        else reject(new Error(`Browser canvas cannot encode to ${toFormat}`));
      }, mimeType, encodeQuality);
    });

    const url = URL.createObjectURL(blob);

    outputs.push({
      name: outName,
      scale,
      width,
      height,
      size: blob.size,
      originalSize: file.size,
      blob,
      url,
      alphaPreserved,
      format: toFormat,
      baseName,
      relativePath: file.relativePath ? file.relativePath.replace(/\.[^.]+$/, `${scaleSuffix}.${outExt}`) : outName,
    });
  }

  return outputs;
}

/**
 * Server API fallback converter (Sharp/libvips)
 */
async function convertViaApi(file, toFormat, quality, scales = [1], isClean = true, isLossless = false, bgColor = '#ffffff') {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('to', toFormat);
  formData.append('quality', String(quality));
  formData.append('lossless', String(isLossless));
  formData.append('clean', String(isClean));
  if (bgColor) formData.append('background', bgColor);

  const res = await fetch('/api/convert', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Conversion failed with status ${res.status}`);
  }

  const json = await res.json();
  const result = json.results?.[0];
  if (!result || result.error) {
    throw new Error(result?.error || 'Conversion failed');
  }

  const byteChars = atob(result.data);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const mimeType = toFormat === 'jpeg' ? 'image/jpeg' : `image/${toFormat}`;
  const blob = new Blob([byteNumbers], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outExt = toFormat === 'jpeg' ? 'jpg' : toFormat;

  const outputs = [];
  const sortedScales = Array.from(scales).sort((a, b) => a - b);
  for (const s of sortedScales) {
    const scaleSuffix = s === 1 ? '' : `@${s}x`;
    const outName = `${baseName}${scaleSuffix}.${outExt}`;
    outputs.push({
      name: outName,
      scale: s,
      width: Math.round((result.width || 512) * s),
      height: Math.round((result.height || 512) * s),
      size: blob.size,
      originalSize: file.size,
      blob,
      url,
      alphaPreserved: Boolean(result.alphaPreserved),
      format: toFormat,
      baseName,
      relativePath: file.relativePath ? file.relativePath.replace(/\.[^.]+$/, `${scaleSuffix}.${outExt}`) : outName,
    });
  }
  return outputs;
}

// ==========================================================================
// 5. Reactive In-Place Re-conversion (No Re-upload Needed)
// ==========================================================================
async function reconvertAllItems() {
  if (!convertedItems.size) return;

  const target = settings.format;
  const quality = settings.quality;
  const scales = settings.scales;
  const clean = settings.clean;
  const lossless = settings.lossless;
  const bgColor = bgPicker ? bgPicker.value : '#ffffff';

  for (const [id, item] of convertedItems) {
    if (!item.file) continue;
    try {
      const oldOutputs = item.outputs || [];
      const outputs = await convertImageFile(
        item.file,
        target,
        quality,
        scales,
        clean,
        lossless,
        bgColor,
        item.cropOptions || item.file?.cropOptions
      );

      // Revoke old URLs only after new conversion succeeded safely
      for (const old of oldOutputs) {
        if (old.url) URL.revokeObjectURL(old.url);
      }

      item.outputs = outputs;
      item.status = 'done';
      item.error = null;
    } catch (err) {
      item.status = 'error';
      item.error = err.message || 'Conversion failed';
    }
  }

  renderResultsView();

  if (currentPreviewItem && convertedItems.has(currentPreviewItem.id)) {
    const updated = convertedItems.get(currentPreviewItem.id);
    currentPreviewItem = updated;
    updatePreviewModalDetails(updated);
  }
}

// ==========================================================================
// 6. Download All ZIP Bundle
// ==========================================================================
async function downloadBatchZip() {
  if (!window.fflate?.zip) {
    throw new Error('ZIP generator not available');
  }

  const allOutputs = [];
  for (const item of convertedItems.values()) {
    if (item.outputs?.length) {
      allOutputs.push(...item.outputs);
    }
  }

  if (!allOutputs.length) return;

  const zipEntries = {};
  let totalBytes = 0;

  for (const item of allOutputs) {
    if (item.blob) {
      const buffer = new Uint8Array(await item.blob.arrayBuffer());
      zipEntries[item.relativePath || item.name] = buffer;
      totalBytes += buffer.length;
    }
  }

  const manifest = {
    generatedBy: 'Zapwebp 2.2.0',
    generatedAt: new Date().toISOString(),
    engine: 'client-side-browser-wasm',
    settings: {
      targetFormat: settings.format,
      quality: settings.quality,
      lossless: settings.lossless,
      cleanMode: settings.clean,
      scales: settings.scales,
    },
    totals: {
      items: convertedItems.size,
      outputFiles: allOutputs.length,
      outputBytes: totalBytes,
    },
    assets: allOutputs.map((item) => ({
      name: item.name,
      scale: item.scale,
      width: item.width,
      height: item.height,
      bytes: item.size,
      alphaPreserved: item.alphaPreserved,
    })),
  };

  zipEntries['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

  const zipData = await new Promise((resolve, reject) => {
    window.fflate.zip(zipEntries, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const zipBlob = new Blob([zipData], { type: 'application/zip' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zapwebp-batch-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================================================
// 7. Results View Rendering with Non-Destructive Appends & Clear All
// ==========================================================================
function renderResultsView() {
  if (!resultsContainer) return;

  if (convertedItems.size === 0) {
    resultsContainer.hidden = true;
    resultsContainer.replaceChildren();
    if (convertingState) convertingState.hidden = true;
    if (idleGlyph) idleGlyph.hidden = false;
    return;
  }

  if (idleGlyph) idleGlyph.hidden = true;
  if (convertingState) convertingState.hidden = true;
  resultsContainer.hidden = false;
  resultsContainer.replaceChildren();

  const itemsList = Array.from(convertedItems.values());
  const doneItems = itemsList.filter((item) => item.status === 'done');

  // Toolbar
  const header = document.createElement('div');
  header.className = 'results-header';

  let totalOutputBytes = 0;
  for (const item of doneItems) {
    for (const out of (item.outputs || [])) {
      totalOutputBytes += out.size || 0;
    }
  }

  const summaryWrap = document.createElement('div');
  summaryWrap.className = 'results-summary-text';
  summaryWrap.innerHTML = `
    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>
    <span><strong>${doneItems.length}</strong> file${doneItems.length === 1 ? '' : 's'} converted (${formatKb(totalOutputBytes)}) · 100% in-browser</span>
  `;

  const actionsGroup = document.createElement('div');
  actionsGroup.className = 'results-actions-group';

  // Add More Button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-header-action btn-add-more';
  addBtn.innerHTML = `
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <line x1="10" y1="4" x2="10" y2="16"></line>
      <line x1="4" y1="10" x2="16" y2="10"></line>
    </svg>
    <span>Add More</span>
  `;
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  actionsGroup.appendChild(addBtn);

  // Download All (.ZIP) button
  const totalOutputsCount = doneItems.reduce((acc, it) => acc + (it.outputs?.length || 0), 0);
  if (totalOutputsCount > 1 && window.fflate?.zip) {
    const zipBtn = document.createElement('button');
    zipBtn.type = 'button';
    zipBtn.className = 'btn-header-action btn-download-all';
    zipBtn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
        <path d="M4 4h12v12H4zM4 9h12M9 4v12"/>
      </svg>
      <span>Download All (.ZIP)</span>
    `;
    zipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await downloadBatchZip();
      } catch (err) {
        showError(err.message);
      }
    });
    actionsGroup.appendChild(zipBtn);
  }

  // Delete All Files (Clear All) Button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn-header-action btn-clear-all';
  clearBtn.innerHTML = `
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <path d="M3 6h14M8 6V4h4v2m-7 4v6m6-6v6M5 6l1 11h8l1-11"/>
    </svg>
    <span>Delete All Files</span>
  `;
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAllItems();
  });
  actionsGroup.appendChild(clearBtn);

  header.append(summaryWrap, actionsGroup);
  resultsContainer.appendChild(header);

  // Result Cards
  for (const item of itemsList) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.dataset.itemId = item.id;

    if (item.status === 'converting') {
      card.innerHTML = `
        <div class="converting-skeleton">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-text">Converting...</div>
        </div>
      `;
      resultsContainer.appendChild(card);
      continue;
    }

    if (item.status === 'error') {
      card.classList.add('is-error');
      card.innerHTML = `
        <button type="button" class="result-card-remove" title="Remove item" aria-label="Remove item">✕</button>
        <div class="error-badge-icon">!</div>
        <span class="result-name" title="${item.name}">${item.name}</span>
        <span class="result-meta" style="color:var(--error);">${item.error || 'Failed'}</span>
      `;
      card.querySelector('.result-card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(item.id);
      });
      resultsContainer.appendChild(card);
      continue;
    }

    const primaryOut = item.outputs?.[0];
    if (!primaryOut) continue;

    // Remove single item button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'result-card-remove';
    removeBtn.title = 'Remove file';
    removeBtn.setAttribute('aria-label', `Remove ${item.name}`);
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });
    card.appendChild(removeBtn);

    // Alpha Indicator Dot
    if (primaryOut.alphaPreserved) {
      const alphaDot = document.createElement('span');
      alphaDot.className = 'result-alpha-dot';
      alphaDot.title = 'Alpha transparency preserved bit-for-bit';
      card.appendChild(alphaDot);
    }

    // Thumbnail Preview Box (Clicking opens interactive preview)
    const thumbBox = document.createElement('div');
    thumbBox.className = 'result-thumb-box';
    thumbBox.title = 'Click to open interactive preview';
    thumbBox.innerHTML = `
      <img class="result-thumb" src="${primaryOut.url}" alt="${primaryOut.name}" loading="lazy" />
      <span class="result-thumb-hover-hint">Preview</span>
    `;
    thumbBox.addEventListener('click', (e) => {
      e.stopPropagation();
      openPreviewModal(item);
    });
    card.appendChild(thumbBox);

    // Title Row
    const titleRow = document.createElement('div');
    titleRow.className = 'result-title-row';
    const nameEl = document.createElement('span');
    nameEl.className = 'result-name';
    nameEl.title = primaryOut.name;
    nameEl.textContent = primaryOut.name;
    titleRow.appendChild(nameEl);
    card.appendChild(titleRow);

    // Meta Row (Dimensions, output size, and reduction savings)
    const metaRow = document.createElement('div');
    metaRow.className = 'result-meta-row';

    const dimText = document.createElement('span');
    dimText.textContent = `${primaryOut.width}×${primaryOut.height}`;

    const sizeText = document.createElement('span');
    sizeText.textContent = formatKb(primaryOut.size);

    metaRow.append(dimText, document.createTextNode('·'), sizeText);

    if (item.originalSize && primaryOut.size < item.originalSize) {
      const pct = Math.round(((item.originalSize - primaryOut.size) / item.originalSize) * 100);
      if (pct > 0) {
        const savingsPill = document.createElement('span');
        savingsPill.className = 'result-savings-pill';
        savingsPill.textContent = `-${pct}%`;
        metaRow.appendChild(savingsPill);
      }
    }
    card.appendChild(metaRow);

    // Multi-scale chips if multiple scales are active
    if (item.outputs.length > 1) {
      const scalesWrap = document.createElement('div');
      scalesWrap.className = 'result-scales-chips';
      for (const out of item.outputs) {
        const chip = document.createElement('a');
        chip.className = 'result-scale-chip';
        chip.href = out.url;
        chip.download = out.name;
        chip.textContent = `@${out.scale}x (${formatKb(out.size)})`;
        chip.title = `Download @${out.scale}x (${out.width}×${out.height})`;
        scalesWrap.appendChild(chip);
      }
      card.appendChild(scalesWrap);
    }

    // Actions Row (Preview + Download)
    const actionsRow = document.createElement('div');
    actionsRow.className = 'result-actions-row';

    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'result-preview-btn';
    previewBtn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
        <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7z"/>
        <circle cx="10" cy="10" r="3"/>
      </svg>
      <span>Preview</span>
    `;
    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPreviewModal(item);
    });

    const downloadBtn = document.createElement('a');
    downloadBtn.className = 'result-download-btn';
    downloadBtn.href = primaryOut.url;
    downloadBtn.download = primaryOut.name;
    downloadBtn.setAttribute('aria-label', `Download ${primaryOut.name}`);
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 4v10M5 9l5 5 5-5M4 16h12"/>
      </svg>
      <span>Download</span>
    `;

    const cropBtn = document.createElement('button');
    cropBtn.type = 'button';
    cropBtn.className = 'result-card-crop-btn';
    cropBtn.title = 'Crop this image';
    cropBtn.setAttribute('aria-label', `Crop ${primaryOut.name}`);
    cropBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14"></path>
        <path d="M18 22V8a2 2 0 0 0-2-2H2"></path>
      </svg>
      <span>Crop</span>
    `;
    cropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCropModal(item);
    });

    actionsRow.append(previewBtn, cropBtn, downloadBtn);
    card.appendChild(actionsRow);

    resultsContainer.appendChild(card);
  }

  // "+ Add More" Drop Card at the end of the results grid
  const addCard = document.createElement('div');
  addCard.className = 'add-more-card';
  addCard.setAttribute('tabindex', '0');
  addCard.setAttribute('role', 'button');
  addCard.setAttribute('aria-label', 'Add more images to this batch');
  addCard.innerHTML = `
    <div class="add-more-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
    <span class="add-more-text">Add More Images</span>
    <span class="add-more-subtext">Drop files here or click</span>
  `;
  addCard.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  addCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  resultsContainer.appendChild(addCard);
}

function removeItem(id) {
  if (convertedItems.has(id)) {
    const it = convertedItems.get(id);
    if (it.outputs) {
      for (const out of it.outputs) {
        if (out.url) URL.revokeObjectURL(out.url);
      }
    }
    if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
    convertedItems.delete(id);
    renderResultsView();
  }
}

function clearAllItems() {
  for (const it of convertedItems.values()) {
    if (it.outputs) {
      for (const out of it.outputs) {
        if (out.url) URL.revokeObjectURL(out.url);
      }
    }
    if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
  }
  convertedItems.clear();
  renderResultsView();
}

// ==========================================================================
// 8. Interactive Preview Modal Controller
// ==========================================================================
function openPreviewModal(item) {
  if (!previewDialog || !item) return;
  currentPreviewItem = item;
  activePreviewTab = 'converted';

  [viewTabConverted, viewTabOriginal, viewTabSplit].forEach((tab) => {
    if (!tab) return;
    const isAct = tab === viewTabConverted;
    tab.classList.toggle('is-active', isAct);
    tab.setAttribute('aria-selected', String(isAct));
  });

  updatePreviewModalDetails(item);

  if (typeof previewDialog.showModal === 'function') {
    previewDialog.showModal();
  } else {
    previewDialog.setAttribute('open', '');
  }
}

function updatePreviewModalDetails(item) {
  if (!item || !previewDialog) return;
  const primaryOut = item.outputs?.[0];
  if (!primaryOut) return;

  if (previewTitle) previewTitle.textContent = primaryOut.name;
  if (previewFormatBadge) previewFormatBadge.textContent = primaryOut.format.toUpperCase();
  if (previewScaleBadge) previewScaleBadge.textContent = `@${primaryOut.scale}x`;

  if (previewAlphaBadge) {
    previewAlphaBadge.textContent = primaryOut.alphaPreserved ? 'Alpha Preserved' : 'Opaque';
    previewAlphaBadge.classList.toggle('preview-badge-alpha', primaryOut.alphaPreserved);
  }

  if (previewCleanBadge) {
    previewCleanBadge.hidden = !settings.clean;
  }

  if (previewDimVal) previewDimVal.textContent = `${primaryOut.width} × ${primaryOut.height} px`;
  if (previewSizeVal) {
    previewSizeVal.textContent = `${formatKb(item.originalSize)} → ${formatKb(primaryOut.size)}`;
  }

  if (previewSavingsWrap && previewSavingsVal) {
    if (item.originalSize && primaryOut.size < item.originalSize) {
      const pct = Math.round(((item.originalSize - primaryOut.size) / item.originalSize) * 100);
      previewSavingsVal.textContent = `-${pct}%`;
      previewSavingsWrap.hidden = false;
    } else {
      previewSavingsWrap.hidden = true;
    }
  }

  if (previewDownloadBtn) {
    previewDownloadBtn.href = primaryOut.url;
    previewDownloadBtn.download = primaryOut.name;
  }

  renderPreviewStage();
}

function renderPreviewStage() {
  if (!previewStage || !currentPreviewItem) return;
  const item = currentPreviewItem;
  const primaryOut = item.outputs?.[0];
  if (!primaryOut) return;

  previewStage.replaceChildren();

  if (activePreviewTab === 'converted') {
    const wrap = document.createElement('div');
    wrap.className = 'preview-stage-single';
    wrap.innerHTML = `<img src="${primaryOut.url}" alt="${primaryOut.name}" />`;
    previewStage.appendChild(wrap);
  } else if (activePreviewTab === 'original') {
    const wrap = document.createElement('div');
    wrap.className = 'preview-stage-single';
    wrap.innerHTML = `<img src="${item.originalUrl}" alt="${item.name}" />`;
    previewStage.appendChild(wrap);
  } else if (activePreviewTab === 'split') {
    const splitWrap = document.createElement('div');
    splitWrap.className = 'preview-stage-split';
    splitWrap.innerHTML = `
      <div class="split-pane">
        <span class="split-pane-label">Original (${formatKb(item.originalSize)})</span>
        <img src="${item.originalUrl}" alt="Original: ${item.name}" />
      </div>
      <div class="split-pane">
        <span class="split-pane-label">Converted (${formatKb(primaryOut.size)})</span>
        <img src="${primaryOut.url}" alt="Converted: ${primaryOut.name}" />
      </div>
    `;
    previewStage.appendChild(splitWrap);
  }
}

// Preview Modal Tab Triggers
[
  { btn: viewTabConverted, mode: 'converted' },
  { btn: viewTabOriginal, mode: 'original' },
  { btn: viewTabSplit, mode: 'split' },
].forEach(({ btn, mode }) => {
  if (!btn) return;
  btn.addEventListener('click', () => {
    activePreviewTab = mode;
    [viewTabConverted, viewTabOriginal, viewTabSplit].forEach((b) => {
      if (!b) return;
      const match = b === btn;
      b.classList.toggle('is-active', match);
      b.setAttribute('aria-selected', String(match));
    });
    renderPreviewStage();
  });
});

if (previewCloseBtn && previewDialog) {
  previewCloseBtn.addEventListener('click', () => previewDialog.close());
  previewDialog.addEventListener('click', (e) => {
    if (e.target === previewDialog) previewDialog.close();
  });
}

function showError(msg) {
  if (errorDetail && errorDialog) {
    errorDetail.textContent = msg;
    errorDialog.showModal();
  } else {
    alert(msg);
  }
}

if (errorClose && errorDialog) {
  errorClose.addEventListener('click', () => errorDialog.close());
  errorDialog.addEventListener('click', (e) => {
    if (e.target === errorDialog) errorDialog.close();
  });
}

// ==========================================================================
// 9. Non-Destructive File Ingestion (Appends to Queue)
// ==========================================================================
async function handleFiles(files) {
  if (!files?.length) return;

  const validFiles = files.filter((f) => SUPPORTED_EXTENSIONS.has(getFileExtension(f.name)));
  if (!validFiles.length) {
    showError('None of the selected files match supported image formats (SVG, PNG, WebP, AVIF, JPEG, GIF, TIFF).');
    return;
  }

  // If first time, hide idle glyph and show skeleton in results
  if (convertedItems.size === 0) {
    if (idleGlyph) idleGlyph.hidden = true;
    if (convertingState) convertingState.hidden = true;
  }

  const target = settings.format;
  const quality = settings.quality;
  const scales = settings.scales;
  const clean = settings.clean;
  const lossless = settings.lossless;
  const bgColor = bgPicker ? bgPicker.value : '#ffffff';

  // 1. Add converting placeholders to Map
  const newItems = [];
  for (const f of validFiles) {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const originalUrl = URL.createObjectURL(f);

    const item = {
      id,
      file: f,
      name: f.name,
      originalSize: f.size,
      originalUrl,
      status: 'converting',
      error: null,
      outputs: [],
    };

    convertedItems.set(id, item);
    newItems.push(item);
  }

  // Render view immediately with converting skeletons
  renderResultsView();

  // 2. Convert each newly added file
  for (const item of newItems) {
    try {
      const outputs = await convertImageFile(
        item.file,
        target,
        quality,
        scales,
        clean,
        lossless,
        bgColor,
        item.cropOptions || item.file?.cropOptions
      );
      item.outputs = outputs;
      item.status = 'done';
    } catch (err) {
      item.status = 'error';
      item.error = err.message || 'Conversion failed';
    }
    // Update view as each file completes
    renderResultsView();
  }
}

// ==========================================================================
// 10. Drag & Drop and File Picker Handlers
// ==========================================================================
if (dropzone) {
  dropzone.addEventListener('click', (e) => {
    if (isConverting || (resultsContainer && !resultsContainer.hidden && e.target.closest('#results'))) return;
    fileInput.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isConverting) {
      e.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'dragend'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragging');
    const files = await collectFilesFromDataTransfer(e.dataTransfer);
    if (files?.length) handleFiles(files);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFiles(Array.from(fileInput.files));
    }
    fileInput.value = '';
  });
}

// Window Drag & Drop (Drop anywhere to add without wiping)
window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', async (e) => {
  if (e.target.closest('#dropzone')) return;
  e.preventDefault();
  const files = await collectFilesFromDataTransfer(e.dataTransfer);
  if (files?.length) handleFiles(files);
});

async function collectFilesFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return [];
  const files = [];
  const items = Array.from(dataTransfer.items || []);

  async function walkEntry(entry, pathPrefix = '') {
    if (entry.isFile) {
      const file = await new Promise((resolve) => entry.file(resolve));
      if (SUPPORTED_EXTENSIONS.has(getFileExtension(file.name))) {
        file.relativePath = pathPrefix + file.name;
        files.push(file);
      }
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve) => {
        reader.readEntries(resolve, () => resolve([]));
      });
      for (const child of entries) {
        await walkEntry(child, `${pathPrefix}${entry.name}/`);
      }
    }
  }

  for (const item of items) {
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      await walkEntry(entry);
    } else if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file && SUPPORTED_EXTENSIONS.has(getFileExtension(file.name))) {
        files.push(file);
      }
    }
  }

  if (files.length) return files;

  if (dataTransfer.files?.length) {
    return Array.from(dataTransfer.files).filter((f) => SUPPORTED_EXTENSIONS.has(getFileExtension(f.name)));
  }

  return [];
}

// ==========================================================================
// 11. Interactive Cropper Modal Controller (Crop Then Convert)
// ==========================================================================
const cropDialog = document.querySelector('#crop-dialog');
const cropCloseBtn = document.querySelector('#crop-close-btn');
const cropSourceImg = document.querySelector('#crop-source-img');
const cropSelectionBox = document.querySelector('#crop-selection-box');
const cropCoordsText = document.querySelector('#crop-coords-text');
const cropResetBtn = document.querySelector('#crop-reset-btn');
const cropApplyBtn = document.querySelector('#crop-apply-btn');
const previewCropBtn = document.querySelector('#preview-crop-btn');
const aspectBtns = Array.from(document.querySelectorAll('.aspect-btn'));

let activeCropItem = null;
let activeAspect = 'free'; // 'free' | '1:1' | '16:9' | '4:5' | '3:2' | '9:16'
let cropBox = { x: 0, y: 0, width: 100, height: 100 };
let imgNaturalW = 100;
let imgNaturalH = 100;
let imgDispW = 100;
let imgDispH = 100;

function getNumericAspect(aspect) {
  if (aspect === '1:1') return 1;
  if (aspect === '16:9') return 16 / 9;
  if (aspect === '4:5') return 4 / 5;
  if (aspect === '3:2') return 3 / 2;
  if (aspect === '9:16') return 9 / 16;
  return null;
}

function updateCropBoxDOM() {
  if (!cropSelectionBox) return;
  cropSelectionBox.style.left = `${cropBox.x}px`;
  cropSelectionBox.style.top = `${cropBox.y}px`;
  cropSelectionBox.style.width = `${cropBox.width}px`;
  cropSelectionBox.style.height = `${cropBox.height}px`;

  const scaleX = imgNaturalW / (imgDispW || 1);
  const scaleY = imgNaturalH / (imgDispH || 1);
  const natX = Math.round(cropBox.x * scaleX);
  const natY = Math.round(cropBox.y * scaleY);
  const natW = Math.round(cropBox.width * scaleX);
  const natH = Math.round(cropBox.height * scaleY);

  if (cropCoordsText) {
    cropCoordsText.textContent = `Crop: ${natW} × ${natH} at (${natX}, ${natY}) px`;
  }
}

function applyAspectToBox(aspect) {
  activeAspect = aspect;
  aspectBtns.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.aspect === aspect);
  });

  const numAspect = getNumericAspect(aspect);
  if (!numAspect) return;

  let targetW, targetH;
  const currentRatio = imgDispW / imgDispH;
  if (currentRatio > numAspect) {
    targetH = Math.round(imgDispH * 0.85);
    targetW = Math.round(targetH * numAspect);
  } else {
    targetW = Math.round(imgDispW * 0.85);
    targetH = Math.round(targetW / numAspect);
  }

  targetW = Math.max(20, Math.min(targetW, imgDispW));
  targetH = Math.max(20, Math.min(targetH, imgDispH));

  cropBox = {
    x: Math.round((imgDispW - targetW) / 2),
    y: Math.round((imgDispH - targetH) / 2),
    width: targetW,
    height: targetH,
  };
  updateCropBoxDOM();
}

function openCropModal(item) {
  if (!cropDialog || !item || !cropSourceImg) return;
  activeCropItem = item;

  cropSourceImg.onload = () => {
    imgNaturalW = cropSourceImg.naturalWidth || 512;
    imgNaturalH = cropSourceImg.naturalHeight || 512;
    imgDispW = cropSourceImg.clientWidth || 300;
    imgDispH = cropSourceImg.clientHeight || 300;

    if (item.cropOptions) {
      const scaleX = imgDispW / imgNaturalW;
      const scaleY = imgDispH / imgNaturalH;
      cropBox = {
        x: Math.round(item.cropOptions.x * scaleX),
        y: Math.round(item.cropOptions.y * scaleY),
        width: Math.round(item.cropOptions.width * scaleX),
        height: Math.round(item.cropOptions.height * scaleY),
      };
      if (item.cropOptions.aspect) {
        activeAspect = item.cropOptions.aspect;
      }
    } else {
      cropBox = {
        x: Math.round(imgDispW * 0.1),
        y: Math.round(imgDispH * 0.1),
        width: Math.round(imgDispW * 0.8),
        height: Math.round(imgDispH * 0.8),
      };
      activeAspect = 'free';
    }

    aspectBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.aspect === activeAspect);
    });

    updateCropBoxDOM();
  };

  cropSourceImg.src = item.originalUrl || item.outputs?.[0]?.url;

  if (typeof cropDialog.showModal === 'function') {
    cropDialog.showModal();
  } else {
    cropDialog.setAttribute('open', '');
  }
}

function closeCropModal() {
  if (!cropDialog) return;
  if (typeof cropDialog.close === 'function') {
    cropDialog.close();
  } else {
    cropDialog.removeAttribute('open');
  }
  activeCropItem = null;
}

// Drag & Resize Handlers
let isDraggingBox = false;
let isResizingHandle = null;
let startDragX = 0;
let startDragY = 0;
let initialBox = null;

if (cropSelectionBox) {
  cropSelectionBox.addEventListener('pointerdown', (e) => {
    const handleEl = e.target.closest('.crop-handle');
    if (handleEl) {
      isResizingHandle = handleEl.dataset.handle;
      isDraggingBox = false;
    } else {
      isDraggingBox = true;
      isResizingHandle = null;
    }
    startDragX = e.clientX;
    startDragY = e.clientY;
    initialBox = { ...cropBox };
    cropSelectionBox.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  cropSelectionBox.addEventListener('pointermove', (e) => {
    if (!isDraggingBox && !isResizingHandle) return;
    const dx = e.clientX - startDragX;
    const dy = e.clientY - startDragY;

    if (isDraggingBox) {
      let newX = initialBox.x + dx;
      let newY = initialBox.y + dy;
      newX = Math.max(0, Math.min(newX, imgDispW - initialBox.width));
      newY = Math.max(0, Math.min(newY, imgDispH - initialBox.height));
      cropBox.x = newX;
      cropBox.y = newY;
    } else if (isResizingHandle) {
      const numAspect = getNumericAspect(activeAspect);
      let newX = initialBox.x;
      let newY = initialBox.y;
      let newW = initialBox.width;
      let newH = initialBox.height;

      if (isResizingHandle === 'se') {
        newW = Math.max(20, Math.min(initialBox.width + dx, imgDispW - initialBox.x));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height + dy, imgDispH - initialBox.y));
      } else if (isResizingHandle === 'nw') {
        newW = Math.max(20, Math.min(initialBox.width - dx, initialBox.x + initialBox.width));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height - dy, initialBox.y + initialBox.height));
        newX = initialBox.x + (initialBox.width - newW);
        newY = initialBox.y + (initialBox.height - newH);
      } else if (isResizingHandle === 'ne') {
        newW = Math.max(20, Math.min(initialBox.width + dx, imgDispW - initialBox.x));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height - dy, initialBox.y + initialBox.height));
        newY = initialBox.y + (initialBox.height - newH);
      } else if (isResizingHandle === 'sw') {
        newW = Math.max(20, Math.min(initialBox.width - dx, initialBox.x + initialBox.width));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height + dy, imgDispH - initialBox.y));
        newX = initialBox.x + (initialBox.width - newW);
      }

      if (newX >= 0 && newY >= 0 && newX + newW <= imgDispW && newY + newH <= imgDispH) {
        cropBox = { x: newX, y: newY, width: newW, height: newH };
      }
    }
    updateCropBoxDOM();
  });

  const stopDrag = (e) => {
    if (isDraggingBox || isResizingHandle) {
      isDraggingBox = false;
      isResizingHandle = null;
      try { cropSelectionBox.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  cropSelectionBox.addEventListener('pointerup', stopDrag);
  cropSelectionBox.addEventListener('pointercancel', stopDrag);

  cropSelectionBox.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    let handled = false;
    if (e.key === 'ArrowLeft') {
      cropBox.x = Math.max(0, cropBox.x - step);
      handled = true;
    } else if (e.key === 'ArrowRight') {
      cropBox.x = Math.min(imgDispW - cropBox.width, cropBox.x + step);
      handled = true;
    } else if (e.key === 'ArrowUp') {
      cropBox.y = Math.max(0, cropBox.y - step);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      cropBox.y = Math.min(imgDispH - cropBox.height, cropBox.y + step);
      handled = true;
    }
    if (handled) {
      e.preventDefault();
      updateCropBoxDOM();
    }
  });
}

aspectBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    applyAspectToBox(btn.dataset.aspect);
  });
});

if (cropCloseBtn) cropCloseBtn.addEventListener('click', closeCropModal);

if (cropResetBtn) {
  cropResetBtn.addEventListener('click', () => {
    cropBox = { x: 0, y: 0, width: imgDispW, height: imgDispH };
    activeAspect = 'free';
    aspectBtns.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.aspect === 'free'));
    updateCropBoxDOM();
  });
}

if (cropApplyBtn) {
  cropApplyBtn.addEventListener('click', async () => {
    if (!activeCropItem) return;
    const scaleX = imgNaturalW / (imgDispW || 1);
    const scaleY = imgNaturalH / (imgDispH || 1);

    const naturalCrop = {
      x: Math.round(cropBox.x * scaleX),
      y: Math.round(cropBox.y * scaleY),
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
      aspect: activeAspect,
    };

    activeCropItem.cropOptions = naturalCrop;
    const itemToReconvert = activeCropItem;
    closeCropModal();

    const target = settings.format;
    const quality = settings.quality;
    const scales = settings.scales;
    const clean = settings.clean;
    const lossless = settings.lossless;
    const bgColor = bgPicker ? bgPicker.value : '#ffffff';

    try {
      const oldOutputs = itemToReconvert.outputs || [];
      const newOutputs = await convertImageFile(
        itemToReconvert.file,
        target,
        quality,
        scales,
        clean,
        lossless,
        bgColor,
        naturalCrop
      );
      for (const old of oldOutputs) {
        if (old.url) URL.revokeObjectURL(old.url);
      }
      itemToReconvert.outputs = newOutputs;
      itemToReconvert.status = 'done';
    } catch (err) {
      itemToReconvert.error = err.message || 'Crop conversion failed';
    }

    renderResultsView();
    if (currentPreviewItem && currentPreviewItem.id === itemToReconvert.id) {
      updatePreviewModalDetails(itemToReconvert);
    }
  });
}

if (previewCropBtn) {
  previewCropBtn.addEventListener('click', () => {
    if (!currentPreviewItem) return;
    const item = currentPreviewItem;
    if (previewDialog) {
      if (typeof previewDialog.close === 'function') previewDialog.close();
      else previewDialog.removeAttribute('open');
    }
    openCropModal(item);
  });
}

// Global Clipboard Paste Support (Images and SVG text)
window.addEventListener('paste', async (e) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== fileInput) {
    return;
  }

  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  const files = [];
  const items = Array.from(clipboardData.items || []);
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  if (files.length) {
    e.preventDefault();
    handleFiles(files);
    return;
  }

  const text = clipboardData.getData('text/plain')?.trim();
  if (text) {
    if (/^<svg[\s>]/i.test(text) || (/^<\?xml/i.test(text) && /<svg[\s>]/i.test(text))) {
      e.preventDefault();
      const svgFile = new File([text], `pasted-${Date.now()}.svg`, { type: 'image/svg+xml' });
      handleFiles([svgFile]);
    }
  }
});

// Footer Language Selector
const langSelect = document.querySelector('#lang-select');
if (langSelect) {
  const savedLang = localStorage.getItem('zapwebp_lang') || (navigator.language?.startsWith('tl') ? 'tl' : 'en');
  langSelect.value = savedLang;
  document.documentElement.lang = savedLang;

  langSelect.addEventListener('change', () => {
    const chosen = langSelect.value;
    document.documentElement.lang = chosen;
    localStorage.setItem('zapwebp_lang', chosen);
  });
}
