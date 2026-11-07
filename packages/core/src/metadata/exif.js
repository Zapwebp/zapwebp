'use strict';

/** @type {import('./registry').MetadataHandler} */
const exifHandler = {
  name: 'exif',
  async inspect(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const fields = [];

    // Check PNG eXIf
    if (data.includes(Buffer.from('eXIf'))) {
      fields.push({ type: 'EXIF', key: 'PNG-eXIf', value: 'present', offset: data.indexOf('eXIf') });
    }

    // Check JPEG APP1 Exif
    if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
      const idx = data.indexOf(Buffer.from('Exif\0\0'));
      if (idx !== -1) {
        fields.push({ type: 'EXIF', key: 'JPEG-Exif', value: 'present', offset: idx });
      }
    }

    // Check WebP EXIF
    if (data.includes(Buffer.from('EXIF'))) {
      fields.push({ type: 'EXIF', key: 'WebP-EXIF', value: 'present', offset: data.indexOf('EXIF') });
    }

    return fields;
  },

  async strip(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    try {
      const sharp = require('sharp');
      // Re-encode via sharp without metadata to strip EXIF
      const meta = await sharp(data).metadata();
      if (!meta.format) return data;
      return await sharp(data).toBuffer();
    } catch {
      return data;
    }
  },
};

module.exports = { exifHandler };
