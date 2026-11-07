'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name.endsWith('.vsix')) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-deploy-web-'));
try {
  console.log('Cloning Zapwebp/web...');
  execSync('git clone https://github.com/Zapwebp/web.git .', { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
  copyRecursive('public', tmp);
  if (!fs.existsSync(path.join(tmp, 'LICENSE'))) fs.copyFileSync('LICENSE', path.join(tmp, 'LICENSE'));
  if (!fs.existsSync(path.join(tmp, 'README.md'))) {
    fs.writeFileSync(path.join(tmp, 'README.md'), '# Zapwebp Web\n\nOfficial web application for Zapwebp (https://zapwebp.vercel.app).\n');
  }
  execSync('git add -A', { cwd: tmp });
  const status = execSync('git status --porcelain', { cwd: tmp }).toString().trim();
  if (!status) {
    console.log('✓ Zapwebp/web already up to date');
  } else {
    console.log('Committing changes to Zapwebp/web:\n' + status);
    execSync('git commit -m "feat: open-source icons, minimal look, and fix dropzone event bubbling (v2.11.1)"', { cwd: tmp });
    console.log('Pushing to Zapwebp/web...');
    execSync('git push origin main', { cwd: tmp });
    console.log('✓ Successfully deployed Zapwebp/web!');
  }
} finally {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}
}

