'use strict';

const golden = require('./golden');
const adversarial = require('./adversarial');
const soak = require('./soak');
const metrics = require('./metrics');

module.exports = {
  ...golden,
  ...adversarial,
  ...soak,
  ...metrics,
};
