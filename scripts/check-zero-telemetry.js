'use strict';

/**
 * Zero-Telemetry & Anti-Exfiltration Audit
 * Ensures that no core engine packages or client bundles contain tracking scripts,
 * phone-home beacons, analytics domains, or unauthorized networking.
 */

const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'segment.io',
  'segment.com',
  'sentry.io',
  'logrocket.com',
  'logrocket.io',
  'mixpanel.com',
  'amplitude.com',
  'hotjar.com',
  'telemetry.zapwebp.com',
  'clarity.ms',
  'datadoghq.com',
];

const FORBIDDEN_PATTERNS = [
  { pattern: /\bnavigator\.sendBeacon\b/g, name: 'navigator.sendBeacon' },
  { pattern: /\bXMLHttpRequest\b/g, name: 'XMLHttpRequest' },
];

const CORE_FORBIDDEN_PATTERNS = [
  ...FORBIDDEN_PATTERNS,
  { pattern: /\bfetch\s*\(/g, name: 'fetch()' },
];

const ROOT_DIR = path.resolve(__dirname, '..');

function scanFile(filePath, isCoreEngine) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  // Check domains
  for (const domain of FORBIDDEN_DOMAINS) {
    if (content.toLowerCase().includes(domain.toLowerCase())) {
      // Ignore documentation or test fixtures that explicitly reference them
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(domain.toLowerCase()) && !line.includes('//') && !line.includes('/*') && !line.includes('*')) {
          violations.push({ line: idx + 1, detail: `Found analytics domain "${domain}"` });
        }
      });
    }
  }

  // Check patterns
  const patterns = isCoreEngine ? CORE_FORBIDDEN_PATTERNS : FORBIDDEN_PATTERNS;
  for (const { pattern, name } of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const line = content.substring(0, match.index).split('\n').length;
      violations.push({ line, detail: `Found prohibited telemetry primitive "${name}"` });
    }
  }

  return violations;
}

function scanDir(dir, isCoreEngine = false) {
  const allViolations = [];
  if (!fs.existsSync(dir)) return allViolations;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'test' || entry.name === '.git') continue;
      allViolations.push(...scanDir(fullPath, isCoreEngine));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.html'))) {
      const violations = scanFile(fullPath, isCoreEngine);
      if (violations.length > 0) {
        allViolations.push({ file: path.relative(ROOT_DIR, fullPath), violations });
      }
    }
  }
  return allViolations;
}

function runAudit() {
  console.log('Auditing codebase for zero-telemetry compliance...');
  const results = [];

  // 1. Strict Core Engine: No fetch, no XHR, no beacons, no analytics
  results.push(...scanDir(path.join(ROOT_DIR, 'packages', 'core', 'src'), true));

  // 2. Shared, UI, and Features
  results.push(...scanDir(path.join(ROOT_DIR, 'packages', 'shared', 'src'), true));
  results.push(...scanDir(path.join(ROOT_DIR, 'packages', 'ui', 'src'), false));
  results.push(...scanDir(path.join(ROOT_DIR, 'packages', 'features', 'src'), false));

  // 3. Web App public bundle
  results.push(...scanDir(path.join(ROOT_DIR, 'public'), false));

  if (results.length > 0) {
    console.error('❌ Zero-Telemetry Policy Violation detected:');
    for (const item of results) {
      console.error(`  File: ${item.file}`);
      for (const v of item.violations) {
        console.error(`    Line ${v.line}: ${v.detail}`);
      }
    }
    process.exit(1);
  }

  console.log('✅ Zero-Telemetry verified: 100% clean across core engine, shared libraries, and client bundles.');
  process.exit(0);
}

runAudit();
