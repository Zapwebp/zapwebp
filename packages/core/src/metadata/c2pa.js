'use strict';

const sharp = require('sharp');

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

  async strip(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    try {
      const meta = await sharp(data).metadata();
      if (!meta.format) return data;
      return await sharp(data).toBuffer();
    } catch {
      return data;
    }
  },
};

module.exports = { c2paHandler };
