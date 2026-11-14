'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runColdStartBench } = require('./cold-start');
const { runWarmStartBench } = require('./warm-start');
const { runSvgWebpBench } = require('./svg-webp');
const { runPngWebpBench } = require('./png-webp');
const { runBatchBench } = require('./batch');
const { runMemoryBench } = require('./memory');

async function runAllBenchmarks() {
  console.log('\n======================================================');
  console.log('⚡ Zapwebp Performance Benchmarks (CI Contract)');
  console.log('======================================================\n');

  const results = [];

  // 1. Cold start
  process.stdout.write('Running Cold Start benchmark... ');
  const cold = runColdStartBench();
  results.push(cold);
  console.log(`${cold.timeMs}ms (target: <${cold.targetMs}ms) ${cold.passed ? '✅' : '⚠️'}`);

  // 2. Warm start
  process.stdout.write('Running Warm Start benchmark... ');
  const warm = await runWarmStartBench();
  results.push(warm);
  console.log(`${warm.timeMs}ms (target: <${warm.targetMs}ms) ${warm.passed ? '✅' : '⚠️'}`);

  // 3. SVG -> WebP
  process.stdout.write('Running SVG -> WebP benchmark... ');
  const svgWebp = await runSvgWebpBench();
  results.push(svgWebp);
  console.log(`${svgWebp.timeMs}ms (target: <${svgWebp.targetMs}ms) ${svgWebp.passed ? '✅' : '⚠️'}`);

  // 4. PNG -> WebP (1080p)
  process.stdout.write('Running PNG -> WebP (1080p) benchmark... ');
  const pngWebp = await runPngWebpBench();
  results.push(pngWebp);
  console.log(`${pngWebp.timeMs}ms (target: <${pngWebp.targetMs}ms) ${pngWebp.passed ? '✅' : '⚠️'}`);

  // 5. Batch of 100 SVGs
  process.stdout.write('Running Batch (100 SVGs) benchmark... ');
  const batch = await runBatchBench(100);
  results.push(batch);
  console.log(`${batch.timeMs}ms (target: <${batch.targetMs}ms) ${batch.passed ? '✅' : '⚠️'}`);

  // 6. Memory peak
  process.stdout.write('Running Memory consumption benchmark... ');
  const mem = await runMemoryBench();
  results.push(mem);
  console.log(`${mem.memoryMb} MB (target: <${mem.targetMb} MB) ${mem.passed ? '✅' : '⚠️'}`);

  // Save results.json
  const resultsPayload = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
    },
    benchmarks: results,
  };

  const outPath = path.resolve(__dirname, 'results.json');
  fs.writeFileSync(outPath, JSON.stringify(resultsPayload, null, 2) + '\n');
  console.log(`\nResults written to: ${outPath}`);

  // Summary Table
  console.log('\n┌───────────────────────────────────┬─────────────┬─────────────┬────────┐');
  console.log('│ Metric                            │ Measured    │ Target      │ Status │');
  console.log('├───────────────────────────────────┼─────────────┼─────────────┼────────┤');
  for (const r of results) {
    const val = r.timeMs !== undefined ? `${r.timeMs}ms` : `${r.memoryMb}MB`;
    const tgt = r.targetMs !== undefined ? `<${r.targetMs}ms` : `<${r.targetMb}MB`;
    const status = r.passed ? 'PASS ✅' : 'WARN ⚠️';
    console.log(`│ ${r.name.padEnd(33)} │ ${val.padEnd(11)} │ ${tgt.padEnd(11)} │ ${status.padEnd(6)} │`);
  }
  console.log('└───────────────────────────────────┴─────────────┴─────────────┴────────┘\n');

  const allPassed = results.every((r) => r.passed);
  if (!allPassed) {
    console.warn('⚠️ Warning: Some benchmarks exceeded targets. Investigate potential performance regression.');
  } else {
    console.log('🎉 All performance benchmarks satisfy the Enterprise Architecture contract.\n');
  }

  return resultsPayload;
}

if (require.main === module) {
  runAllBenchmarks().catch((err) => {
    console.error('Benchmark runner failed:', err);
    process.exit(1);
  });
}

module.exports = { runAllBenchmarks };
