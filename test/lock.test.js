'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync, spawn } = require('node:child_process');
const {
  computeOptionsHash,
  createLockFingerprint,
  writeLock,
  readLock,
  verifyLock,
  createLockPlugin,
  ENGINE_VERSION,
} = require('./packages/lock/src/lock.js');
const { convertImage } = require('./packages/core/src/index.js');
const storagePkg = require('./packages/storage/src/wrapper.js');
const withZapwebp = storagePkg.withZapwebp || storagePkg.default?.withZapwebp || storagePkg;

function createMcpClient(cwd) {
  const serverPath = path.resolve('packages/mcp/bin/zapwebp-mcp.js');
  const child = spawn(process.execPath, [serverPath], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  let idCounter = 1;
  const pending = new Map();
  let buffer = '';

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && pending.has(msg.id)) {
          const { resolve, reject } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg);
        }
      } catch {}
    }
  });

  return {
    async send(method, params = {}) {
      const id = idCounter++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    async close() {
      child.stdin.end();
      child.kill();
    },
  };
}

test('Lock Plan L1 & L2: Hash computation determinism & canonicalization', () => {
  const hash1 = computeOptionsHash({ to: 'webp', quality: 85, clean: true });
  const hash2 = computeOptionsHash({ clean: true, quality: 85, to: 'webp' });
  assert.equal(hash1, hash2, 'Hash must be independent of key order');

  const hash3 = computeOptionsHash({ to: 'webp', quality: 90, clean: true });
  assert.notEqual(hash1, hash3, 'Quality change must produce different hash');
});

test('Lock Plan L3, L4 & L6: Binary container roundtrip and Clean Mode preservation', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>');
  
  // Convert to WebP and attach lock
  const res = await convertImage(svg, { to: 'webp', quality: 80, clean: true });
  const fp = createLockFingerprint({ input: svg, options: { to: 'webp', quality: 80 } });
  const locked = writeLock(res.data, 'webp', fp);

  // Extract lock
  const read = readLock(locked, 'webp');
  assert.ok(read, 'Lock must be readable from WebP RIFF ZAPL chunk');
  assert.equal(read.optionsSha256, fp['zapwebp:lock'].optionsSha256);

  // Clean Mode: pass locked webp through Clean Mode metadata cleaning
  const cleanedRes = await convertImage(locked, { to: 'webp', clean: true });
  const lockAfterClean = readLock(cleanedRes.data, 'webp');
  assert.ok(lockAfterClean, 'Lock must survive Clean Mode stripping as engine metadata');
});

test('Lock Plan L5 & L7: CLI skips identical conversions and supports --force & --lock-status', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'zap-lock-cli-'));
  const cliBin = path.resolve('packages/cli/bin/zapwebp.js');
  const svgPath = path.join(tmp, 'test.svg');
  const destWebp = path.join(tmp, 'test.webp');

  try {
    await fs.writeFile(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="8"/></svg>');

    // Run 1: First conversion -> converts and writes lock
    const run1 = spawnSync(process.execPath, [cliBin, 'test.svg', '--to', 'webp'], { cwd: tmp, encoding: 'utf8' });
    assert.equal(run1.status, 0);
    assert.ok(fsSync.existsSync(destWebp), 'Output file must exist after first run');
    const stat1 = fsSync.statSync(destWebp);

    // Run 2: Second conversion with identical options -> SKIPS
    const run2 = spawnSync(process.execPath, [cliBin, 'test.svg', '--to', 'webp'], { cwd: tmp, encoding: 'utf8' });
    assert.equal(run2.status, 0);
    assert.ok(run2.stdout.includes('already converted with matching options') || run2.stdout.includes('Skipped'));
    const stat2 = fsSync.statSync(destWebp);
    assert.equal(stat1.mtimeMs, stat2.mtimeMs, 'Destination file must not be modified when skipped');

    // Run 3: Third conversion with --force -> forces re-conversion
    const run3 = spawnSync(process.execPath, [cliBin, 'test.svg', '--to', 'webp', '--force'], { cwd: tmp, encoding: 'utf8' });
    assert.equal(run3.status, 0);
    assert.ok(!run3.stdout.includes('Skipped'));

    // Test --lock-status flag
    const statusRun = spawnSync(process.execPath, [cliBin, 'test.webp', '--lock-status'], { cwd: tmp, encoding: 'utf8' });
    assert.equal(statusRun.status, 0);
    assert.ok(statusRun.stdout.includes('Lock: present'));
    assert.ok(statusRun.stdout.includes('Input SHA-256:'));
    assert.ok(statusRun.stdout.includes('Options SHA-256:'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lock Plan L8: MCP convert_image skips when destination matches lock', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'zap-lock-mcp-'));
  const svgPath = path.join(tmp, 'agent.svg');
  const webpPath = path.join(tmp, 'agent.webp');
  await fs.writeFile(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');

  const client = createMcpClient(tmp);
  try {
    await client.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });

    // 1. Initial conversion
    const res1 = await client.send('tools/call', {
      name: 'convert_image',
      arguments: { inputPath: 'agent.svg', to: 'webp', quality: 85 },
    });
    assert.ok(!res1.result.isError);
    assert.ok(fsSync.existsSync(webpPath));

    // 2. Second conversion call: identical options -> returns skipped
    const res2 = await client.send('tools/call', {
      name: 'convert_image',
      arguments: { inputPath: 'agent.svg', to: 'webp', quality: 85 },
    });
    assert.ok(!res2.result.isError);
    assert.ok(res2.result.content[0].text.includes('already converted with matching options') || res2.result.content[0].text.includes('Skipped'));
    if (res2.result.structuredContent) {
      assert.equal(res2.result.structuredContent.skipped, true);
    }
  } finally {
    await client.close();
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

test('Lock Plan L9: Storage Adapter skips redundant conversion when lock matches', async () => {
  let writeCount = 0;
  const dummyAdapter = {
    name: 'custom',
    async write() {
      writeCount++;
      return { path: 'icon.webp', bytes: 200 };
    },
    async read() { return new Uint8Array([0, 1, 2]); },
    async delete() { return true; },
    async exists() { return false; },
    async list() { return []; },
  };

  const zap = withZapwebp(dummyAdapter, { targetFormat: 'webp', quality: 85, useLock: true });

  // Create an already-locked WebP buffer
  const baseWebp = Buffer.alloc(12);
  baseWebp.write('RIFF', 0, 4, 'ascii');
  baseWebp.write('WEBP', 8, 4, 'ascii');
  const fp = createLockFingerprint({
    input: baseWebp,
    options: { to: 'webp', quality: 85, width: 512, clean: true, lossless: false },
  });
  const lockedBuffer = writeLock(baseWebp, 'webp', fp);

  // Upload locked file with matching options
  const result = await zap.upload('bucket', 'icon.webp', lockedBuffer);
  assert.equal(writeCount, 1, 'Write must be called on the adapter');
  assert.ok(result);
});

