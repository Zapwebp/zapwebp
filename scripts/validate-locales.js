'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const LOCALES_DIR = path.resolve(__dirname, '../locales');
const CONTENT_DIR = path.resolve(__dirname, '../content');
const BASE_LOCALE = 'en';

function extractVars(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/{{\s*[\w.-]+\s*}}/g) || [];
  return matches.map((m) => m.replace(/[{}]/g, '').trim()).sort();
}

async function validateLocales() {
  console.log('Validating localization catalogs and documentation parity...');
  const entries = await fs.readdir(LOCALES_DIR, { withFileTypes: true });
  const locales = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (!locales.includes(BASE_LOCALE)) {
    throw new Error(`Base locale '${BASE_LOCALE}' not found in ${LOCALES_DIR}`);
  }

  const baseFiles = (await fs.readdir(path.join(LOCALES_DIR, BASE_LOCALE))).filter((f) => f.endsWith('.json'));

  let errors = 0;
  let totalKeys = 0;

  for (const file of baseFiles) {
    const baseContent = JSON.parse(await fs.readFile(path.join(LOCALES_DIR, BASE_LOCALE, file), 'utf8'));
    const baseKeys = Object.keys(baseContent);
    totalKeys += baseKeys.length;

    for (const locale of locales) {
      if (locale === BASE_LOCALE) continue;

      const targetPath = path.join(LOCALES_DIR, locale, file);
      let targetContent = {};
      try {
        targetContent = JSON.parse(await fs.readFile(targetPath, 'utf8'));
      } catch (err) {
        console.error(`✖ [${locale}] Missing or invalid JSON file: ${file}`);
        errors++;
        continue;
      }

      const targetKeys = Object.keys(targetContent);

      // Check missing keys
      for (const key of baseKeys) {
        if (!(key in targetContent)) {
          console.error(`✖ [${locale}] Missing key "${key}" in ${file}`);
          errors++;
        } else {
          const val = targetContent[key];
          if (val === null || val === undefined || val === '') {
            console.error(`✖ [${locale}] Empty or null value for key "${key}" in ${file}`);
            errors++;
          } else if (typeof val === 'string') {
            const baseVars = extractVars(baseContent[key]);
            const targetVars = extractVars(val);
            if (JSON.stringify(baseVars) !== JSON.stringify(targetVars)) {
              console.error(`✖ [${locale}] Variable mismatch in "${key}": expected [${baseVars.join(', ')}], got [${targetVars.join(', ')}]`);
              errors++;
            }
          }
        }
      }

      // Check extra keys
      for (const key of targetKeys) {
        if (!baseKeys.includes(key)) {
          console.warn(`⚠ [${locale}] Extra key "${key}" in ${file}`);
        }
      }

      // Check for dangerous HTML / script injection
      for (const [k, v] of Object.entries(targetContent)) {
        if (typeof v === 'string' && (/<script/i.test(v) || /javascript:/i.test(v) || /onload=/i.test(v))) {
          console.error(`✖ [${locale}] Potential unsafe payload in key "${k}": ${v}`);
          errors++;
        }
      }
    }
  }

  // Validate documentation markdown files in locales/{locale}/docs
  for (const locale of locales) {
    if (locale === BASE_LOCALE) continue;
    const tlDocsDir = path.join(LOCALES_DIR, locale, 'docs');
    try {
      const stat = await fs.stat(tlDocsDir);
      if (stat.isDirectory()) {
        const checkDir = async (dir, prefix = '') => {
          const items = await fs.readdir(dir, { withFileTypes: true });
          for (const item of items) {
            const rel = path.join(prefix, item.name);
            if (item.isDirectory()) {
              await checkDir(path.join(dir, item.name), rel);
            } else if (item.name.endsWith('.md')) {
              const srcFile = path.join(CONTENT_DIR, rel);
              try {
                await fs.access(srcFile);
              } catch {
                console.warn(`⚠ [${locale}] Translated doc "${rel}" has no source in content/`);
              }

              const md = await fs.readFile(path.join(dir, item.name), 'utf8');
              if (!md.startsWith('# ')) {
                console.error(`✖ [${locale}] "${rel}" must start with H1 title`);
                errors++;
              }
              if (!md.includes('## Quick start') || !md.includes('## What it does') || !md.includes('## Errors')) {
                console.error(`✖ [${locale}] "${rel}" is missing required template sections`);
                errors++;
              }
            }
          }
        };
        await checkDir(tlDocsDir);
      }
    } catch (_) {
      // No docs dir for this locale
    }
  }

  if (errors > 0) {
    console.error(`\nValidation failed with ${errors} error(s).`);
    process.exit(1);
  } else {
    console.log(`✓ All ${locales.length} locales are valid with complete key parity (${totalKeys} keys) and verified documentation.`);
  }
}

validateLocales().catch((err) => {
  console.error(err);
  process.exit(1);
});
