'use strict';

const convert = require('./convert');
const batch = require('./batch');
const clean = require('./clean');
const multipliers = require('./multipliers');

module.exports = {
  ...convert,
  ...batch,
  ...clean,
  ...multipliers,
};
