'use strict';

/** @type {import('./registry').MetadataHandler} */
const iccHandler = {
  name: 'icc',
  async inspect(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const fields = [];

    if (data.includes(Buffer.from('ICC_PROFILE')) || data.includes(Buffer.from('ICCP'))) {
      fields.push({ type: 'ICC', key: 'Color-Profile', value: 'present', offset: Math.max(data.indexOf('ICC_PROFILE'), data.indexOf('ICCP')) });
    }

    return fields;
  },

  async strip(bytes, options = {}) {
    const { stripContainerMetadata } = require('./chunk-stripper');
    return stripContainerMetadata(bytes, options);
  },
};

module.exports = { iccHandler };
