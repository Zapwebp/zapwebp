'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT_DIR, 'locales');

function extractVars(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/{{\s*[\w.-]+\s*}}/g) || [];
  return matches.map((m) => m.replace(/[{}]/g, '').trim()).sort();
}

const PROPER_NOUNS_WHITELIST = new Set([
  'zapwebp',
  'webp',
  'avif',
  'png',
  'jpeg',
  'jpg',
  'svg',
  'gif',
  'tiff',
  'cli',
  'mcp',
  'api',
  'rest api',
  'url',
  'urls',
  'ctrl k',
  'clean mode',
  'target lock',
  'core sdk',
  'ui sdk',
  'cli sdk',
  'storage sdk',
  'edge sdk',
  'plugin sdk',
  'github',
  'vscode',
  'vite',
  'next.js',
  'laravel',
  'markdown',
  '.md',
  '.zip',
  'json',
  'batch',
  'convert'
]);

function isAllowedIdentical(enVal, tlVal) {
  if (enVal.trim() === tlVal.trim()) {
    const lower = enVal.trim().toLowerCase();
    if (PROPER_NOUNS_WHITELIST.has(lower)) return true;
    // Check if it's purely symbols/code/commands
    if (/^[A-Z0-9_\-./\s:]+$/.test(enVal) && enVal.length < 15) return true;
    return false;
  }
  return false;
}

function auditJsonFiles() {
  const enDir = path.join(LOCALES_DIR, 'en');
  const tlDir = path.join(LOCALES_DIR, 'tl');

  const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith('.json'));
  const tlFiles = fs.readdirSync(tlDir).filter((f) => f.endsWith('.json'));

  const report = {
    totalEnKeys: 0,
    totalTlKeys: 0,
    missingInTl: [],
    extraInTl: [],
    emptyOrNullInTl: [],
    identicalValues: [],
    variableMismatches: []
  };

  const allFiles = Array.from(new Set([...enFiles, ...tlFiles]));

  for (const file of allFiles) {
    const enPath = path.join(enDir, file);
    const tlPath = path.join(tlDir, file);

    const enExists = fs.existsSync(enPath);
    const tlExists = fs.existsSync(tlPath);

    if (!enExists) {
      report.extraInTl.push({ file, key: '*' });
      continue;
    }
    if (!tlExists) {
      report.missingInTl.push({ file, key: '*' });
      continue;
    }

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const tlContent = JSON.parse(fs.readFileSync(tlPath, 'utf8'));

    const enKeys = Object.keys(enContent);
    const tlKeys = Object.keys(tlContent);

    report.totalEnKeys += enKeys.length;
    report.totalTlKeys += tlKeys.length;

    for (const key of enKeys) {
      if (!(key in tlContent)) {
        report.missingInTl.push({ file, key, enVal: enContent[key] });
      } else {
        const enVal = enContent[key];
        const tlVal = tlContent[key];

        if (tlVal === null || tlVal === undefined || tlVal === '') {
          report.emptyOrNullInTl.push({ file, key, tlVal });
        } else if (typeof tlVal === 'string' && typeof enVal === 'string') {
          if (enVal === tlVal && !isAllowedIdentical(enVal, tlVal)) {
            report.identicalValues.push({ file, key, enVal, tlVal });
          }

          const enVars = extractVars(enVal);
          const tlVars = extractVars(tlVal);
          if (JSON.stringify(enVars) !== JSON.stringify(tlVars)) {
            report.variableMismatches.push({ file, key, enVars, tlVars });
          }
        }
      }
    }

    for (const key of tlKeys) {
      if (!(key in enContent)) {
        report.extraInTl.push({ file, key, tlVal: tlContent[key] });
      }
    }
  }

  return report;
}

function auditCodeCatalogs() {
  const sharedPath = path.join(ROOT_DIR, 'packages/shared/src/i18n.js');
  const docsI18nPath = path.join(ROOT_DIR, 'zapwebp-docs/src/i18n.ts');

  const results = { shared: {}, docs: {} };

  if (fs.existsSync(sharedPath)) {
    const sharedCode = fs.readFileSync(sharedPath, 'utf8');
    results.shared = { exists: true, length: sharedCode.length };
  }

  if (fs.existsSync(docsI18nPath)) {
    const docsCode = fs.readFileSync(docsI18nPath, 'utf8');
    // Extract catalog entries
    const enMatch = docsCode.match(/en:\s*{([^}]+)}/s);
    const tlMatch = docsCode.match(/tl:\s*{([^}]+)}/s);
    results.docs = {
      hasEn: !!enMatch,
      hasTl: !!tlMatch
    };
  }

  return results;
}

function run() {
  console.log('=== ZAPWEBP TRANSLATION AUDIT ===\n');
  const jsonReport = auditJsonFiles();
  console.log(`Total EN keys across JSON catalogs: ${jsonReport.totalEnKeys}`);
  console.log(`Total TL keys across JSON catalogs: ${jsonReport.totalTlKeys}`);
  console.log(`Missing in TL: ${jsonReport.missingInTl.length}`);
  console.log(`Extra in TL: ${jsonReport.extraInTl.length}`);
  console.log(`Empty/Null in TL: ${jsonReport.emptyOrNullInTl.length}`);
  console.log(`Suspicious Identical Values: ${jsonReport.identicalValues.length}`);
  console.log(`Variable Mismatches: ${jsonReport.variableMismatches.length}`);

  if (jsonReport.missingInTl.length > 0) {
    console.log('\n--- Missing in TL ---');
    console.log(JSON.stringify(jsonReport.missingInTl, null, 2));
  }
  if (jsonReport.extraInTl.length > 0) {
    console.log('\n--- Extra in TL ---');
    console.log(JSON.stringify(jsonReport.extraInTl, null, 2));
  }
  if (jsonReport.identicalValues.length > 0) {
    console.log('\n--- Identical Values ---');
    console.log(JSON.stringify(jsonReport.identicalValues, null, 2));
  }
  if (jsonReport.variableMismatches.length > 0) {
    console.log('\n--- Variable Mismatches ---');
    console.log(JSON.stringify(jsonReport.variableMismatches, null, 2));
  }

  const codeAudit = auditCodeCatalogs();
  console.log('\n--- In-Code Catalogs ---');
  console.log(JSON.stringify(codeAudit, null, 2));
}

run();
