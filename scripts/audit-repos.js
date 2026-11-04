'use strict';

const fs = require('fs');
const path = require('path');

const results = [];
function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', '.pnpm-store', 'dist', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.vsix') || entry.name.endsWith('.png') || entry.name.endsWith('.webp') ||
          entry.name.endsWith('.jpg') || entry.name.endsWith('.zip') || entry.name.endsWith('.ico') ||
          entry.name.endsWith('.wasm') || entry.name.endsWith('.lock') || entry.name === 'pnpm-lock.yaml') {
        continue;
      }
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('EldrexDelosReyesBula')) {
          results.push(full);
        }
      } catch (e) {}
    }
  }
}

scan('.');
console.log('Matches found for EldrexDelosReyesBula:', JSON.stringify(results, null, 2));

