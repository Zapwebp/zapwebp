'use strict';

/** @type {import('./registry').MetadataHandler} */
const c2paHandler = {
  name: 'c2pa',
  async inspect(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const fields = [];

    if (data.includes(Buffer.from('c2pa')) || data.includes(Buffer.from('jumb'))) {
      fields.push({ type: 'C2PA', key: 'Provenance-Manifest', value: 'present', offset: Math.max(data.indexOf('c2pa'), data.indexOf('jumb')) });
    }

    return fields;
  },

  async strip(bytes, options = {}) {
    const { stripContainerMetadata } = require('./chunk-stripper');
    return stripContainerMetadata(bytes, options);
  },
};

module.exports = { c2paHandler };
