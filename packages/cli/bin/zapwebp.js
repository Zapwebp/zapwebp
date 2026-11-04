#!/usr/bin/env node
import('../src/index.js').catch((error) => {
  process.stderr.write(`zapwebp: ${error.message}\n`);
  process.exitCode = 1;
});
