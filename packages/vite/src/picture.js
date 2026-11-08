'use strict';

const path = require('node:path');

/**
 * Generates accessible, modern HTML <picture> markup with AVIF/WebP sources and srcset multipliers.
 * @param {object} params
 * @param {string} params.src Web-accessible path to image (e.g. "/icons/hero.png")
 * @param {string[]} [params.formats=['avif', 'webp']] Target formats in priority order
 * @param {number[]} [params.scales=[1, 2, 3]] Multiplier scale factors
 * @param {number} [params.width] Intrinsic width
 * @param {number} [params.height] Intrinsic height
 * @param {string} [params.alt=''] Accessible alt text
 * @param {string} [params.className] CSS class name for <img>
 * @param {'lazy' | 'eager'} [params.loading='lazy'] Loading strategy
 * @param {'async' | 'sync' | 'auto'} [params.decoding='async'] Decoding strategy
 * @returns {string}
 */
function generatePictureHtml({
  src,
  formats = ['avif', 'webp'],
  scales = [1, 2, 3],
  width,
  height,
  alt = '',
  className = '',
  loading = 'lazy',
  decoding = 'async',
}) {
  const ext = path.extname(src);
  const baseWithoutExt = src.slice(0, -ext.length);

  let html = '<picture>\n';

  for (const fmt of formats) {
    const targetFmt = fmt.toLowerCase();
    const mime = targetFmt === 'jpeg' || targetFmt === 'jpg' ? 'image/jpeg' : `image/${targetFmt}`;
    const outExt = targetFmt === 'jpeg' ? 'jpg' : targetFmt;

    const srcsetParts = scales.map((scale) => {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      const descriptor = scale === 1 ? '1x' : `${scale}x`;
      return `${baseWithoutExt}${suffix}.${outExt} ${descriptor}`;
    });

    html += `  <source type="${mime}" srcset="${srcsetParts.join(', ')}">\n`;
  }

  // Fallback <img> element
  const fallbackExt = (formats[formats.length - 1] || 'webp').toLowerCase();
  const fallbackUrl = `${baseWithoutExt}.${fallbackExt === 'jpeg' ? 'jpg' : fallbackExt}`;

  const attrs = [
    `src="${fallbackUrl}"`,
    `alt="${alt.replace(/"/g, '&quot;')}"`,
    `loading="${loading}"`,
    `decoding="${decoding}"`,
  ];

  if (width !== undefined) attrs.push(`width="${width}"`);
  if (height !== undefined) attrs.push(`height="${height}"`);
  if (className) attrs.push(`class="${className.replace(/"/g, '&quot;')}"`);

  html += `  <img ${attrs.join(' ')}>\n`;
  html += '</picture>';

  return html;
}

module.exports = {
  generatePictureHtml,
};
