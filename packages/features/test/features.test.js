'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  initialState,
  reduce,
  BatchManager,
  CleanService,
  MultiplierService,
} = require('../src');

test('Convert State Machine: transitions predictably through full conversion lifecycle', () => {
  assert.equal(initialState.status, 'idle');

  // Add files
  const queued = reduce(initialState, { type: 'ADD_FILES', files: ['a.svg', 'b.png'] });
  assert.equal(queued.status, 'queued');
  assert.equal(queued.files.length, 2);

  // Start conversion
  const converting = reduce(queued, { type: 'START' });
  assert.equal(converting.status, 'converting');
  assert.equal(converting.done, 0);
  assert.equal(converting.total, 2);

  // File 1 done
  const step1 = reduce(converting, { type: 'FILE_DONE', output: { id: 'a' } });
  assert.equal(step1.status, 'converting');
  assert.equal(step1.done, 1);

  // File 2 done -> transitions to done
  const done = reduce(step1, { type: 'FILE_DONE', output: { id: 'b' } });
  assert.equal(done.status, 'done');
  assert.equal(done.outputs.length, 2);

  // Reset back to idle
  const reset = reduce(done, { type: 'RESET' });
  assert.equal(reset.status, 'idle');
});

test('Convert State Machine: transitions to error state on failure', () => {
  const converting = { status: 'converting', files: ['bad.svg'], done: 0, total: 1 };
  const errState = reduce(converting, { type: 'FAIL', error: 'Corrupt file', recoverable: true });
  assert.equal(errState.status, 'error');
  assert.equal(errState.error, 'Corrupt file');
  assert.equal(errState.recoverable, true);
});

test('BatchManager: processes queued items concurrently with progress reporting', async () => {
  const processed = [];
  const progressReports = [];

  const manager = new BatchManager({
    concurrency: 2,
    convertFn: async (file) => {
      processed.push(file);
      return { output: `${file}.webp` };
    },
  });

  manager.add([
    { id: '1', name: 'img1.svg', file: 'buffer1' },
    { id: '2', name: 'img2.svg', file: 'buffer2' },
    { id: '3', name: 'img3.svg', file: 'buffer3' },
  ]);

  const outcome = await manager.process({
    onProgress: (p) => progressReports.push(p),
  });

  assert.equal(outcome.total, 3);
  assert.equal(outcome.results.length, 3);
  assert.equal(outcome.errors.length, 0);
  assert.equal(progressReports.length, 3);
  assert.deepEqual(processed, ['buffer1', 'buffer2', 'buffer3']);
});

test('MultiplierService: plans responsive variants and generates srcset', () => {
  const plan = MultiplierService.plan({
    filename: 'hero.svg',
    baseWidth: 100,
    baseHeight: 50,
    scales: [1, 2, 3],
    format: 'webp',
  });

  assert.equal(plan.variants.length, 3);
  assert.equal(plan.variants[0].scale, 1);
  assert.equal(plan.variants[0].width, 100);
  assert.equal(plan.variants[0].filename, 'hero.webp');

  assert.equal(plan.variants[1].scale, 2);
  assert.equal(plan.variants[1].width, 200);
  assert.equal(plan.variants[1].filename, 'hero@2x.webp');

  assert.equal(plan.variants[2].scale, 3);
  assert.equal(plan.variants[2].width, 300);
  assert.equal(plan.variants[2].filename, 'hero@3x.webp');

  assert.match(plan.srcset, /srcset="hero.webp 1x, hero@2x.webp 2x, hero@3x.webp 3x"/);
});

test('CleanService: inspects metadata and generates cryptographic certificate', () => {
  const testSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  const meta = CleanService.inspect(testSvg);
  assert.equal(meta.hasMetadata, false);

  const cert = CleanService.certify(testSvg);
  assert.ok(cert.sha256);
  assert.equal(cert.verified, true);
  assert.match(cert.tool, /zap/i);
});
