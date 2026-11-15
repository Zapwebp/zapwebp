'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/index');
const { parallelMap } = require('../src/parallel');
const { ZapwebpError } = require('@zapwebp/shared');
const { resolvePolicy, checkPolicyInput, evaluateQuality } = require('../src/policy');
const { MetadataRegistry } = require('../src/metadata/registry');

test('Finding 1.1: Custom format end-to-end registration and conversion', async () => {
  const customFormat = {
    name: 'customtest',
    mimeTypes: ['image/x-customtest'],
    extensions: ['.cst'],
    supportsAlpha: true,
    isInput: true,
    isOutput: true,
    detect: (buf) => buf.length >= 4 && buf[0] === 0x43 && buf[1] === 0x53 && buf[2] === 0x54 && buf[3] === 0x31,
    decode: async () => ({
      data: Buffer.alloc(4 * 4 * 4, 128),
      width: 4,
      height: 4,
      channels: 4,
    }),
    encode: async (raw) => {
      const header = Buffer.from('CST1');
      return Buffer.concat([header, Buffer.from([raw.width, raw.height]), Buffer.alloc(26)]);
    },
  };

  core.registerFormat(customFormat);

  // 1. Verify custom format is registered
  const handlers = core.getFormats();
  assert.ok(handlers.includes('customtest'), 'getFormats must include customtest');

  // 2. Decode custom format -> Encode to WebP
  const customBytes = Buffer.concat([Buffer.from('CST1'), Buffer.alloc(28)]);
  const toWebp = await core.convert(customBytes, { to: 'webp' });
  assert.equal(toWebp.format, 'webp');
  assert.ok(toWebp.length > 0);

  // 3. Decode WebP -> Encode to custom format
  const toCustom = await core.convert(toWebp, { to: 'customtest' });
  assert.equal(toCustom.format, 'customtest');
  assert.equal(toCustom.subarray(0, 4).toString(), 'CST1');
  assert.equal(toCustom[4], 4);
  assert.equal(toCustom[5], 4);
});

test('Finding 1.2: TypeScript runtime signatures take single options object', () => {
  const policy = resolvePolicy({});

  // checkPolicyInput accepts a single params object
  assert.equal(checkPolicyInput.length, 1);
  assert.doesNotThrow(() => {
    checkPolicyInput({
      policy,
      data: Buffer.from([1, 2, 3]),
      detectedFormat: 'png',
    });
  });

  // evaluateQuality accepts a single params object
  assert.equal(evaluateQuality.length, 1);
  const qualityResult = evaluateQuality({
    policy,
    inputFormat: 'png',
    inputBytes: 1000,
    hasAlpha: false,
    targetFormat: 'webp',
  });
  assert.equal(typeof qualityResult.quality, 'number');
  assert.equal(typeof qualityResult.lossless, 'boolean');
});

test('Finding 1.3: parallelMap aborts pending workers on failure', async () => {
  let executedCount = 0;
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  await assert.rejects(
    parallelMap(
      items,
      async (item) => {
        executedCount++;
        if (item === 2) {
          throw new Error('Worker crash');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        return item;
      },
      { concurrency: 2 }
    ),
    /Worker crash/
  );

  // With aborted flag, remaining tasks in the queue should NOT execute
  assert.ok(executedCount < items.length, `Expected aborted workers: ran ${executedCount}/${items.length}`);
});

test('Finding 1.3: parallelMap respects AbortSignal', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    parallelMap([1, 2, 3], async (x) => x * 2, { signal: controller.signal }),
    (err) => err instanceof ZapwebpError && err.code === 'E_ABORTED'
  );
});

test('Finding 2.1: SVG safety rejects javascript: schemes with E_UNSAFE_SVG', () => {
  const dangerSvg1 = '<svg><image href="javascript:alert(1)"/></svg>';
  assert.throws(
    () => core.validateSvg(dangerSvg1),
    (err) => err instanceof ZapwebpError && err.code === 'E_UNSAFE_SVG'
  );

  const dangerSvg2 = '<svg><a href="javascript:void(0)"><rect width="10" height="10"/></a></svg>';
  assert.throws(
    () => core.validateSvg(dangerSvg2),
    (err) => err instanceof ZapwebpError && err.code === 'E_UNSAFE_SVG'
  );
});

test('Finding 2.2: Structured ZapwebpError thrown consistently across modules', () => {
  // Empty file
  assert.throws(
    () => core.detectFormat(Buffer.alloc(0)),
    (err) => err instanceof ZapwebpError && err.code === 'E_EMPTY_FILE'
  );

  // Invalid policy config
  assert.throws(
    () => resolvePolicy({ quality: { mode: 'invalid-mode' } }),
    (err) => err instanceof ZapwebpError && err.code === 'E_INVALID_CONFIG'
  );

  // Invalid scale multiplier
  assert.throws(
    () => core.parseScales('invalid'),
    (err) => err instanceof ZapwebpError && err.code === 'E_INVALID_CONFIG'
  );
});

test('Finding 2.3: Zero-Trust metadata clean fails loudly on inspection error', async () => {
  const reg = new MetadataRegistry();
  let inspectCalls = 0;
  reg.register({
    name: 'faulty',
    inspect: async () => {
      inspectCalls++;
      if (inspectCalls === 1) {
        return [{ type: 'custom', key: 'camera', value: 'x' }];
      }
      throw new Error('Verification crash in inspector');
    },
    strip: async (data) => data,
  });

  const validSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
  await assert.rejects(
    reg.clean(validSvg),
    (err) => err instanceof ZapwebpError && err.code === 'E_CLEAN_FAILED'
  );
});

test('Finding 3.1: Export aliases cleanMetadata and cleanBytes', () => {
  assert.equal(typeof core.cleanBytes, 'function');
  assert.equal(typeof core.cleanMetadata, 'function');
});

test('Finding 3.3: parseScales strips trailing x/X multiplier suffixes', () => {
  assert.deepEqual(core.parseScales('1, 2x, 3X'), [1, 2, 3]);
  assert.deepEqual(core.parseScales(['1x', '2.5X', 3]), [1, 2.5, 3]);
});

test('Finding 3.4: SVG extreme aspect ratios rejected with E_EXTREME_ASPECT_RATIO', async () => {
  const extremeTallSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="500"><rect/></svg>';
  await assert.rejects(
    core.convert(Buffer.from(extremeTallSvg), { to: 'webp' }),
    (err) => err instanceof ZapwebpError && err.code === 'E_EXTREME_ASPECT_RATIO'
  );

  const extremeWideSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="1"><rect/></svg>';
  await assert.rejects(
    core.convert(Buffer.from(extremeWideSvg), { to: 'webp' }),
    (err) => err instanceof ZapwebpError && err.code === 'E_EXTREME_ASPECT_RATIO'
  );
});

test('Finding 3.5: In-memory convertImage returns originalDeleted: false and action: in_memory_only', async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32"/></svg>';
  const result = await core.convertImage(Buffer.from(svg), {
    to: 'webp',
    keepOriginal: false,
  });
  assert.equal(result.lifecycle.originalDeleted, false);
  assert.equal(result.lifecycle.action, 'in_memory_only');
});

test('Finding 4.2: stripCssComments runs in linear time without catastrophic backtracking', () => {
  const maliciousComment = '/*' + ' '.repeat(50000);
  const svgWithMaliciousComment = `<svg xmlns="http://www.w3.org/2000/svg"><style>${maliciousComment}</style><rect width="10" height="10"/></svg>`;
  
  const startTime = Date.now();
  assert.doesNotThrow(() => {
    core.validateSvg(Buffer.from(svgWithMaliciousComment));
  });
  const elapsed = Date.now() - startTime;
  assert.ok(elapsed < 200, `Expected linear execution (<200ms), took ${elapsed}ms`);
});
