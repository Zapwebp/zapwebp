'use strict';

const sharp = require('sharp');

/** @type {import('./registry').MetadataHandler} */
const pngTextHandler = {
  name: 'png-text',
  async inspect(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const fields = [];

    for (const chunk of ['tEXt', 'iTXt', 'zTXt', 'tIME', 'pHYs']) {
      if (data.includes(Buffer.from(chunk))) {
        fields.push({ type: 'PNG-tEXt', key: chunk, value: 'present', offset: data.indexOf(chunk) });
      }
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

module.exports = { pngTextHandler };
