'use strict';

const path = require('node:path');

/**
 * Webpack loader that translates image and vector imports into converted asset URLs.
 * @param {string} _source
 * @returns {string}
 */
function zapwebpWebpackLoader(_source) {
  const options = this.getOptions ? this.getOptions() : {};
  const outDir = options.outDir || 'public/icons';
  const cleanOutDir = outDir.replace(/^[/\\]+/, '').replace(/^public[/\\]+/, '').replace(/\\/g, '/');

  const ext = path.extname(this.resourcePath);
  const baseName = path.basename(this.resourcePath, ext);
  const targetFormat = (options.format || 'webp').toLowerCase();
  const outExt = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
  const assetUrl = cleanOutDir ? `/${cleanOutDir}/${baseName}.${outExt}` : `/${baseName}.${outExt}`;

  return `export default ${JSON.stringify(assetUrl)};`;
}

/**
 * Official next/image custom loader for Zapwebp.
 * Used via next.config.js `images.loaderFile` or `<Image loader={zapwebpLoader} ... />`.
 * @param {{ src: string, width: number, quality?: number }} params
 * @returns {string}
 */
function zapwebpLoader({ src, width, quality = 85 }) {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  const cleanSrc = src.split('?')[0];
  const ext = path.extname(cleanSrc);
  const base = ext ? cleanSrc.slice(0, -ext.length) : cleanSrc;
  const targetExt = '.webp';

  const params = [];
  if (width) params.push(`w=${width}`);
  if (quality) params.push(`q=${quality}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';

  return `${base}${targetExt}${query}`;
}

zapwebpWebpackLoader.zapwebpLoader = zapwebpLoader;
zapwebpWebpackLoader.default = zapwebpWebpackLoader;

module.exports = zapwebpWebpackLoader;
module.exports.zapwebpLoader = zapwebpLoader;
