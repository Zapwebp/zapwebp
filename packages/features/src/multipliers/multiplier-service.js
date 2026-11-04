'use strict';

const { parseScales, scaleSuffix, outputName, generateSrcset } = require('@zapwebp/core');

/**
 * Multiplier Scale Service (@1x/@2x/@3x)
 */
class MultiplierService {
  /**
   * Parses scale input into validated integer array.
   * @param {number[] | string} [scaleInput=[1, 2, 3]]
   * @returns {number[]}
   */
  static parse(scaleInput = [1, 2, 3]) {
    return parseScales(scaleInput);
  }

  /**
   * Generates multiplier plan with dimensions and target filenames.
   * @param {object} params
   * @param {string} params.filename - Base filename
   * @param {number} params.baseWidth - 1x base pixel width
   * @param {number} [params.baseHeight] - Optional 1x base pixel height
   * @param {number[]} [params.scales=[1, 2, 3]] - Scales to generate
   * @param {string} [params.format='webp'] - Output format
   */
  static plan({ filename, baseWidth, baseHeight, scales = [1, 2, 3], format = 'webp' }) {
    const parsedScales = parseScales(scales);
    const variants = parsedScales.map((scale) => {
      const scaledWidth = baseWidth ? Math.round(baseWidth * scale) : undefined;
      const scaledHeight = baseHeight ? Math.round(baseHeight * scale) : undefined;
      const name = outputName(filename, format, scale);
      return {
        scale,
        suffix: scaleSuffix(scale),
        width: scaledWidth,
        height: scaledHeight,
        filename: name,
      };
    });

    const srcset = generateSrcset(filename, parsedScales, format);
    return {
      variants,
      srcset,
    };
  }
}

module.exports = {
  MultiplierService,
};
