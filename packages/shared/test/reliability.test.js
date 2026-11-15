'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { reliability } = require('../src/index.js');

test('Shared Reliability: GOLDEN_CASES contains 50 comprehensive cases', () => {
  assert.ok(Array.isArray(reliability.GOLDEN_CASES));
  assert.equal(reliability.GOLDEN_CASES.length, 50);

  for (const c of reliability.GOLDEN_CASES) {
    assert.ok(c.id, 'Every golden case must have an id');
    assert.ok(c.name, 'Every golden case must have a name');
    assert.ok(c.input, 'Every golden case must have input data');
    assert.ok(c.options && c.options.to, 'Every golden case must specify options.to');
  }
});

test('Shared Reliability: verifyGoldenCase executes and computes SHA-256', async () => {
  const sampleCase = reliability.GOLDEN_CASES[0];
  const mockConvert = async () => Buffer.from('mock output bytes');

  const result = await reliability.verifyGoldenCase(sampleCase, mockConvert);
  assert.equal(result.id, sampleCase.id);
  assert.equal(typeof result.sha256, 'string');
  assert.equal(result.sha256.length, 64);
  assert.equal(result.passed, true);
});

test('Shared Reliability: ADVERSARIAL_FIXTURES catalog includes all attack categories', () => {
  const keys = Object.keys(reliability.ADVERSARIAL_FIXTURES);
  assert.ok(keys.includes('billion-laughs'));
  assert.ok(keys.includes('script-injection'));
  assert.ok(keys.includes('external-ref'));
  assert.ok(keys.includes('decompression-bomb'));
  assert.ok(keys.includes('path-traversal'));
  assert.ok(keys.includes('corrupt-header'));
});

test('Shared Reliability: verifyAdversarialRejection verifies secure rejection', async () => {
  const runner = async () => {
    const err = new Error('Active script rejected');
    err.code = 'E_UNSAFE_SVG';
    throw err;
  };

  const result = await reliability.verifyAdversarialRejection('script-injection', runner);
  assert.equal(result.rejected, true);
  assert.equal(result.errorCode, 'E_UNSAFE_SVG');
  assert.equal(result.passed, true);
});

test('Shared Reliability: runSoakTest enforces RSS memory growth limit', async () => {
  let counter = 0;
  const runner = async () => {
    counter++;
  };

  const result = await reliability.runSoakTest(runner, {
    iterations: 20,
    maxRssGrowthMb: 50,
    name: 'test-soak',
  });

  assert.equal(counter, 20);
  assert.equal(result.iterations, 20);
  assert.equal(result.leakDetected, false);
  assert.equal(result.passed, true);
});

test('Shared Reliability: RELIABILITY_METRICS covers all 7 integrations with dashboard formatting', () => {
  assert.equal(reliability.RELIABILITY_METRICS.length, 7);
  const ids = reliability.RELIABILITY_METRICS.map((m) => m.id);
  assert.ok(ids.includes('vite'));
  assert.ok(ids.includes('next'));
  assert.ok(ids.includes('github-action'));
  assert.ok(ids.includes('storage'));
  assert.ok(ids.includes('laravel'));
  assert.ok(ids.includes('lens'));
  assert.ok(ids.includes('crop'));

  const summary = reliability.getReliabilitySummary();
  assert.equal(summary.totalIntegrations, 7);
  assert.ok(summary.averageUptime >= 99.8);
  assert.equal(summary.allPassing, true);

  const table = reliability.formatReliabilityTable();
  assert.ok(table.includes('Vite Plugin'));
  assert.ok(table.includes('Next.js Plugin'));
  assert.ok(table.includes('GitHub Action'));
  assert.ok(table.includes('Storage Adapters'));
  assert.ok(table.includes('Laravel Package'));
  assert.ok(table.includes('Lens CLI'));
  assert.ok(table.includes('Crop Plugin'));
  assert.ok(table.includes('Ecosystem Summary'));
});
