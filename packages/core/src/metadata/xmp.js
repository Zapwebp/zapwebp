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

  async strip(bytes, options = {}) {
    const { stripContainerMetadata } = require('./chunk-stripper');
    return stripContainerMetadata(bytes, options);
  },
};

module.exports = { xmpHandler };
