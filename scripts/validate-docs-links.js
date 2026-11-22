'use strict';

/**
 * validate-docs-links.js
 *
 * CI regression guard enforcing clean SPA route slugs across all documentation files:
 * - Scans all Markdown files across content and documentation trees.
 * - Extracts all internal links.
 * - Fails with exit code 1 if any internal link points to a raw `.md` extension
 *   (e.g., `[Link](/convert.md)` or `[Link](convert.md)`), requiring clean slugs (e.g., `[Link](/convert)`).
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC_DIRECTORIES = [
  path.resolve(__dirname, '../content'),
  path.resolve(__dirname, '../locales/tl/docs'),
  path.resolve(__dirname, '../zapwebp-docs/content'),
];

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
      files.push({ fullPath, relPath, baseDir });
    }
  }

  return files;
}

function isExternalOrAnchor(url) {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed.startsWith('#')) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return true; // http:, https:, mailto:, data:, etc.
  if (trimmed.startsWith('//')) return true;
  return false;
}

function validateDocsLinks() {
  console.log('--- Validating Documentation Route Links (No .md Extensions) ---');

  let scannedFiles = 0;
  let totalLinks = 0;
  let errors = 0;

  for (const dir of DOC_DIRECTORIES) {
    const files = collectMarkdownFiles(dir);

    for (const file of files) {
      scannedFiles++;
      const content = fs.readFileSync(file.fullPath, 'utf8');
      const lines = content.split(/\r?\n/);

      // Markdown link regex: [text](target "optional title")
      const linkRegex = /\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let match;

        while ((match = linkRegex.exec(line)) !== null) {
          totalLinks++;
          const target = match[2].trim();

          if (isExternalOrAnchor(target)) {
            continue;
          }

          // Check if target path has .md extension before query or fragment
          const cleanTarget = target.split(/[?#]/)[0];
          if (cleanTarget.toLowerCase().endsWith('.md')) {
            const relDisplay = path.relative(path.resolve(__dirname, '..'), file.fullPath).replace(/\\/g, '/');
            console.error(`✖ [${relDisplay}:${lineIndex + 1}]: Prohibited .md link "${target}" found in text: "${match[0]}"`);
            console.error(`    Remedy: Use clean route slug without .md (e.g. "${cleanTarget.replace(/\.md$/i, '')}")`);
            errors++;
          }
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n✖ Link validation failed with ${errors} violation(s) across ${scannedFiles} files.`);
    process.exit(1);
  }

  console.log(`✔ Link validation passed: scanned ${scannedFiles} documentation files (${totalLinks} links checked). Zero raw .md links found.`);
}

validateDocsLinks();
