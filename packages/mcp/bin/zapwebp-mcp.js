#!/usr/bin/env node
import('../src/server.js').catch((error) => {
  process.stderr.write(`zapwebp-mcp: ${error.message}\n`);
  process.exitCode = 1;
});
