'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

const docs = walk(CONTENT_DIR);
console.log(`Found ${docs.length} markdown doc files in content/:`);
for (const d of docs) {
  const content = fs.readFileSync(d, 'utf8');
  const h1Match = content.match(/^#\s+(.+)$/m);
  const rel = path.relative(CONTENT_DIR, d);
  console.log(`- ${rel}: ${h1Match ? h1Match[1] : 'No H1'}`);
}
