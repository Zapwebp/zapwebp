'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const cliPath = path.resolve(__dirname, '../bin/zapwebp-docs.js');

test('CLI: --help prints usage guide', () => {
  const run = spawnSync(process.execPath, [cliPath, '--help'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.ok(run.stdout.includes('zapwebp-docs — Universal Documentation Delivery Engine'));
  assert.ok(run.stdout.includes('build'));
  assert.ok(run.stdout.includes('serve'));
  assert.ok(run.stdout.includes('init'));
});

test('CLI: --version prints version', () => {
  const run = spawnSync(process.execPath, [cliPath, '--version'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.ok(run.stdout.includes('@zapwebp/docs v1.0.0'));
});

test('CLI: init scaffolds starter files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-docs-cli-init-'));
  const run = spawnSync(process.execPath, [cliPath, 'init'], { cwd: tmpDir, encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.ok(fs.existsSync(path.join(tmpDir, 'docs.config.json')));
  assert.ok(fs.existsSync(path.join(tmpDir, 'content', 'index.md')));
});

test('CLI: build compiles docs from command line with --json flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zap-docs-cli-build-'));
  const contentDir = path.join(tmpDir, 'content');
  const distDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(contentDir, { recursive: true });

  fs.writeFileSync(path.join(contentDir, 'index.md'), '# Index\n\nContent');
  fs.writeFileSync(path.join(contentDir, 'about.md'), '# About\n\nAbout us');

  const run = spawnSync(
    process.execPath,
    [cliPath, 'build', '--content', contentDir, '--output', distDir, '--json'],
    { cwd: tmpDir, encoding: 'utf8' }
  );

  assert.equal(run.status, 0, `CLI build failed: ${run.stderr}`);
  const report = JSON.parse(run.stdout);
  assert.equal(report.success, true);
  assert.equal(report.pageCount, 2);
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')));
  assert.ok(fs.existsSync(path.join(distDir, 'about', 'index.html')));
  assert.ok(fs.existsSync(path.join(distDir, 'llms.txt')));
  assert.ok(fs.existsSync(path.join(distDir, 'agent.json')));
});
