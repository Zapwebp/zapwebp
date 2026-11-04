'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IGNORES = new Set(['.git', 'node_modules', '.next', 'dist', '.turbo', '.vercel', '.zapwebp']);

/**
 * Checks if a relative path matches a glob pattern.
 * Supports standard wildcards (`*`, `**`) and brace expansion (`{svg,png,jpg}`).
 * @param {string} relPath
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesPattern(relPath, pattern) {
  const normalized = relPath.replace(/\\/g, '/');
  const pat = pattern.replace(/\\/g, '/');
  if (pat === '**' || pat === '*.*' || pat === '*.*') return true;

  // Build regular expression from glob with brace expansion
  let s = '';
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === '*' && pat[i + 1] === '*' && pat[i + 2] === '/') {
      s += '(?:.+/)?';
      i += 2;
    } else if (c === '*' && pat[i + 1] === '*') {
      s += '.*';
      i += 1;
    } else if (c === '*') {
      s += '[^/]*';
    } else if (c === '{') {
      const end = pat.indexOf('}', i);
      if (end !== -1) {
        const group = pat.slice(i + 1, end).split(',').map((x) => x.trim()).join('|');
        s += '(?:' + group + ')';
        i = end;
      } else {
        s += '\\{';
      }
    } else if ('[.+^$()|\\]'.includes(c)) {
      s += '\\' + c;
    } else {
      s += c;
    }
  }

  try {
    const regex = new RegExp(`^${s}$`, 'i');
    return regex.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Scans workspace root for files matching glob pattern.
 * @param {string} rootDir
 * @param {string} [pattern='**\/*.{svg,png,jpg,jpeg,webp,avif}']
 * @returns {Array<{ absolutePath: string, relativePath: string }>}
 */
function scan(rootDir, pattern = '**/*.{svg,png,jpg,jpeg,webp,avif}') {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;

  function walk(currentDir, currentRel = '') {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (DEFAULT_IGNORES.has(entry.name)) continue;

      const absPath = path.join(currentDir, entry.name);
      const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walk(absPath, relPath);
      } else if (entry.isFile()) {
        if (matchesPattern(relPath, pattern)) {
          results.push({
            absolutePath: absPath,
            relativePath: relPath.replace(/\\/g, '/'),
          });
        }
      }
    }
  }

  walk(rootDir);
  return results;
}

module.exports = {
  scan,
  matchesPattern,
};
