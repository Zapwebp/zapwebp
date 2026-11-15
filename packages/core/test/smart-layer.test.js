'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/index');
const { cropTransform } = require('../../../packages/crop/src/index');

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#8dc63f"/></svg>';
const TEXT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="40" font-size="30">Hello World</text></svg>';

test('Smart Layer: inspect returns content signals, palette, and suggestions', async () => {
  const result = await core.inspect(SAMPLE_SVG);

  // 1. Content signals
  assert.ok(result.content, 'inspect must return content signals');
  assert.equal(typeof result.content.edgeDensity, 'number');
  assert.equal(typeof result.content.colorCount, 'number');
  assert.equal(typeof result.content.sharpness, 'number');
  assert.equal(typeof result.content.luminanceMean, 'number');
  assert.equal(typeof result.content.luminanceVariance, 'number');
  assert.equal(typeof result.content.transparencyCoverage, 'number');
  assert.ok(
    ['photo', 'icon', 'screenshot', 'logo', 'diagram', 'text'].includes(result.content.estimatedType),
    `Invalid estimatedType: ${result.content.estimatedType}`
  );
  assert.equal(typeof result.content.estimatedTypeConfidence, 'number');
  assert.ok(result.content.estimatedTypeConfidence >= 0 && result.content.estimatedTypeConfidence <= 1);

  // 2. Palette
  assert.ok(result.palette, 'inspect must return palette');
  assert.match(result.palette.dominant, /^#[0-9a-f]{6}$/i, 'Dominant color must be hex');
  assert.ok(Array.isArray(result.palette.colors));
  assert.ok(result.palette.colors.length > 0);
  assert.equal(typeof result.palette.colors[0].percentage, 'number');

  // 3. Suggestions
  assert.ok(Array.isArray(result.suggestions), 'inspect must return suggestions');
  assert.ok(result.suggestions.length > 0);
  const first = result.suggestions[0];
  assert.ok(['webp', 'avif', 'png', 'jpeg'].includes(first.to));
  assert.equal(typeof first.quality, 'number');
  assert.equal(typeof first.lossless, 'boolean');
  assert.equal(typeof first.reason, 'string');
  assert.equal(typeof first.expectedBytes, 'number');
  assert.equal(typeof first.expectedSavings, 'number');
});

test('Smart Layer: heuristic classification recognizes vector text and icons', async () => {
  const iconInfo = await core.inspect(SAMPLE_SVG);
  assert.ok(
    ['icon', 'logo', 'diagram'].includes(iconInfo.content.estimatedType),
    `Expected icon/logo/diagram, got: ${iconInfo.content.estimatedType}`
  );

  const textInfo = await core.inspect(TEXT_SVG);
  assert.equal(textInfo.content.estimatedType, 'text');
  assert.ok(textInfo.content.estimatedTypeConfidence >= 0.85);
});

test('Smart Layer: suggest() returns contextual recommendations per use case', async () => {
  const info = await core.inspect(SAMPLE_SVG);

  // Icon use case
  const iconSuggestions = core.suggest(info, 'icon');
  assert.ok(iconSuggestions.length >= 2);
  assert.equal(iconSuggestions[0].to, 'webp');
  assert.ok(iconSuggestions[0].reason.toLowerCase().includes('icon'));

  // Photo use case
  const photoSuggestions = core.suggest(info, 'photo');
  assert.ok(photoSuggestions.length >= 2);
  assert.equal(photoSuggestions[0].to, 'avif');
  assert.ok(photoSuggestions[0].reason.toLowerCase().includes('photo'));

  // Hero banner use case
  const heroSuggestions = core.suggest(info, 'hero');
  assert.ok(heroSuggestions.length >= 2);
  assert.ok(heroSuggestions[0].quality >= 80);
});

test('Smart Layer: customMetadata roundtrips across WebP', async () => {
  const custom = {
    'ai:model': 'gpt-4o',
    'ai:confidence': 0.98,
    'ai:tags': 'vector, square, green',
  };

  const outputWebp = await core.convert(SAMPLE_SVG, {
    to: 'webp',
    customMetadata: custom,
  });

  const inspection = await core.inspect(outputWebp);
  assert.ok(inspection.metadata);
  assert.ok(inspection.metadata.custom, 'Custom metadata must be extracted from WebP');
  assert.equal(inspection.metadata.custom['ai:model'], 'gpt-4o');
  assert.equal(inspection.metadata.custom['ai:confidence'], 0.98);
  assert.equal(inspection.metadata.custom['ai:tags'], 'vector, square, green');
});

test('Smart Layer: customMetadata roundtrips across PNG', async () => {
  const custom = {
    'ai:prompt': 'A green icon',
    'ai:version': 2,
  };

  const outputPng = await core.convert(SAMPLE_SVG, {
    to: 'png',
    customMetadata: custom,
  });

  const inspection = await core.inspect(outputPng);
  assert.ok(inspection.metadata);
  assert.ok(inspection.metadata.custom, 'Custom metadata must be extracted from PNG');
  assert.equal(inspection.metadata.custom['ai:prompt'], 'A green icon');
  assert.equal(inspection.metadata.custom['ai:version'], 2);
});

test('Smart Layer: customMetadata roundtrips across JPEG', async () => {
  const custom = {
    'ai:altText': 'A vivid green square icon with flat lighting',
    'ai:model': 'claude-3-5-sonnet',
  };

  const outputJpeg = await core.convert(SAMPLE_SVG, {
    to: 'jpeg',
    background: '#ffffff',
    customMetadata: custom,
  });

  const inspection = await core.inspect(outputJpeg);
  assert.ok(inspection.metadata);
  assert.ok(inspection.metadata.custom, 'Custom metadata must be extracted from JPEG');
  assert.equal(inspection.metadata.custom['ai:altText'], 'A vivid green square icon with flat lighting');
  assert.equal(inspection.metadata.custom['ai:model'], 'claude-3-5-sonnet');
});

test('Smart Layer: developer batch pipeline with model-in-the-loop simulation', async () => {
  // Simulates a developer's vision model pipeline
  const files = [
    { name: 'logo.svg', bytes: Buffer.from(SAMPLE_SVG) },
    { name: 'heading.svg', bytes: Buffer.from(TEXT_SVG) },
  ];

  // Developer's simulated vision model
  const mockVisionModel = {
    async decide(info) {
      if (info.content.estimatedType === 'text') {
        return { to: 'png', customMetadata: { 'ai:detected': 'text' } };
      }
      return { to: 'webp', quality: 90, customMetadata: { 'ai:detected': 'icon' } };
    },
  };

  const pipelineOutputs = [];
  for (const file of files) {
    const info = await core.inspect(file.bytes);
    const decision = await mockVisionModel.decide(info);
    const converted = await core.convert(file.bytes, decision);
    pipelineOutputs.push({ name: file.name, converted, decision });
  }

  assert.equal(pipelineOutputs.length, 2);
  assert.equal(pipelineOutputs[0].converted.format, 'webp');
  assert.equal(pipelineOutputs[1].converted.format, 'png');

  const inspected1 = await core.inspect(pipelineOutputs[0].converted);
  assert.equal(inspected1.metadata.custom['ai:detected'], 'icon');
  const inspected2 = await core.inspect(pipelineOutputs[1].converted);
  assert.equal(inspected2.metadata.custom['ai:detected'], 'text');
});

test('Smart Layer: developer AI-driven manual crop integration', async () => {
  // Simulates developer's vision model returning bounding box coordinates
  const simulatedModel = {
    findSubject(width, height) {
      // Model found subject at box
      return { x: 10, y: 10, width: 24, height: 24 };
    },
  };

  const info = await core.inspect(SAMPLE_SVG);
  const cropBox = simulatedModel.findSubject(info.width, info.height);

  const croppedOutput = await core.convert(SAMPLE_SVG, {
    to: 'webp',
    transforms: [
      cropTransform({
        mode: 'manual',
        x: cropBox.x,
        y: cropBox.y,
        width: cropBox.width,
        height: cropBox.height,
      }),
    ],
  });

  const croppedInfo = await core.inspect(croppedOutput);
  assert.equal(croppedInfo.width, 24);
  assert.equal(croppedInfo.height, 24);
  assert.equal(croppedInfo.format, 'webp');
});
