'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Checks if a relative path matches simple glob patterns.
 * Supports standard wildcards: `**` (recursive directory), `*` (file/directory segment).
 * @param {string} relPath
 * @param {string[]} patterns
 * @returns {boolean}
 */
function matchesPattern(relPath, patterns) {
  const normalized = relPath.replace(/\\/g, '/');
  for (const pattern of patterns) {
    const pat = pattern.replace(/\\/g, '/');
    if (pat === '**/*.svg' && normalized.toLowerCase().endsWith('.svg')) return true;
    if (pat === '*' && !normalized.includes('/')) return true;
    if (pat === '**') return true;

    // Convert glob braces {png,jpg} to group
    let withBraces = pat.replace(/\{([^{}]+)\}/g, '§BRACE_$1§');
    let regexStr = withBraces
      .replace(/[.+^$|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§/g, '.*')
      .replace(/§BRACE_([^{}]+)§/g, (_, inner) => '(' + inner.split(',').map((s) => s.trim()).join('|') + ')');

    const regex = new RegExp(`^${regexStr}$`, 'i');
    if (regex.test(normalized)) return true;
  }
  return false;
}

/**
 * Scans a root directory recursively for SVG assets honoring include and exclude patterns.
 * @param {string} rootDir Absolute root directory to scan from.
 * @param {string[]} include Glob patterns to include.
 * @param {string[]} exclude Glob patterns to exclude.
 * @returns {Array<{ absolutePath: string, relativePath: string }>}
 */
function scanFiles(rootDir, include = ['**/*.svg'], exclude = ['node_modules/**', 'dist/**', '.git/**']) {
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
      const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name;
      const absPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const isExcluded = exclude.some((p) => {
          const cleanPattern = p.replace(/\\/g, '/').replace(/\/+\*\*$/, '').replace(/\/+$/, '');
          return relPath === cleanPattern || relPath.startsWith(`${cleanPattern}/`);
        });
        if (!isExcluded) {
          walk(absPath, relPath);
        }
      } else if (entry.isFile()) {
        if (entry.name.toLowerCase().endsWith('.svg')) {
          const isExcluded = matchesPattern(relPath, exclude);
          const isIncluded = matchesPattern(relPath, include);
          if (isIncluded && !isExcluded) {
            results.push({
              absolutePath: absPath,
              relativePath: relPath,
            });
          }
        }
      }
    }
  }

  walk(rootDir);
  return results;
}

module.exports = {
  scanFiles,
  matchesPattern,
};

