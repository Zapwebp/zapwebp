'use strict';

/**
 * validate-docs-structure.js
 *
 * CI regression guard enforcing the strict documentation template architecture:
 * - 47 technical documents MUST contain `Covers:`, `Does not cover:`, and `Applies to:` within lines 1-10.
 * - 7 legal/informational documents (`about.md`, `privacy.md`, `terms.md`, `security.md`,
 *   `code-of-conduct.md`, `contributing.md`, `translators.md`) MUST NOT contain technical metadata headers.
 *
 * Exits with status code 1 if any violation is detected.
 */

const fs = require('node:fs');
const path = require('node:path');

const CONTENT_DIR = path.resolve(__dirname, '../content');

const LEGAL_DOCS = new Set([
  'about.md',
  'privacy.md',
  'terms.md',
  'security.md',
  'code-of-conduct.md',
  'contributing.md',
  'translators.md',
]);

const TOTAL_EXPECTED_DOCS = 54;
const EXPECTED_LEGAL_COUNT = 7;
const EXPECTED_TECHNICAL_COUNT = 47;

function collectMarkdownFiles(dir, baseDir = dir) {
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

function validateDocsStructure() {
  console.log('--- Validating Documentation Structure & Technical Separation ---');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`✖ Error: content directory not found at ${CONTENT_DIR}`);
    process.exit(1);
  }

  const allFiles = collectMarkdownFiles(CONTENT_DIR);

  if (allFiles.length !== TOTAL_EXPECTED_DOCS) {
    console.error(`✖ Documentation inventory mismatch: expected ${TOTAL_EXPECTED_DOCS} files, found ${allFiles.length}`);
    process.exit(1);
  }

  let errors = 0;
  let technicalValidated = 0;
  let legalValidated = 0;

  for (const relPath of allFiles) {
    const fullPath = path.join(CONTENT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const first10Lines = lines.slice(0, 10).join('\n');

    // 1. All documents must begin with an H1 heading
    const firstNonEmptyLine = lines.find((line) => line.trim().length > 0) || '';
    if (!firstNonEmptyLine.startsWith('# ')) {
      console.error(`✖ [${relPath}]: File must begin with an H1 title (found: "${firstNonEmptyLine}")`);
      errors++;
    }

    if (LEGAL_DOCS.has(relPath)) {
      // 2. Legal/Informational documents must NOT contain technical metadata tokens
      const hasCovers = content.includes('Covers:');
      const hasDoesNotCover = content.includes('Does not cover:');
      const hasAppliesTo = content.includes('Applies to:');

      if (hasCovers || hasDoesNotCover || hasAppliesTo) {
        console.error(`✖ [${relPath}]: Legal/informational document must NOT contain technical template metadata headers.`);
        if (hasCovers) console.error(`    Found prohibited "Covers:"`);
        if (hasDoesNotCover) console.error(`    Found prohibited "Does not cover:"`);
        if (hasAppliesTo) console.error(`    Found prohibited "Applies to:"`);
        errors++;
      } else {
        legalValidated++;
      }
    } else {
      // 3. Technical documents MUST contain Covers:, Does not cover:, and Applies to: in lines 1-10
      const hasCoversIn10 = first10Lines.includes('Covers:');
      const hasDoesNotCoverIn10 = first10Lines.includes('Does not cover:');
      const hasAppliesToIn10 = first10Lines.includes('Applies to:');

      if (!hasCoversIn10 || !hasDoesNotCoverIn10 || !hasAppliesToIn10) {
        console.error(`✖ [${relPath}]: Technical document missing required metadata in the first 10 lines:`);
        if (!hasCoversIn10) console.error(`    Missing "Covers:" in first 10 lines`);
        if (!hasDoesNotCoverIn10) console.error(`    Missing "Does not cover:" in first 10 lines`);
        if (!hasAppliesToIn10) console.error(`    Missing "Applies to:" in first 10 lines`);
        errors++;
      } else {
        technicalValidated++;
      }
    }
  }

  if (legalValidated !== EXPECTED_LEGAL_COUNT) {
    console.error(`✖ Expected ${EXPECTED_LEGAL_COUNT} validated legal documents, but validated ${legalValidated}`);
    errors++;
  }

  if (technicalValidated !== EXPECTED_TECHNICAL_COUNT) {
    console.error(`✖ Expected ${EXPECTED_TECHNICAL_COUNT} validated technical documents, but validated ${technicalValidated}`);
    errors++;
  }

  if (errors > 0) {
    console.error(`\n✖ Structure validation failed with ${errors} violation(s).`);
    process.exit(1);
  }

  console.log(`✔ Structure validation passed: ${technicalValidated} technical documents and ${legalValidated} legal documents strictly conform.`);
}

validateDocsStructure();
