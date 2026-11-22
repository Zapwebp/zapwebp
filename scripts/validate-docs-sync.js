'use strict';

/**
 * validate-docs-sync.js
 *
 * CI regression guard ensuring byte-exact synchronization and full localization parity
 * across all documentation mirror locations:
 * - English canonical source (`content/`) vs:
 *   - `zapwebp-docs/content/` (SHA-256 byte-for-byte exact)
 *   - `zapwebp-docs/public/content/` (SHA-256 byte-for-byte exact)
 * - Tagalog canonical source (`locales/tl/docs/`) vs:
 *   - `zapwebp-docs/public/locales/tl/docs/` (SHA-256 byte-for-byte exact)
 *   - `public/locales/tl/docs/` (SHA-256 byte-for-byte exact)
 * - Parity cross-check:
 *   - Every file in `content/` must exist in `locales/tl/docs/`
 *   - Every file in `locales/tl/docs/` must exist in `content/`
 *
 * Exits with status code 1 if any mirror has drifted or files are missing.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT_DIR = path.resolve(__dirname, '..');

const EN_SOURCE_DIR = path.join(ROOT_DIR, 'content');
const EN_MIRRORS = [
  path.join(ROOT_DIR, 'zapwebp-docs/content'),
  path.join(ROOT_DIR, 'zapwebp-docs/public/content'),
];

const TL_SOURCE_DIR = path.join(ROOT_DIR, 'locales/tl/docs');
const TL_MIRRORS = [
  path.join(ROOT_DIR, 'zapwebp-docs/public/locales/tl/docs'),
  path.join(ROOT_DIR, 'public/locales/tl/docs'),
];

const EXPECTED_DOC_COUNT = 54;

function computeSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function collectMarkdownFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push(relPath);
    }
  }

  return files.sort();
}

function validateDocsSync() {
  console.log('--- Validating Documentation Mirror Synchronization & Parity ---');

  let errors = 0;

  // 1. Collect English canonical files
  const enFiles = collectMarkdownFiles(EN_SOURCE_DIR);
  if (enFiles.length !== EXPECTED_DOC_COUNT) {
    console.error(`✖ English source count mismatch: expected ${EXPECTED_DOC_COUNT} files in content/, found ${enFiles.length}`);
    errors++;
  }

  // 2. Collect Tagalog canonical files
  const tlFiles = collectMarkdownFiles(TL_SOURCE_DIR);
  if (tlFiles.length !== EXPECTED_DOC_COUNT) {
    console.error(`✖ Tagalog source count mismatch: expected ${EXPECTED_DOC_COUNT} files in locales/tl/docs/, found ${tlFiles.length}`);
    errors++;
  }

  // 3. Parity cross-check between English and Tagalog
  const enSet = new Set(enFiles);
  const tlSet = new Set(tlFiles);

  for (const file of enFiles) {
    if (!tlSet.has(file)) {
      console.error(`✖ Missing Tagalog translation for English doc: ${file} (expected in locales/tl/docs/)`);
      errors++;
    }
  }

  for (const file of tlFiles) {
    if (!enSet.has(file)) {
      console.error(`✖ Orphaned Tagalog translation with no English source: ${file}`);
      errors++;
    }
  }

  // 4. Verify English mirrors match content/ SHA-256 byte-for-byte
  for (const mirrorDir of EN_MIRRORS) {
    const mirrorRel = path.relative(ROOT_DIR, mirrorDir).replace(/\\/g, '/');
    let mirrorChecks = 0;

    for (const file of enFiles) {
      const srcPath = path.join(EN_SOURCE_DIR, file);
      const dstPath = path.join(mirrorDir, file);

      if (!fs.existsSync(dstPath)) {
        console.error(`✖ Missing file in mirror ${mirrorRel}: ${file}`);
        errors++;
        continue;
      }

      const srcHash = computeSha256(srcPath);
      const dstHash = computeSha256(dstPath);

      if (srcHash !== dstHash) {
        console.error(`✖ SHA-256 hash mismatch in ${mirrorRel}/${file}:`);
        console.error(`    Source (${srcHash}) != Mirror (${dstHash})`);
        errors++;
      } else {
        mirrorChecks++;
      }
    }

    if (errors === 0) {
      console.log(`✔ Verified ${mirrorChecks} files in ${mirrorRel} match content/ byte-for-byte.`);
    }
  }

  // 5. Verify Tagalog mirrors match locales/tl/docs/ SHA-256 byte-for-byte
  for (const mirrorDir of TL_MIRRORS) {
    const mirrorRel = path.relative(ROOT_DIR, mirrorDir).replace(/\\/g, '/');
    let mirrorChecks = 0;

    for (const file of tlFiles) {
      const srcPath = path.join(TL_SOURCE_DIR, file);
      const dstPath = path.join(mirrorDir, file);

      if (!fs.existsSync(dstPath)) {
        console.error(`✖ Missing file in Tagalog mirror ${mirrorRel}: ${file}`);
        errors++;
        continue;
      }

      const srcHash = computeSha256(srcPath);
      const dstHash = computeSha256(dstPath);

      if (srcHash !== dstHash) {
        console.error(`✖ SHA-256 hash mismatch in ${mirrorRel}/${file}:`);
        console.error(`    Source (${srcHash}) != Mirror (${dstHash})`);
        errors++;
      } else {
        mirrorChecks++;
      }
    }

    if (errors === 0) {
      console.log(`✔ Verified ${mirrorChecks} files in ${mirrorRel} match locales/tl/docs/ byte-for-byte.`);
    }
  }

  if (errors > 0) {
    console.error(`\n✖ Documentation synchronization validation failed with ${errors} violation(s).`);
    process.exit(1);
  }

  console.log(`\n✔ Documentation synchronization verified: all ${EXPECTED_DOC_COUNT} documents across all mirrors are in complete byte-for-byte parity.`);
}

validateDocsSync();
