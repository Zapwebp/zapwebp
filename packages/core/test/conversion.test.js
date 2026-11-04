'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  convert,
  convertImage,
  convertSvgToWebp,
  decodeToRgba,
  encodeFromRgba,
  detectFormat,
  detectMetadata,
  generateCleanCertificate,
  verifyAlpha,
  auditConversionCommand,
  explainBlackBackground,
  parseScales,
  scaleSuffix,
  outputName,
  generateSrcset,
  inspectImage,
  validateSvg,
} = require('../src');

const transparentSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="7" fill="#8dc63f"/></svg>';

test('converts SVG with a transparent corner to alpha WebP', async () => {
  const output = await convertSvgToWebp(transparentSvg, { width: 96, quality: 85 });
  const { data, info } = await sharp(output.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 96);
  assert.equal(info.height, 96);
  assert.ok(data[3] < 255, 'the corner pixel should remain transparent');
  assert.equal(output.alphaPreserved, true);
});

test('rejects active SVG content and remote references', () => {
  assert.throws(() => validateSvg('<svg onload="alert(1)"></svg>'), /active content/);
  assert.throws(() => validateSvg('<svg><image href="https://example.test/a.png"/></svg>'), /External references/);
  assert.throws(() => validateSvg('<!DOCTYPE svg SYSTEM "https://example.test/evil.dtd"><svg/>'), /DOCTYPE declarations/);
  assert.throws(() => validateSvg('<svg><image href="https&#x3a;//example.test/a.png"/></svg>'), /External references/);
  assert.throws(() => validateSvg('<svg><style>.x{fill:url(https\\3a //example.test/a)}</style></svg>'), /External references/);
  assert.throws(() => validateSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>'), /Custom XML entities/);
});

test('rejects extreme aspect ratios before rasterization', async () => {
  const tallSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="100000000"><rect width="1" height="100000000"/></svg>';
  await assert.rejects(convertSvgToWebp(tallSvg, { width: 4096 }), /dimensions exceed/);
});

test('detects raster formats and converts each supported raster input to every output', async () => {
  const raw = Buffer.from([
    255, 0, 0, 255, 0, 0, 0, 0,
    0, 255, 0, 255, 0, 0, 255, 255,
  ]);
  const source = sharp(raw, { raw: { width: 2, height: 2, channels: 4 } });
  const png = await source.clone().png().toBuffer();
  const jpeg = await source.clone().flatten({ background: '#fff' }).jpeg().toBuffer();
  const webp = await source.clone().webp({ lossless: true }).toBuffer();
  const avif = await source.clone().avif({ lossless: true }).toBuffer();
  const tiff = await source.clone().tiff({ compression: 'deflate' }).toBuffer();
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const inputs = [
    ['svg', Buffer.from(transparentSvg, 'utf8')], ['png', png], ['jpeg', jpeg], ['webp', webp], ['avif', avif], ['tiff', tiff], ['gif', gif],
  ];
  for (const [format, data] of inputs) {
    assert.equal(detectFormat(data), format);
    assert.equal((await inspectImage(data)).format, format);
    for (const to of ['webp', 'png', 'jpeg', 'avif']) {
      const options = { to, quality: 80, ...(to === 'jpeg' ? { background: '#fff' } : {}) };
      const converted = await convertImage(data, options);
      assert.equal(converted.format, to, `${format} → ${to}`);
      assert.ok(converted.size > 0, `${format} → ${to}`);
      if (['svg', 'png', 'webp', 'avif', 'tiff'].includes(format) && ['webp', 'png', 'avif'].includes(to)) {
        const { data: pixels } = await sharp(converted.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const hasTransparentPixel = format === 'svg' ? pixels[3] < 255 : pixels[7] < 255;
        assert.ok(hasTransparentPixel, `${format} → ${to} should retain the transparent pixel`);
      }
    }
  }
});

test('requires explicit flatten color when a transparent image is converted to JPEG', async () => {
  const rgba = sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const png = await rgba.png().toBuffer();
  await assert.rejects(
    convertImage(png, { to: 'jpeg' }),
    (err) => {
      assert.equal(err.code, 'E_ALPHA_NOT_REPRESENTABLE');
      assert.match(err.message, /cannot store transparency.*background color/i);
      return true;
    }
  );
  const output = await convertImage(png, { to: 'jpeg', background: '#ffffff' });
  assert.equal(output.alphaPreserved, false);
  assert.equal(output.backgroundStatus, 'flattened');
  assert.equal(output.transparency, 'flattened');
  assert.equal(output.flattenColor, '#ffffff');
  assert.equal((await sharp(output.data).metadata()).format, 'jpeg');
});

test('an explicit background flattens alpha for any output format', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const output = await convertImage(png, { to: 'webp', background: '#ffffff' });
  assert.equal(output.alphaPreserved, false);
  const { data } = await sharp(output.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 255);
  assert.ok(data[0] > 240 && data[1] > 240 && data[2] > 240);
});

test('decodeToRgba and encodeFromRgba provide raw pixel pipeline', async () => {
  const rawImage = await decodeToRgba(transparentSvg);
  assert.equal(rawImage.width > 0, true);
  assert.equal(rawImage.height > 0, true);
  assert.ok(rawImage.data instanceof Uint8ClampedArray);

  const encodedWebp = await encodeFromRgba(rawImage, { to: 'webp', quality: 90 });
  assert.ok(Buffer.isBuffer(encodedWebp));
  assert.ok(encodedWebp.length > 0);
  assert.equal(detectFormat(encodedWebp), 'webp');

  const convertedBytes = await convert(transparentSvg, { to: 'png' });
  assert.ok(Buffer.isBuffer(convertedBytes));
  assert.equal(convertedBytes.format, 'png');
  assert.equal(convertedBytes.alphaPreserved, true);
});

test('Clean Mode strips metadata, detects provenance, and generates clean certificates', async () => {
  const metadataSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><!-- c2pa manifest xmp:CreatorTool Adobe Firefly --><metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description/></rdf:RDF></metadata><circle cx="10" cy="10" r="5" fill="#f00"/></svg>';
  const meta = detectMetadata(Buffer.from(metadataSvg, 'utf8'));
  assert.equal(meta.hasMetadata, true);
  assert.equal(meta.xmp, true);
  assert.equal(meta.c2pa, true);
  assert.ok(meta.summary.length > 0);

  const converted = await convertImage(metadataSvg, { to: 'webp', clean: true, verify: true, assertAlpha: true });
  assert.equal(converted.clean, true);
  assert.ok(converted.certificate);
  assert.equal(converted.certificate.verified, true);
  assert.equal(converted.certificate.metadataChunks, 0);

  const cert = generateCleanCertificate(converted.data);
  assert.equal(cert.verified, true);
  assert.equal(cert.metadataChunks, 0);
  assert.ok(cert.sha256.length === 64);
});

test('verifyAlpha verifies transparent pixels', async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const check = await verifyAlpha(png);
  assert.equal(check.hasAlpha, true);
  assert.equal(check.alphaPreserved, true);

  const opaquePng = await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
  const opaqueCheck = await verifyAlpha(opaquePng);
  assert.equal(opaqueCheck.hasAlpha, false);
});

test('auditConversionCommand identifies alpha loss and recommends safe Zap commands', () => {
  const unsafe1 = auditConversionCommand('magick icon.svg icon.webp');
  assert.equal(unsafe1.safe, false);
  assert.ok(unsafe1.issues.some((i) => i.includes('-background none')));
  assert.ok(unsafe1.recommendedCommand.includes('zap "icon.svg" --to webp --clean'));

  const unsafe2 = auditConversionCommand('cwebp icon.svg -o icon.webp');
  assert.equal(unsafe2.safe, false);
  assert.ok(unsafe2.issues.some((i) => i.includes('cannot decode vector SVG')));

  const unsafe3 = auditConversionCommand('convert logo.svg logo.jpg');
  assert.equal(unsafe3.safe, false);
  assert.ok(unsafe3.issues.some((i) => i.includes('cannot store transparency')));
});

test('explainBlackBackground returns root cause and remedy', () => {
  const explanation = explainBlackBackground();
  assert.ok(explanation.cause.length > 0);
  assert.ok(explanation.technicalDetails.length >= 3);
  assert.ok(explanation.remedy.length > 0);
  assert.ok(explanation.zapSolution.includes('zap'));
});

test('parseScales, scaleSuffix, outputName, and generateSrcset provide multiplier tooling', () => {
  assert.deepEqual(parseScales(), [1]);
  assert.deepEqual(parseScales('1, 2, 3'), [1, 2, 3]);
  assert.deepEqual(parseScales([3, 1, 2, 2]), [1, 2, 3]);
  assert.throws(() => parseScales('0'), /positive number/);
  assert.throws(() => parseScales('-1'), /positive number/);

  assert.equal(scaleSuffix(1), '');
  assert.equal(scaleSuffix(2), '@2x');
  assert.equal(scaleSuffix(3), '@3x');
  assert.equal(scaleSuffix(2.5), '@2.5x');

  assert.equal(outputName('icons/logo.svg', 'webp', 1), 'logo.webp');
  assert.equal(outputName('icons/logo.svg', 'webp', 2), 'logo@2x.webp');
  assert.equal(outputName('icons/logo.svg', 'jpeg', 3), 'logo@3x.jpg');

  const srcset = generateSrcset('logo.svg', [1, 2, 3], 'webp');
  assert.equal(srcset, '<img src="logo.webp" srcset="logo.webp 1x, logo@2x.webp 2x, logo@3x.webp 3x" alt="">');
});

test('Target Lock: forces target format, enforces strict contract, and permits override', async () => {
  const transparentPng = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
  }).png().toBuffer();

  // 1. Target lock forces output to webp even if to: 'png' is requested
  const lockedRes = await convertImage(transparentPng, { lockTarget: 'webp', to: 'png' });
  assert.equal(lockedRes.format, 'webp');
  assert.equal(lockedRes.targetLockEnforced, true);
  assert.equal(lockedRes.targetLockBypassed, false);

  // 2. Opt-in overrideLock permits bypassing lock
  const bypassRes = await convertImage(transparentPng, { lockTarget: 'webp', to: 'avif', overrideLock: true });
  assert.equal(bypassRes.format, 'avif');
  assert.equal(bypassRes.targetLockEnforced, false);
  assert.equal(bypassRes.targetLockBypassed, true);

  // 3. Strict mode (default) rejects unconvertible bytes with E_UNSUPPORTED_FORMAT
  const fakeBytes = Buffer.from('RIFF_CORRUPT_BYTES_DATA_STREAM');
  await assert.rejects(
    async () => {
      await convertImage(fakeBytes, { lockTarget: 'webp', strict: true });
    },
    (err) => {
      assert.equal(err.code, 'E_UNSUPPORTED_FORMAT');
      assert.equal(err.target, 'webp');
      assert.ok(err.fix.includes('Upload a supported format'));
      return true;
    }
  );

  // 4. Non-strict mode passes unconvertible bytes through
  const passThrough = await convertImage(fakeBytes, { lockTarget: 'webp', strict: false });
  assert.equal(passThrough.passedThrough, true);
  assert.equal(passThrough.size, fakeBytes.length);
});

test('Conversion Policy: pre-decode maxInputBytes, format filtering, and iterative maxOutputBytes', async () => {
  const samplePng = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 128, b: 255, alpha: 1 } },
  }).png().toBuffer();

  // 1. Pre-decode maxInputBytes guard
  await assert.rejects(
    async () => {
      await convertImage(samplePng, {
        policy: { limits: { maxInputBytes: 50 } },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_INPUT_TOO_LARGE');
      assert.ok(err.maxBytes === 50);
      assert.ok(err.suggestedFix);
      return true;
    }
  );

  // 2. Format rejection via policy.formats.reject
  await assert.rejects(
    async () => {
      await convertImage(samplePng, {
        policy: { formats: { reject: ['png'] } },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_FORMAT_REJECTED');
      assert.equal(err.detected, 'png');
      assert.ok(err.suggestedFix);
      return true;
    }
  );

  // 3. Format rejection via policy.formats.accept allowlist
  await assert.rejects(
    async () => {
      await convertImage(samplePng, {
        policy: { formats: { accept: ['jpeg', 'webp'] } },
      });
    },
    (err) => {
      assert.equal(err.code, 'E_FORMAT_REJECTED');
      assert.equal(err.detected, 'png');
      return true;
    }
  );

  // 4. Successful conversion with policy echo
  const converted = await convertImage(samplePng, {
    to: 'webp',
    policy: {
      quality: { mode: 'lossy', default: 80, perFormat: { webp: 77 } },
      limits: { maxOutputBytes: 100000 },
      formats: { accept: ['png', 'webp'] },
    },
  });

  assert.equal(converted.format, 'webp');
  assert.ok(converted.policy);
  assert.equal(converted.policy.quality.used, 77);
  assert.equal(converted.policy.quality.mode, 'lossy');
  assert.ok(converted.size <= 100000);
});
