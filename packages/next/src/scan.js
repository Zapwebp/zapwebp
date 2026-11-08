'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IGNORES = new Set(['node_modules', '.next', 'dist', '.git', '.turbo', '.vercel']);
const SUPPORTED_EXTS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tiff']);

/**
 * Scans configured source directories for image and vector assets.
 * @param {string} rootDir Next.js project root.
 * @param {string[]} sourceDirs Relative directory paths to scan.
 * @returns {Array<{ absolutePath: string, relativePath: string }>}
 */
function scan(rootDir, sourceDirs = ['public', 'src/assets', 'app']) {
  const results = [];
  const visited = new Set();

  for (const dir of sourceDirs) {
    const targetDir = path.resolve(rootDir, dir);
    if (!fs.existsSync(targetDir)) continue;

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
        const ext = path.extname(entry.name).toLowerCase();

        if (entry.isDirectory()) {
          walk(absPath, relPath);
        } else if (entry.isFile() && SUPPORTED_EXTS.has(ext)) {
          if (!visited.has(absPath)) {
            visited.add(absPath);
            results.push({
              absolutePath: absPath,
              relativePath: path.relative(rootDir, absPath).replace(/\\/g, '/'),
            });
          }
        }
      }
    }

    walk(targetDir, dir);
  }

  return results;
}

module.exports = {
  scan,
};

