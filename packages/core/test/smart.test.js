'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  analyzeSmart,
  classifyContentType,
  extractSmartSignals,
  convertImage,
  inspectImage,
  RECOMMENDATION_PROFILES,
} = require('../src/index');

const FIXTURES_DIR = path.resolve(__dirname, '../../../test/fixtures');

test('Smart Optimization: classifies icons and recommends lossless WebP', async () => {
  const iconPath = path.join(FIXTURES_DIR, 'svg', 'tabler-home.svg');
  if (!fs.existsSync(iconPath)) return;

  const svgData = fs.readFileSync(iconPath);
  const info = await inspectImage(svgData);

  assert.ok(info.smart);
  assert.equal(info.smart.detectedType, 'icon');
  assert.equal(info.smart.recommendation.format, 'webp');
  assert.equal(info.smart.recommendation.lossless, true);
  assert.ok(info.smart.recommendation.explanation.includes('Detected: icon'));
});

test('Smart Optimization: classifies photos and recommends AVIF at quality 55-60', async () => {
  const photoPath = path.join(FIXTURES_DIR, 'jpg', 'unsplash-thumb.jpg');
  if (!fs.existsSync(photoPath)) return;

  const jpgData = fs.readFileSync(photoPath);
  const info = await inspectImage(jpgData);

  assert.ok(info.smart);
  assert.ok(['photo', 'thumbnail', 'hero'].includes(info.smart.detectedType));
  assert.ok(['avif', 'webp'].includes(info.smart.recommendation.format));
  assert.equal(info.smart.recommendation.lossless, false);
});

test('Smart Optimization: convertImage with { smart: true } automatically selects format & quality', async () => {
  const iconPath = path.join(FIXTURES_DIR, 'svg', 'lucide-menu.svg');
  if (!fs.existsSync(iconPath)) return;

  const svgData = fs.readFileSync(iconPath);
  const res = await convertImage(svgData, { smart: true });

  assert.equal(res.format, 'webp');
  assert.equal(res.lossless, true);
  assert.ok(res.smart);
  assert.equal(res.smart.detectedType, 'icon');
});

test('Smart Optimization: classifyContentType handles all 10 defined types', () => {
  // 1. Banner
  assert.equal(classifyContentType({ width: 1200, height: 400, colorCount: 500, alphaCoverage: 0 }), 'banner');

  // 2. Hero
  assert.equal(classifyContentType({ width: 1920, height: 1080, colorCount: 800, alphaCoverage: 0 }), 'hero');

  // 3. Thumbnail
  assert.equal(classifyContentType({ width: 200, height: 200, colorCount: 300, alphaCoverage: 0 }), 'thumbnail');

  // 4. Icon
  assert.equal(classifyContentType({ width: 64, height: 64, colorCount: 8, edgeDensity: 0.1, alphaCoverage: 0.5 }), 'icon');

  // 5. Logo
  assert.equal(classifyContentType({ width: 400, height: 150, colorCount: 32, edgeDensity: 0.08, alphaCoverage: 0.2 }), 'logo');

  // 6. Photo with Text
  assert.equal(classifyContentType({ width: 800, height: 600, colorCount: 600, photoDetected: true, textDetected: true }), 'photo_text');

  // 7. Graphic with Alpha
  assert.equal(classifyContentType({ width: 800, height: 600, colorCount: 250, alphaCoverage: 0.35 }), 'graphic_alpha');

  // 8. Screenshot
  assert.equal(classifyContentType({ width: 1024, height: 768, colorCount: 400, edgeDensity: 0.2, photoDetected: false }), 'screenshot');

  // 9. Diagram
  assert.equal(classifyContentType({ width: 800, height: 600, colorCount: 80, edgeDensity: 0.06, alphaCoverage: 0 }), 'diagram');

  // 10. Photo default
  assert.equal(classifyContentType({ width: 800, height: 600, colorCount: 1000, alphaCoverage: 0, gradientSmoothness: 0.8 }), 'photo');
});
