'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAspectRatio,
  calculateCropBox,
  cropImage,
  cropTransform,
  detectFaceBounds,
  detectSubject,
  detectBody,
  detectObject,
  padBounds,
  computeCropRect,
  CROP_PRESETS,
  BODY_PRESETS,
} = require('../src/index');
const { convertImage } = require('@zapwebp/core');

function createSolidRawImage(width, height, r = 255, g = 0, b = 0, a = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { data, width, height };
}

test('parseAspectRatio: parses string, object, and numeric ratios correctly', () => {
  assert.equal(parseAspectRatio('16:9'), 16 / 9);
  assert.equal(parseAspectRatio('1/1'), 1);
  assert.equal(parseAspectRatio('4:5'), 0.8);
  assert.equal(parseAspectRatio({ width: 21, height: 9 }), 21 / 9);
  assert.equal(parseAspectRatio(2.5), 2.5);

  assert.throws(() => parseAspectRatio('invalid'), /Unrecognized aspect ratio format/);
  assert.throws(() => parseAspectRatio(-1), /Invalid numeric aspect ratio/);
});

test('calculateCropBox: auto-crop cover computes correct dimensions and clamps', async () => {
  // 1920x1080 to 1:1 -> 1080x1080, centered
  const box1 = await calculateCropBox(1920, 1080, { aspectRatio: '1:1', gravity: 'center' });
  assert.equal(box1.width, 1080);
  assert.equal(box1.height, 1080);
  assert.equal(box1.x, (1920 - 1080) / 2);
  assert.equal(box1.y, 0);

  // 1080x1920 to 16:9 -> 1080x608 with top gravity
  const box2 = await calculateCropBox(1080, 1920, { aspectRatio: '16:9', gravity: 'top' });
  assert.equal(box2.width, 1080);
  assert.equal(box2.height, Math.round(1080 / (16 / 9)));
  assert.equal(box2.x, 0);
  assert.equal(box2.y, 0);

  // Bottom gravity
  const box3 = await calculateCropBox(1080, 1920, { aspectRatio: '16:9', gravity: 'bottom' });
  assert.equal(box3.x, 0);
  assert.equal(box3.y, 1920 - box3.height);
});

test('calculateCropBox: manual crop supports pixel and percentage coordinates with clamping', async () => {
  // Pixels
  const box1 = await calculateCropBox(100, 100, { mode: 'manual', x: 10, y: 20, width: 50, height: 40 });
  assert.deepEqual(box1, { mode: 'manual', fit: 'cover', x: 10, y: 20, width: 50, height: 40 });

  // Percentages (< 1)
  const box2 = await calculateCropBox(200, 100, { mode: 'manual', x: 0.1, y: 0.2, width: 0.5, height: 0.5 });
  assert.deepEqual(box2, { mode: 'manual', fit: 'cover', x: 20, y: 20, width: 100, height: 50 });

  // Out of bounds clamped
  const box3 = await calculateCropBox(100, 100, { mode: 'manual', x: 80, y: 80, width: 50, height: 50 });
  assert.equal(box3.x, 80);
  assert.equal(box3.y, 80);
  assert.equal(box3.width, 20);
  assert.equal(box3.height, 20);

  // Empty crop throws E_CROP_EMPTY
  await assert.rejects(
    () => calculateCropBox(100, 100, { mode: 'manual', x: 100, y: 100, width: 0, height: 0 }),
    /E_CROP_EMPTY/
  );
});

test('cropImage: auto-crop cover slices pixel buffer and preserves transparency', async () => {
  const width = 100;
  const height = 50;
  // Transparent image with a blue center
  const img = createSolidRawImage(width, height, 0, 0, 0, 0);
  // Mark center pixel as translucent blue
  const centerIdx = (25 * width + 50) * 4;
  img.data[centerIdx] = 0;
  img.data[centerIdx + 1] = 120;
  img.data[centerIdx + 2] = 255;
  img.data[centerIdx + 3] = 180;

  // Crop to 1:1 -> 50x50 centered
  const cropped = await cropImage(img, { aspectRatio: '1:1', gravity: 'center' });
  assert.equal(cropped.width, 50);
  assert.equal(cropped.height, 50);
  assert.equal(cropped.data.length, 50 * 50 * 4);

  // The center pixel at (50, 25) in source maps to (25, 25) in cropped (since x starts at 25)
  const croppedCenterIdx = (25 * 50 + 25) * 4;
  assert.equal(cropped.data[croppedCenterIdx], 0);
  assert.equal(cropped.data[croppedCenterIdx + 1], 120);
  assert.equal(cropped.data[croppedCenterIdx + 2], 255);
  assert.equal(cropped.data[croppedCenterIdx + 3], 180);
});

test('cropImage: contain fit letterboxes with background color', async () => {
  const img = createSolidRawImage(100, 100, 255, 0, 0, 255);
  // Fit 1:1 into 16:9 -> outWidth = 100 * (16/9) = 178, outHeight = 100
  const letterboxed = await cropImage(img, {
    aspectRatio: '16:9',
    fit: 'contain',
    background: '#00ff00',
  });

  assert.equal(letterboxed.width, Math.round(100 * (16 / 9)));
  assert.equal(letterboxed.height, 100);

  // Left-most pixel should be the green background padding
  assert.equal(letterboxed.data[0], 0);
  assert.equal(letterboxed.data[1], 255);
  assert.equal(letterboxed.data[2], 0);
  assert.equal(letterboxed.data[3], 255);

  // Center pixel should be the original red image
  const centerIdx = (50 * letterboxed.width + Math.round(letterboxed.width / 2)) * 4;
  assert.equal(letterboxed.data[centerIdx], 255);
  assert.equal(letterboxed.data[centerIdx + 1], 0);
  assert.equal(letterboxed.data[centerIdx + 2], 0);
  assert.equal(letterboxed.data[centerIdx + 3], 255);
});

test('detectFaceBounds: detects face cluster and falls back to null gracefully', async () => {
  // Empty image -> null
  const plain = createSolidRawImage(100, 100, 0, 0, 255, 255);
  const faceNone = await detectFaceBounds(plain);
  assert.equal(faceNone, null);

  // Image with skin-tone block
  const faceImg = createSolidRawImage(100, 100, 0, 0, 0, 255);
  for (let y = 30; y < 60; y++) {
    for (let x = 40; x < 70; x++) {
      const idx = (y * 100 + x) * 4;
      faceImg.data[idx] = 220; // R
      faceImg.data[idx + 1] = 160; // G
      faceImg.data[idx + 2] = 120; // B
      faceImg.data[idx + 3] = 255;
    }
  }

  const faceDetected = await detectFaceBounds(faceImg);
  assert.ok(faceDetected);
  assert.ok(faceDetected.width > 0);
  assert.ok(faceDetected.height > 0);
});

test('padBounds: percentage expansion respects boundaries', () => {
  const bounds = { x: 20, y: 20, width: 40, height: 40 };
  const padded10 = padBounds(bounds, 0.1, 100, 100);
  assert.equal(padded10.x, 16);
  assert.equal(padded10.y, 16);
  assert.equal(padded10.width, 48);
  assert.equal(padded10.height, 48);

  // Boundary clamp
  const cornerBounds = { x: 2, y: 2, width: 96, height: 96 };
  const paddedClamp = padBounds(cornerBounds, 0.2, 100, 100);
  assert.equal(paddedClamp.x, 0);
  assert.equal(paddedClamp.y, 0);
  assert.equal(paddedClamp.width, 100);
  assert.equal(paddedClamp.height, 100);
});

test('computeCropRect: anchors crop box on subject center and clamps', () => {
  const bounds = { x: 70, y: 70, width: 20, height: 20 };
  const rect = computeCropRect(bounds, 1, 100, 100);
  assert.ok(rect.width > 0);
  assert.ok(rect.height > 0);
  assert.ok(rect.x >= 0 && rect.x + rect.width <= 100);
  assert.ok(rect.y >= 0 && rect.y + rect.height <= 100);
  // Center should be near (80, 80)
  assert.ok(rect.x + rect.width / 2 >= 60);
});

test('detectSubject & mode: subject: performs algorithmic attention and entropy saliency analysis', async () => {
  // Create an image with high-contrast focal region in bottom-right
  const img = createSolidRawImage(120, 120, 30, 30, 30, 255);
  for (let y = 70; y < 110; y++) {
    for (let x = 70; x < 110; x++) {
      const idx = (y * 120 + x) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 220;
      img.data[idx + 2] = 0;
      img.data[idx + 3] = 255;
    }
  }

  const attentionRes = await detectSubject(img, 'attention', 1);
  assert.ok(attentionRes.bounds);
  assert.equal(attentionRes.strategy, 'attention');
  assert.ok(attentionRes.confidence > 0);

  const entropyRes = await detectSubject(img, 'entropy', 1);
  assert.ok(entropyRes.bounds);
  assert.equal(entropyRes.strategy, 'entropy');

  // Crop via mode: 'subject'
  const cropped = await cropImage(img, {
    mode: 'subject',
    strategy: 'attention',
    aspectRatio: '1:1',
    padding: 0.1,
  });

  assert.ok(cropped.width > 0);
  assert.ok(cropped.height > 0);
  assert.equal(cropped.metadata.mode, 'subject');
  assert.equal(cropped.metadata.detection.strategy, 'attention');
});

test('detectBody & mode: body: handles presets and falls back gracefully to subject', async () => {
  assert.ok(BODY_PRESETS.head);
  assert.ok(BODY_PRESETS['head-shoulders']);
  assert.ok(BODY_PRESETS['upper-body']);
  assert.ok(BODY_PRESETS['full-body']);

  // Solid dark image has no human person -> should cleanly fall back to subject
  const plain = createSolidRawImage(100, 100, 10, 10, 10, 255);
  const cropped = await cropImage(plain, {
    mode: 'body',
    bodyPreset: 'upper-body',
    aspectRatio: '1:1',
  });

  assert.equal(cropped.metadata.mode, 'body');
  assert.ok(cropped.metadata.fallback);
  assert.equal(cropped.metadata.fallback.fallback, 'subject');
  assert.match(cropped.metadata.fallback.reason, /No person detected/);
  assert.ok(cropped.width > 0);
  assert.ok(cropped.height > 0);
});

test('detectObject & mode: object: handles object detection and fallback', async () => {
  // Plain image with no object contrast -> falls back to subject
  const plain = createSolidRawImage(100, 100, 50, 50, 50, 255);
  const cropped = await cropImage(plain, {
    mode: 'object',
    aspectRatio: '1:1',
    selectLargest: true,
  });

  assert.equal(cropped.metadata.mode, 'object');
  assert.ok(cropped.metadata.fallback);
  assert.equal(cropped.metadata.fallback.fallback, 'subject');
  assert.match(cropped.metadata.fallback.reason, /No matching objects/);

  // Image with distinct object block
  const objImg = createSolidRawImage(120, 120, 255, 255, 255, 255);
  for (let y = 40; y < 80; y++) {
    for (let x = 40; x < 80; x++) {
      const idx = (y * 120 + x) * 4;
      objImg.data[idx] = 10;
      objImg.data[idx + 1] = 10;
      objImg.data[idx + 2] = 200;
      objImg.data[idx + 3] = 255;
    }
  }

  const objRes = await detectObject(objImg, { minConfidence: 0.3 });
  assert.ok(objRes);
  assert.ok(objRes.bounds);
  assert.ok(objRes.detection.confidence > 0);

  const croppedObj = await cropImage(objImg, {
    mode: 'object',
    aspectRatio: '1:1',
  });
  assert.equal(croppedObj.metadata.mode, 'object');
  assert.ok(croppedObj.metadata.detection);
});

test('cropTransform: integrates with convertImage pipeline and attaches report metadata', async () => {
  // 100x50 transparent PNG with an SVG header
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
    <rect width="200" height="100" fill="transparent"/>
    <circle cx="100" cy="50" r="40" fill="#ff5500"/>
  </svg>`;

  const step = cropTransform({ aspectRatio: '1:1', gravity: 'center' });
  const result = await convertImage(Buffer.from(svg), {
    to: 'webp',
    transforms: [step],
  });

  assert.equal(result.format, 'webp');
  assert.equal(result.width, result.height, 'Output must be square 1:1');
  assert.ok(result.transforms, 'Result must contain transforms array');
  assert.equal(result.transforms.length, 1);
  assert.equal(result.transforms[0].name, 'crop');
  assert.equal(result.transforms[0].mode, 'auto');
  assert.equal(result.transforms[0].aspectRatio, '1:1');
});

test('CROP_PRESETS: exports all 5 platform presets', () => {
  assert.ok(CROP_PRESETS.avatar);
  assert.ok(CROP_PRESETS.thumbnail);
  assert.ok(CROP_PRESETS.banner);
  assert.ok(CROP_PRESETS.product);
  assert.ok(CROP_PRESETS.story);
});
