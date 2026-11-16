'use strict';

const { defineCompressor } = require('@zapwebp/plugin-sdk');
const {
  parseTargetBytes,
  binarySearchQuality,
  downscaleRawImage,
  compress,
  defaultEncodeFn,
} = require('./compressor');

/**
 * Standard compressor plugin definition conforming to Plugin SDK contracts.
 */
const compressor = defineCompressor({
  name: 'compressor',
  compress,
});

module.exports = {
  compressor,
  compress,
  binarySearchQuality,
  parseTargetBytes,
  downscaleRawImage,
  defaultEncodeFn,
  defineCompressor,
};
