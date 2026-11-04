'use strict';

/**
 * Web Worker Message Dispatcher for Off-Main-Thread Conversion
 * Transfers converted byte arrays to avoid thread cloning overhead.
 */

/* global self */

async function handleConversionMessage(event, engine) {
  const { id, input, options } = event.data || {};
  if (!id) return;

  try {
    const convertFn = engine?.convertImage || require('@zapwebp/core').convertImage;
    const result = await convertFn(input, options);
    const response = {
      id,
      ok: true,
      result: {
        data: result.data,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.size,
        alphaPreserved: result.alphaPreserved,
        clean: result.clean,
        certificate: result.certificate,
      },
    };

    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
      const buffer = result.data.buffer;
      if (buffer instanceof ArrayBuffer) {
        self.postMessage(response, [buffer]);
      } else {
        self.postMessage(response);
      }
    }
    return response;
  } catch (err) {
    const errorResponse = {
      id,
      ok: false,
      error: err.message || String(err),
    };
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
      self.postMessage(errorResponse);
    }
    return errorResponse;
  }
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', (event) => {
    handleConversionMessage(event);
  });
}

module.exports = {
  handleConversionMessage,
};
