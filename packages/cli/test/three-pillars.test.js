'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../bin/zap.js');

function runCli(args, cwd, env = {}) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [cliPath, ...args], {
      cwd,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="#3b82f6"/></svg>';

test('CLI Three Pillars: zap init --team scaffolds zapwebp.policy.json', async (t) => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-team-'));
  t.after(async () => {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  });

  const res = await runCli(['init', '--team'], tmp);
  assert.equal(res.code, 0);
  assert.ok(res.stdout.includes('zapwebp.policy.json'));

  const policyPath = path.join(tmp, 'zapwebp.policy.json');
  assert.ok(await stat(policyPath));

  const content = JSON.parse(await readFile(policyPath, 'utf8'));
  assert.equal(content.version, '1.0.0');
  assert.ok(content.policy);
  assert.ok(content.enforcement);
});

test('CLI Three Pillars: zap policy validate and zap policy status', async (t) => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-policy-'));
  t.after(async () => {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  });

  await runCli(['init', '--team'], tmp);

  // Validate
  const valRes = await runCli(['policy', 'validate'], tmp);
  assert.equal(valRes.code, 0);
  assert.ok(valRes.stdout.includes('zapwebp.policy.json is valid'));

  // Status
  const statusRes = await runCli(['policy', 'status'], tmp);
  assert.equal(statusRes.code, 0);
  assert.ok(statusRes.stdout.includes('Zapwebp Team Policy Status'));
  assert.ok(statusRes.stdout.includes('Target:'));
});

test('CLI Three Pillars: zap report produces aggregate metrics from transaction journal', async (t) => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-report-'));
  t.after(async () => {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  });

  await mkdir(path.join(tmp, 'src'), { recursive: true });
  await writeFile(path.join(tmp, 'src', 'icon.svg'), SAMPLE_SVG);

  // Run conversion to generate journal entry
  const convRes = await runCli(['src/icon.svg', '--to', 'webp'], tmp);
  assert.equal(convRes.code, 0);

  // Report table
  const repRes = await runCli(['report'], tmp);
  assert.equal(repRes.code, 0);
  assert.ok(repRes.stdout.includes('Zapwebp Performance Report'));
  assert.ok(repRes.stdout.includes('Files:'));
  assert.ok(repRes.stdout.includes('Carbon offset estimate:'));

  // Report json
  const jsonRes = await runCli(['report', '--json'], tmp);
  assert.equal(jsonRes.code, 0);
  const repData = JSON.parse(jsonRes.stdout);
  assert.ok(repData.totalFiles >= 1);
  assert.ok(repData.originalBytes > 0);
});

test('CLI Three Pillars: zap --smart --explain analyzes image and provides recommendation', async (t) => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zap-smart-'));
  t.after(async () => {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  });

  await writeFile(path.join(tmp, 'logo.svg'), SAMPLE_SVG);

  const smartRes = await runCli(['logo.svg', '--smart', '--explain'], tmp);
  assert.equal(smartRes.code, 0);
  assert.ok(smartRes.stdout.includes('Detected:'));
  assert.ok(smartRes.stdout.includes('Recommended:'));
  assert.ok(smartRes.stdout.includes('Reason:'));
});
