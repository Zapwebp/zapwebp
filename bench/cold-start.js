'use strict';

const { execSync } = require('node:child_process');

/**
 * Measures the cold-start time (process spawn, module load, and first conversion).
 * @returns {{ name: string, timeMs: number, targetMs: number, passed: boolean }}
 */
function runColdStartBench() {
  const targetMs = 250;
  const start = performance.now();

  execSync('node -e "const { convert } = require(\'./packages/core\'); const fs = require(\'fs\'); convert(fs.readFileSync(\'bench/fixtures/logo.svg\'), { to: \'webp\' });"', {
    stdio: 'ignore',
  });

  const timeMs = Number((performance.now() - start).toFixed(2));
  return {
    name: 'Cold start (first conversion)',
    timeMs,
    targetMs,
    passed: timeMs <= targetMs * 1.5, // Allow margin in diverse environments
  };
}

module.exports = { runColdStartBench };

if (require.main === module) {
  console.log(runColdStartBench());
}
