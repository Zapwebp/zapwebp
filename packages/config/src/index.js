'use strict';

const eslintConfig = require('./eslint');
const tsconfigBase = require('./tsconfig/base.json');

module.exports = {
  eslint: eslintConfig,
  tsconfig: tsconfigBase,
};
