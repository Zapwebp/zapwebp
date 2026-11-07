'use strict';

/** @type {import('./registry').MetadataHandler} */
const xmpHandler = {
  name: 'xmp',
  async inspect(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const fields = [];

    // Text / SVG XMP
    const sample = data.subarray(0, Math.min(data.length, 16384)).toString('utf8');
    if (/<(?:rdf:RDF|xmp:CreatorTool|xmpMM:)/i.test(sample)) {
      fields.push({ type: 'XMP', key: 'XML-Packet', value: 'present', offset: 0 });
    }

    // JPEG / WebP XMP marker
    if (data.includes(Buffer.from('http://ns.adobe.com/xap/1.0/')) || data.includes(Buffer.from('XMP '))) {
      fields.push({ type: 'XMP', key: 'Adobe-XMP', value: 'present', offset: data.indexOf('http://ns.adobe.com') });
    }

    return fields;
  },

  async strip(bytes) {
    const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const text = data.toString('utf8');
    if (text.includes('<svg')) {
      // Strip <metadata> and rdf:RDF from SVG
      const cleaned = text.replace(/<metadata[\s\S]*?<\/metadata>/gi, '').replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, '');
      return Buffer.from(cleaned, 'utf8');
    }
    try {
      const sharp = require('sharp');
      const meta = await sharp(data).metadata();
      if (!meta.format) return data;
      return await sharp(data).toBuffer();
    } catch {
      return data;
    }
  },
};

module.exports = { xmpHandler };
