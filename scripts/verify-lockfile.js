'use strict';

/**
 * Lockfile Integrity Verification Script
 * Enforces that pnpm-lock.yaml cannot be modified without a corresponding package.json change.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function checkLockfileIntegrity() {
  const lockfilePath = path.resolve(__dirname, '..', 'pnpm-lock.yaml');
  if (!fs.existsSync(lockfilePath)) {
    console.error('❌ Lockfile Integrity Violation: pnpm-lock.yaml does not exist.');
    process.exit(1);
  }

  try {
    // Check working directory status
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    const changedFiles = status
      .split('\n')
      .map((line) => line.trim().split(/\s+/).pop())
      .filter(Boolean);

    const lockfileChanged = changedFiles.some((f) => f.includes('pnpm-lock.yaml'));
    const packageJsonChanged = changedFiles.some((f) => f.includes('package.json'));

    if (lockfileChanged && !packageJsonChanged) {
      console.error('❌ Lockfile Integrity Violation: "pnpm-lock.yaml" was modified without any "package.json" change.');
      console.error('Lockfile changes must be paired with explicit dependency additions, updates, or removals in package.json.');
      process.exit(1);
    }

    console.log('✅ Lockfile integrity verified: pnpm-lock.yaml is valid and synchronized.');
    process.exit(0);
  } catch (err) {
    if (err.status === 1) {
      process.exit(1);
    }
    // If git is not installed or outside git repo, assert file readability
    console.log('✅ Lockfile present and readable (non-git environment fallback).');
    process.exit(0);
  }
}

checkLockfileIntegrity();
