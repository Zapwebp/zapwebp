'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computePerformanceReport,
  formatPerformanceReport,
} = require('../src/index');

test('Performance Reports: computePerformanceReport calculates exact aggregates and carbon offset', () => {
  const transactions = [
    {
      id: 'tx-1',
      startedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
      status: 'completed',
      operations: [
        {
          type: 'create',
          path: 'public/images/hero-4k.webp',
          inputPath: 'src/hero-4k.jpg',
          inputBytes: 12400000,
          bytes: 340000,
          format: 'webp',
          durationMs: 45,
        },
        {
          type: 'create',
          path: 'public/images/product-23.avif',
          inputPath: 'src/product-23.png',
          inputBytes: 8200000,
          bytes: 180000,
          format: 'avif',
          durationMs: 38,
        },
      ],
    },
    {
      id: 'tx-2',
      startedAt: '2026-11-01T12:00:00.000Z',
      finishedAt: '2026-11-01T12:00:01.000Z',
      status: 'completed',
      operations: [
        {
          type: 'create',
          path: 'content/banner-wide.avif',
          inputPath: 'content/banner-wide.jpg',
          inputBytes: 4100000,
          bytes: 210000,
          format: 'avif',
          durationMs: 40,
        },
      ],
    },
    {
      id: 'tx-3-undone',
      startedAt: '2026-11-02T12:00:00.000Z',
      status: 'undone',
      operations: [
        {
          type: 'create',
          path: 'public/images/undone.webp',
          inputBytes: 1000000,
          bytes: 50000,
        },
      ],
    },
  ];

  const report = computePerformanceReport(transactions);

  assert.equal(report.totalFiles, 3, 'Undone transactions must be excluded');
  assert.equal(report.originalBytes, 12400000 + 8200000 + 4100000);
  assert.equal(report.optimizedBytes, 340000 + 180000 + 210000);
  assert.equal(report.savedBytes, report.originalBytes - report.optimizedBytes);
  assert.ok(report.savedPercentage > 95, 'Savings percentage should be calculated');
  assert.ok(report.avgLatencyMs > 0);

  // Carbon metrics
  assert.ok(report.carbon.gbSaved > 0);
  assert.ok(report.carbon.wh > 0);
  assert.ok(report.carbon.co2Kg >= 0);

  // Top savings
  assert.equal(report.topSavings.length, 3);
  assert.equal(report.topSavings[0].fileName, 'hero-4k.webp');
  assert.equal(report.topSavings[1].fileName, 'product-23.avif');

  // Format breakdown
  assert.equal(report.byFormat.length, 2);
  const avifBucket = report.byFormat.find((f) => f.format === 'avif');
  assert.equal(avifBucket.count, 2);

  // Source directory breakdown
  assert.ok(report.bySource.length >= 2);
});

test('Performance Reports: timeframe filtering with --since', () => {
  const transactions = [
    {
      id: 'old-tx',
      startedAt: '2026-01-01T00:00:00.000Z',
      status: 'completed',
      operations: [
        { type: 'create', path: 'old.webp', inputBytes: 1000, bytes: 500 },
      ],
    },
    {
      id: 'recent-tx',
      startedAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      status: 'completed',
      operations: [
        { type: 'create', path: 'recent.webp', inputBytes: 2000, bytes: 400 },
      ],
    },
  ];

  const report = computePerformanceReport(transactions, { since: '7 days ago' });
  assert.equal(report.totalFiles, 1);
  assert.equal(report.items[0].fileName, 'recent.webp');
});

test('Performance Reports: path prefix filtering', () => {
  const transactions = [
    {
      id: 'tx-1',
      startedAt: new Date().toISOString(),
      status: 'completed',
      operations: [
        { type: 'create', path: 'public/images/icon.webp', inputBytes: 1000, bytes: 200 },
        { type: 'create', path: 'content/docs/figure.webp', inputBytes: 5000, bytes: 1000 },
      ],
    },
  ];

  const report = computePerformanceReport(transactions, { path: 'public/images' });
  assert.equal(report.totalFiles, 1);
  assert.equal(report.items[0].fileName, 'icon.webp');
});

test('Performance Reports: formatting in table, markdown, json, and csv', () => {
  const transactions = [
    {
      id: 'tx-1',
      startedAt: '2026-10-15T10:00:00.000Z',
      status: 'completed',
      operations: [
        { type: 'create', path: 'logo.webp', inputBytes: 100000, bytes: 10000, format: 'webp', durationMs: 25 },
      ],
    },
  ];

  const report = computePerformanceReport(transactions);

  const table = formatPerformanceReport(report, 'table');
  assert.ok(table.includes('Zapwebp Performance Report'));
  assert.ok(table.includes('Carbon offset estimate:'));

  const jsonStr = formatPerformanceReport(report, 'json');
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.totalFiles, 1);

  const md = formatPerformanceReport(report, 'markdown');
  assert.ok(md.includes('### 📊 Zapwebp Performance Report'));
  assert.ok(md.includes('| **Total Saved** |'));

  const csv = formatPerformanceReport(report, 'csv');
  assert.ok(csv.includes('"logo.webp",100000,10000,90000'));
});
