# Adding a New Image Format to @zapwebp/core

Adding support for a new image format to `@zapwebp/core` is governed by the **Open/Closed Principle**. You never need to modify `convertImage()` or the conversion state machine. You simply add a single handler file to `packages/core/src/formats/` and register it.

---

## Step 1: Implement `FormatHandler`

Create `packages/core/src/formats/<format-name>.js`.

Your handler must satisfy the `FormatHandler` interface:

```js
'use strict';

const sharp = require('sharp');

/** @type {import('./registry').FormatHandler} */
const myFormatHandler = {
  name: 'myformat',
  mimeTypes: Object.freeze(['image/myformat']),
  extensions: Object.freeze(['.myfmt']),
  supportsAlpha: true,
  isInput: true,
  isOutput: true,

  /**
   * Sniffs buffer bytes to verify if it belongs to this format.
   * @param {Uint8Array | Buffer} bytes
   * @returns {boolean}
   */
  detect(bytes) {
    if (!bytes || bytes.length < 4) return false;
    // Check magic bytes / signature
    return bytes[0] === 0x12 && bytes[1] === 0x34;
  },

  /**
   * Decodes input bytes into raw RGBA pixels.
   * @param {Uint8Array | Buffer} bytes
   * @returns {Promise<{ data: Uint8ClampedArray, width: number, height: number }>}
   */
  async decode(bytes) {
    const { data: raw, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength),
      width: info.width,
      height: info.height,
    };
  },

  /**
   * Encodes raw RGBA pixels into target format bytes.
   * @param {{ data: Uint8ClampedArray | Buffer, width: number, height: number }} image
   * @param {object} [options]
   * @returns {Promise<Buffer>}
   */
  async encode(image, options = {}) {
    const raw = Buffer.isBuffer(image.data)
      ? image.data
      : Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);

    return sharp(raw, {
      raw: { width: image.width, height: image.height, channels: 4 },
    })
      .toFormat('myformat')
      .toBuffer();
  },
};

module.exports = {
  myFormatHandler,
};
```

---

## Step 2: Register in `packages/core/src/formats/index.js`

Import and register your handler:

```js
const { myFormatHandler } = require('./myformat');

registry.register(myFormatHandler);
```

---

## Step 3: Add to Shared Constants

Update `packages/shared/src/index.js` if the format should be surfaced in public MIME mappings or CLI flags:

```js
const INPUT_FORMATS = Object.freeze([...existing, 'myformat']);
```

---

## Step 4: Add Unit Tests

Add a new test in `packages/core/test/conversion.test.js`:

```js
test('detects and converts myformat', async () => {
  const result = await convertImage(sampleBuffer, { to: 'webp' });
  assert.equal(result.format, 'webp');
});
```

Run tests to verify:
```bash
pnpm --filter @zapwebp/core test
```

