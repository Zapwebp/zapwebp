'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.pnpm-store' || file === 'dist' || file === 'build') {
      continue;
    }
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, fileList);
    } else if (/\.(js|ts|json|md)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = walk(ROOT_DIR);
const errorCodes = new Set();
const errorCodeOccurrences = {};

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/E_[A-Z0-9_]+/g);
  if (matches) {
    for (const m of matches) {
      errorCodes.add(m);
      if (!errorCodeOccurrences[m]) errorCodeOccurrences[m] = [];
      const rel = path.relative(ROOT_DIR, f);
      if (!errorCodeOccurrences[m].includes(rel)) {
        errorCodeOccurrences[m].push(rel);
      }
    }
  }
}

console.log('Found error codes:');
for (const code of Array.from(errorCodes).sort()) {
  console.log(`- ${code} (in ${errorCodeOccurrences[code].join(', ')})`);
}
