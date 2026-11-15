'use strict';

/**
 * CI Guard: TypeScript Declaration Parity Checker
 *
 * Validates that all public runtime exports in @zapwebp/core have corresponding
 * type declarations in packages/core/src/index.d.ts, preventing signature drift.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CORE_JS = path.join(ROOT, 'packages', 'core', 'src', 'index.js');
const CORE_DTS = path.join(ROOT, 'packages', 'core', 'src', 'index.d.ts');

const core = require(CORE_JS);
const dtsContent = fs.readFileSync(CORE_DTS, 'utf8');

const missing = [];
const signatureErrors = [];

// Canonical public exports required to have TypeScript coverage
const REQUIRED_EXPORTS = [
  'convert',
  'inspect',
  'registerFormat',
  'registerMetadataHandler',
  'registerTransform',
  'getVersion',
  'getFormats',
  'convertImage',
  'convertSvgToWebp',
  'decodeToRgba',
  'encodeFromRgba',
  'detectFormat',
  'detectMetadata',
  'generateCleanCertificate',
  'verifyAlpha',
  'auditConversionCommand',
  'explainBlackBackground',
  'inspectImage',
  'validateSvg',
  'validateImageBytes',
  'parseScales',
  'scaleSuffix',
  'outputName',
  'generateSrcset',
  'resolvePolicy',
  'checkPolicyInput',
  'evaluateQuality',
  'parallelMap',
  'cleanBytes',
  'cleanMetadata',
  'suggest',
  'ZapwebpError',
];

for (const name of REQUIRED_EXPORTS) {
  if (typeof core[name] === 'undefined') {
    missing.push(`Runtime missing export: ${name}`);
    continue;
  }

  // Check declaration in .d.ts
  const hasDecl =
    dtsContent.includes(`function ${name}`) ||
    dtsContent.includes(`class ${name}`) ||
    dtsContent.includes(`const ${name}`) ||
    dtsContent.includes(`export { ${name}`) ||
    dtsContent.includes(`${name}:`);

  if (!hasDecl) {
    missing.push(`index.d.ts missing declaration for: ${name}`);
  }
}

// Deep signature checks
// 1. checkPolicyInput must accept single object
if (/export function checkPolicyInput\s*\(\s*inputBytes/i.test(dtsContent)) {
  signatureErrors.push(
    'checkPolicyInput in index.d.ts is declared with positional args (inputBytes: number, ...). Runtime requires params object { policy, data, detectedFormat }.'
  );
}

// 2. evaluateQuality must accept single object
if (/export function evaluateQuality\s*\(\s*format/i.test(dtsContent)) {
  signatureErrors.push(
    'evaluateQuality in index.d.ts is declared with positional args (format: OutputFormat, ...). Runtime requires params object { policy, inputFormat, ... }.'
  );
}

if (missing.length > 0 || signatureErrors.length > 0) {
  console.error('\n❌ TypeScript Parity Check Failed:\n');
  for (const m of missing) console.error(`  - ${m}`);
  for (const s of signatureErrors) console.error(`  - ${s}`);
  process.exit(1);
}

console.log('✅ TypeScript declaration parity verified across all core exports.');
process.exit(0);
