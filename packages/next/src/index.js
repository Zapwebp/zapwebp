'use strict';

const { resolveConfig } = require('./config');
const { applyWebpack, ZapwebpWebpackPlugin } = require('./webpack');

/**
 * Higher-order Next.js configuration wrapper.
 * @param {import('./index').ZapwebpNextOptions} [userOptions={}]
 * @returns {(nextConfig?: import('./index').NextConfig) => import('./index').NextConfig}
 */
function withZapwebp(userOptions = {}) {
  const options = resolveConfig(userOptions);

  return function zapwebpNextWrapper(nextConfig = {}) {
    const config = { ...nextConfig };

    // Register WebP in next/image formats if respectNextImage is enabled
    if (options.respectNextImage) {
      config.images = config.images || {};
      const formats = config.images.formats ? [...config.images.formats] : [];
      if (!formats.includes('image/webp')) {
        formats.push('image/webp');
      }
      config.images.formats = formats;
    }

    const previousWebpack = config.webpack;

    config.webpack = function zapwebpWebpack(webpackConfig, webpackContext) {
      applyWebpack(webpackConfig, webpackContext, options);

      if (typeof previousWebpack === 'function') {
        return previousWebpack(webpackConfig, webpackContext);
      }

      return webpackConfig;
    };

    return config;
  };
}

module.exports = {
  withZapwebp,
  default: withZapwebp,
  ZapwebpWebpackPlugin,
};
