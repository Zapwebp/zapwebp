'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTargetBytes,
  binarySearchQuality,
  compress,
  compressor,
} = require('../src/index');

describe('@zapwebp/compressor', () => {
  describe('parseTargetBytes', () => {
    it('parses numeric bytes directly', () => {
      assert.equal(parseTargetBytes(500000), 500000);
      assert.equal(parseTargetBytes(1024), 1024);
      assert.equal(parseTargetBytes(12.7), 13);
    });

    it('parses strings with units (B, KB, MB, GB)', () => {
      assert.equal(parseTargetBytes('500b'), 500);
      assert.equal(parseTargetBytes('500 bytes'), 500);
      assert.equal(parseTargetBytes('100kb'), 100 * 1024);
      assert.equal(parseTargetBytes('500 KB'), 500 * 1024);
      assert.equal(parseTargetBytes('1.5mb'), Math.round(1.5 * 1024 * 1024));
      assert.equal(parseTargetBytes('2MB'), 2 * 1024 * 1024);
      assert.equal(parseTargetBytes('1gb'), 1024 * 1024 * 1024);
      assert.equal(parseTargetBytes('2048'), 2048);
    });

    it('throws TypeError or RangeError on invalid inputs', () => {
      assert.throws(() => parseTargetBytes(''), /cannot be empty/i);
      assert.throws(() => parseTargetBytes('0kb'), /greater than 0/i);
      assert.throws(() => parseTargetBytes(-500), /positive number/i);
      assert.throws(() => parseTargetBytes('foo'), /Invalid target bytes specification/i);
      assert.throws(() => parseTargetBytes('500tb'), /Unrecognized size unit/i);
      assert.throws(() => parseTargetBytes(null), /positive number or size string/i);
      assert.throws(() => parseTargetBytes(undefined), /positive number or size string/i);
    });
  });

  describe('binarySearchQuality', () => {
    it('finds optimal quality using mock encode function within iteration cap', async () => {
      const mockImage = {
        data: Buffer.alloc(100 * 100 * 4),
        width: 100,
        height: 100,
      };

      // Mock encoder where output length is strictly 100 * quality
      const mockEncodeFn = async (_img, opts) => {
        const q = opts.quality;
        return Buffer.alloc(q * 100);
      };

      // Target is 5050 bytes -> optimal quality is 50 (5000 bytes <= 5050)
      const res = await binarySearchQuality(mockImage, 5050, 10, 95, { maxIterations: 8 }, mockEncodeFn);

      assert.ok(res.bestCandidate);
      assert.equal(res.bestCandidate.quality, 50);
      assert.equal(res.bestCandidate.bytes, 5000);
      assert.ok(res.iterations <= 8);
    });
  });

  describe('compress', () => {
    function createTestImage(width, height) {
      const data = Buffer.alloc(width * height * 4);
      // Fill with patterned color gradient
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (i * 7) % 256;     // R
        data[i + 1] = (i * 13) % 256; // G
        data[i + 2] = (i * 17) % 256; // B
        data[i + 3] = 255;            // A
      }
      return { data, width, height, channels: 4 };
    }

    it('achieves target bytes on first pass via quality optimization', async () => {
      const img = createTestImage(120, 120);
      const result = await compress(img, {
        targetBytes: '8kb',
        format: 'webp',
        minQuality: 10,
        maxQuality: 90,
      });

      assert.equal(result.achieved, true);
      assert.equal(result.downscaled, false);
      assert.equal(result.downscaleCount, 0);
      assert.ok(result.bytes <= 8 * 1024);
      assert.ok(result.quality >= 10 && result.quality <= 90);
      assert.equal(result.width, 120);
      assert.equal(result.height, 120);
      assert.ok(Buffer.isBuffer(result.output));
    });

    it('downscales image when target cannot be met by quality alone', async () => {
      const img = createTestImage(200, 200);
      // Set an aggressive target of 1200 bytes for a noisy 200x200 image
      const result = await compress(img, {
        targetBytes: 1500,
        format: 'webp',
        minQuality: 10,
        maxQuality: 80,
        allowDownscale: true,
        maxDownscaleAttempts: 3,
        downscaleStep: 0.75,
      });

      assert.equal(result.achieved, true);
      assert.ok(result.bytes <= 1500);
      assert.equal(result.downscaled, true);
      assert.ok(result.downscaleCount >= 1);
      assert.ok(result.width < 200);
      assert.ok(result.height < 200);
    });

    it('throws E_TARGET_UNREACHABLE on impossible target when throwOnUnreachable is true', async () => {
      const img = createTestImage(100, 100);
      await assert.rejects(
        async () => {
          await compress(img, {
            targetBytes: 10, // 10 bytes is impossible for WebP headers alone
            format: 'webp',
            minQuality: 10,
            maxDownscaleAttempts: 2,
            throwOnUnreachable: true,
          });
        },
        (err) => {
          assert.equal(err.name, 'ZapwebpError');
          assert.equal(err.code, 'E_TARGET_UNREACHABLE');
          assert.ok(err.actualBytes > 10);
          assert.equal(err.targetBytes, 10);
          assert.ok(err.suggestedFix);
          assert.ok(err.bestAttempt);
          return true;
        }
      );
    });

    it('returns diagnostic failure object when throwOnUnreachable is false', async () => {
      const img = createTestImage(100, 100);
      const result = await compress(img, {
        targetBytes: 10,
        format: 'webp',
        minQuality: 10,
        maxDownscaleAttempts: 1,
        throwOnUnreachable: false,
      });

      assert.equal(result.achieved, false);
      assert.ok(result.reason.includes('unreachable'));
      assert.ok(result.bestAttempt);
      assert.ok(result.bestAttempt.bytes > 10);
    });

    it('respects allowDownscale: false and does not resize', async () => {
      const img = createTestImage(150, 150);
      const result = await compress(img, {
        targetBytes: 20000,
        format: 'webp',
        allowDownscale: false,
      });

      assert.equal(result.width, 150);
      assert.equal(result.height, 150);
      assert.equal(result.downscaled, false);
      assert.equal(result.downscaleCount, 0);
    });

    it('rejects invalid RawImage inputs', async () => {
      await assert.rejects(
        async () => compress(null, { targetBytes: 5000 }),
        /Invalid RawImage/i
      );
      await assert.rejects(
        async () => compress({ data: null, width: 10, height: 10 }, { targetBytes: 5000 }),
        /Invalid RawImage/i
      );
    });
  });

  describe('plugin contract', () => {
    it('defines standard compressor plugin instance', () => {
      assert.equal(compressor.name, 'compressor');
      assert.equal(typeof compressor.compress, 'function');
    });
  });
});
