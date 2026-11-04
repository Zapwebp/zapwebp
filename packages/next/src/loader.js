'use strict';

const path = require('node:path');

/**
 * Webpack loader that translates SVG imports into converted WebP asset URLs.
 * @param {string} _source
 * @returns {string}
 */
module.exports = function zapwebpSvgLoader(_source) {
  const options = this.getOptions ? this.getOptions() : {};
  const outDir = options.outDir || 'public/icons';
  const cleanOutDir = outDir.replace(/^[/\\]+/, '').replace(/^public[/\\]+/, '').replace(/\\/g, '/');

  const baseName = path.basename(this.resourcePath, path.extname(this.resourcePath));
  const webpUrl = cleanOutDir ? `/${cleanOutDir}/${baseName}.webp` : `/${baseName}.webp`;

  return `export default ${JSON.stringify(webpUrl)};`;
};

