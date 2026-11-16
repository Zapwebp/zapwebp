'use strict';

const fs = require('node:fs');
const sharp = require('sharp');
const { ZapwebpError } = require('@zapwebp/shared');
const { encodeIco } = require('./write');

/**
 * @typedef {Object} FaviconSuiteOptions
 * @property {string} [name] - App name for manifest and titles (default: 'App')
 * @property {string} [shortName] - Short app name
 * @property {string} [themeColor] - Hex color for theme-color (default: '#000000')
 * @property {string} [backgroundColor] - Hex color for PWA background (default: '#ffffff')
 * @property {number[]} [sizes] - Sizes for favicon.ico container (default: [16, 32, 48, 64, 128, 256])
 * @property {string} [prefix] - URL path prefix for HTML link tags and manifest icons (default: '/')
 * @property {boolean} [clean] - Strip metadata from output images (default: true)
 */

/**
 * @typedef {Object} FaviconSuiteResult
 * @property {Record<string, Buffer | string>} files - Generated asset map (filename -> buffer or utf8 string)
 * @property {string} html - HTML snippet for <head> insertion
 * @property {Object} manifest - Parsed site.webmanifest JSON object
 */

/**
 * Generates a complete production-grade favicon and PWA icon suite from an image source.
 *
 * @param {Buffer | string} input - Image buffer or path to image file
 * @param {FaviconSuiteOptions} [options]
 * @returns {Promise<FaviconSuiteResult>}
 */
async function generateFaviconSuite(input, options = {}) {
  let sourceBuffer;
  if (typeof input === 'string') {
    if (!fs.existsSync(input)) {
      throw new ZapwebpError({
        code: 'E_NOT_FOUND',
        message: `Favicon source file not found: "${input}".`,
        fix: 'Provide an existing image file path.',
      });
    }
    sourceBuffer = fs.readFileSync(input);
  } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    sourceBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  } else {
    throw new ZapwebpError({
      code: 'E_INVALID_CONFIG',
      message: 'Favicon source must be a file path string or Buffer.',
      fix: 'Provide a valid image buffer or file path.',
    });
  }

  const name = options.name || 'App';
  const shortName = options.shortName || name;
  const themeColor = options.themeColor || '#000000';
  const backgroundColor = options.backgroundColor || '#ffffff';
  const prefix = options.prefix ? (options.prefix.endsWith('/') ? options.prefix : `${options.prefix}/`) : '/';
  const icoSizes = options.sizes || [16, 32, 48, 64, 128, 256];

  // 1. Generate multi-size favicon.ico
  const icoBuffer = await encodeIco(sourceBuffer, { sizes: options.sizes, preset: options.preset });

  // Helper to generate square PNG
  const renderPng = async (dimension) => {
    return sharp(sourceBuffer, { limitInputPixels: 4096 * 4096, failOn: 'error' })
      .resize(dimension, dimension, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();
  };

  // 2. Generate Apple touch icon (180x180)
  const appleTouchIcon = await renderPng(180);

  // 3. Generate Android / PWA icons (192x192 & 512x512)
  const icon192 = await renderPng(192);
  const icon512 = await renderPng(512);

  // 4. Generate standard web browser PNGs (32x32 & 16x16)
  const icon32 = await renderPng(32);
  const icon16 = await renderPng(16);

  // 5. Construct W3C site.webmanifest
  const manifest = {
    name,
    short_name: shortName,
    icons: [
      {
        src: `${prefix}icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `${prefix}icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: themeColor,
    background_color: backgroundColor,
    display: 'standalone',
  };
  const manifestJson = JSON.stringify(manifest, null, 2);

  // Check if source image is SVG
  const isSvg = sourceBuffer.subarray(0, 200).toString('utf8').toLowerCase().includes('<svg');

  // 6. Construct HTML head tags
  const htmlList = [
    `<link rel="icon" href="${prefix}favicon.ico" sizes="any">`,
  ];
  if (isSvg) {
    htmlList.push(`<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">`);
  }
  htmlList.push(
    `<link rel="icon" type="image/png" sizes="32x32" href="${prefix}favicon-32x32.png">`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${prefix}favicon-16x16.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${prefix}apple-touch-icon.png">`,
    `<link rel="manifest" href="${prefix}site.webmanifest">`,
    `<meta name="theme-color" content="${themeColor}">`
  );
  const html = htmlList.join('\n');

  const files = {
    'favicon.ico': icoBuffer,
    'apple-touch-icon.png': appleTouchIcon,
    'icon-192.png': icon192,
    'icon-512.png': icon512,
    'favicon-32x32.png': icon32,
    'favicon-16x16.png': icon16,
    'site.webmanifest': manifestJson,
  };
  if (isSvg) {
    files['favicon.svg'] = sourceBuffer;
  }

  return {
    files,
    html,
    manifest,
  };
}

module.exports = {
  generateFaviconSuite,
};
