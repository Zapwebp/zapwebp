'use strict';

const sharp = require('sharp');

/**
 * Creates a valid SVG image buffer for unit and integration testing.
 *
 * @param {object} [options]
 * @param {number} [options.width=100]
 * @param {number} [options.height=100]
 * @param {boolean} [options.transparent=true]
 * @param {string} [options.fill='#8dc63f']
 * @param {boolean} [options.withMetadata=false]
 * @returns {Buffer}
 */
function createMockSvg(options = {}) {
  const width = options.width || 100;
  const height = options.height || 100;
  const fill = options.fill || '#8dc63f';
  const transparent = options.transparent !== false;

  const bgRect = transparent
    ? ''
    : `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

  const metadataBlock = options.withMetadata
    ? `<metadata>
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <rdf:Description>
      <dc:creator>Test Suite</dc:creator>
      <dc:title>Mock SVG Asset</dc:title>
    </rdf:Description>
  </rdf:RDF>
</metadata>`
    : '';

  const svgXml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${metadataBlock}
  ${bgRect}
  <circle cx="${Math.round(width / 2)}" cy="${Math.round(height / 2)}" r="${Math.round(Math.min(width, height) / 3)}" fill="${fill}"/>
</svg>`;

  return Buffer.from(svgXml, 'utf8');
}

/**
 * Creates a valid raster or vector image buffer for unit testing.
 *
 * @param {object} [options]
 * @param {'svg'|'png'|'webp'|'jpeg'|'avif'} [options.format='png']
 * @param {number} [options.width=64]
 * @param {number} [options.height=64]
 * @param {boolean} [options.transparent=true]
 * @param {boolean} [options.withMetadata=false]
 * @returns {Promise<Buffer>}
 */
async function createMockImage(options = {}) {
  const format = (options.format || 'png').toLowerCase();
  const width = options.width || 64;
  const height = options.height || 64;
  const transparent = options.transparent !== false && format !== 'jpeg';

  if (format === 'svg') {
    return createMockSvg({
      width,
      height,
      transparent,
      withMetadata: options.withMetadata,
    });
  }

  const channels = transparent ? 4 : 3;
  const background = transparent
    ? { r: 141, g: 198, b: 63, alpha: 0.8 }
    : { r: 141, g: 198, b: 63 };

  let pipeline = sharp({
    create: {
      width,
      height,
      channels,
      background,
    },
  });

  if (format === 'png') {
    pipeline = pipeline.png();
  } else if (format === 'webp') {
    pipeline = pipeline.webp();
  } else if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg();
  } else if (format === 'avif') {
    pipeline = pipeline.avif();
  }

  if (options.withMetadata) {
    pipeline = pipeline.withMetadata({
      exif: {
        IFD0: {
          Artist: 'Zapwebp Test Suite',
          Software: 'Zapwebp Mock Generator',
        },
      },
    });
  }

  return pipeline.toBuffer();
}

module.exports = {
  createMockSvg,
  createMockImage,
};
