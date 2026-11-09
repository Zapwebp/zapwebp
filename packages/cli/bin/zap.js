#!/usr/bin/env node
import('../src/index.js').catch((error) => {
  process.stderr.write(`zap: ${error.message}\n`);
  process.exitCode = 1;
});

