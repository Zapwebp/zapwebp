'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOYMENTS = [
  { dir: 'packages/config', repo: 'config' },
  { dir: 'packages/shared', repo: 'shared' },
  { dir: 'packages/core', repo: 'core' },
  { dir: 'packages/ui', repo: 'ui' },
  { dir: 'packages/cli', repo: 'cli' },
  { dir: 'packages/features', repo: 'features' },
  { dir: 'packages/plugin-sdk', repo: 'plugin-sdk' },
  { dir: 'packages/crop', repo: 'crop' },
  { dir: 'packages/storage', repo: 'storage' },
  { dir: 'packages/edge', repo: 'edge' },
  { dir: 'packages/api', repo: 'api' },
  { dir: 'packages/sdk', repo: 'sdk' },
  { dir: 'packages/mcp', repo: 'mcp' },
  { dir: 'packages/lens', repo: 'lens' },
  { dir: 'packages/create-zapwebp', repo: 'create-zapwebp' },
  { dir: 'packages/vite', repo: 'vite' },
  { dir: 'packages/next', repo: 'next' },
  { dir: 'packages/github-action', repo: 'github-action' },
  { dir: 'packages/laravel', repo: 'laravel' },
  { dir: 'apps/vscode', repo: 'vscode' },
  { dir: 'zapwebp-docs', repo: 'docs' },
  { dir: 'public', repo: 'web' },
];

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function copyRecursive(src, dest, isVsCode = false) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.endsWith('.vsix')) {
      continue;
    }
    if (entry.name === 'dist' && !isVsCode) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath, isVsCode);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function deployOne(item) {
  console.log(`\n========================================`);
  console.log(`Deploying ${item.dir} -> Zapwebp/${item.repo}...`);
  console.log(`========================================`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `zap-deploy-${item.repo}-`));

  try {
    let hasRemoteCommits = false;
    try {
      execSync(`git clone https://github.com/Zapwebp/${item.repo}.git .`, { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
      hasRemoteCommits = true;
    } catch {
      // Empty repo or clone failed
      execSync('git init -b main', { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
      execSync(`git remote add origin https://github.com/Zapwebp/${item.repo}.git`, { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
    }

    // Clean out existing working files in clone except .git
    const existingEntries = fs.readdirSync(tmp);
    for (const entry of existingEntries) {
      if (entry === '.git') continue;
      fs.rmSync(path.join(tmp, entry), { recursive: true, force: true });
    }

    // Copy all files from source directory
    copyRecursive(item.dir, tmp, item.dir === 'apps/vscode');

    // Ensure LICENSE
    if (!fs.existsSync(path.join(tmp, 'LICENSE'))) {
      fs.copyFileSync('LICENSE', path.join(tmp, 'LICENSE'));
    }

    // Ensure README
    if (!fs.existsSync(path.join(tmp, 'README.md'))) {
      fs.writeFileSync(path.join(tmp, 'README.md'), `# Zapwebp ${item.repo}\n\nOfficial repository for Zapwebp ${item.repo}.\n\n- Website: https://zapwebp.vercel.app\n- Docs: https://zapwebp-docs.vercel.app\n`);
    }

    // Ensure .gitignore
    if (!fs.existsSync(path.join(tmp, '.gitignore'))) {
      const gitignore = item.dir === 'apps/vscode'
        ? 'node_modules/\n*.vsix\n.env\npnpm-debug.log\n'
        : 'node_modules/\ndist/\n*.vsix\n.env\npnpm-debug.log\n';
      fs.writeFileSync(path.join(tmp, '.gitignore'), gitignore);
    }

    // Git add and status
    execSync('git add -A', { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
    const status = execSync('git status --porcelain', { cwd: tmp }).toString().trim();

    if (!status) {
      console.log(`✓ No changes for Zapwebp/${item.repo} (already up to date)`);
      return;
    }

    // Commit
    execSync('git commit -m "feat: complete Zapwebp ecosystem release distribution"', { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });

    // Push with retry
    let pushed = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Pushing to Zapwebp/${item.repo} (attempt ${attempt})...`);
        execSync('git push -u origin main', { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
        console.log(`✓ Successfully deployed Zapwebp/${item.repo}`);
        pushed = true;
        break;
      } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : err.message;
        console.error(`Push attempt ${attempt} failed for ${item.repo}:`, stderr.trim());
        sleep(2000 * attempt);
      }
    }

    if (!pushed) {
      console.error(`FAILED to push Zapwebp/${item.repo} after 3 attempts.`);
    }
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

async function runAll() {
  for (const item of DEPLOYMENTS) {
    await deployOne(item);
    sleep(1000);
  }
  console.log('\nAll deployments completed!');
}

runAll().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
