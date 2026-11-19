'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { loadConfigFile, DEFAULT_CONFIG } from '../packages/cli/src/config.js';
import { undoTransaction } from '../packages/cli/src/journal.js';
import forkPkg from '../packages/github-action/src/fork.js';
const { assertForkSafety } = forkPkg;
import storagePkg from '../packages/storage/src/wrapper.js';
const { withZapwebp } = storagePkg;

const cliBin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/cli/bin/zapwebp.js');
const mcpBin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/mcp/bin/zapwebp-mcp.js');

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf8', timeout: 30000 });
}

function createMcpClient(cwd) {
  const child = spawn(process.execPath, [mcpBin], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ZAPWEBP_ROOT: cwd },
  });

  let nextId = 1;
  const pending = new Map();
  let buffer = '';

  child.stdout.setEncoding('utf8').on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && pending.has(msg.id)) {
          pending.get(msg.id)(msg);
          pending.delete(msg.id);
        }
      } catch {}
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`MCP request timeout for ${method}`));
      }
    }, 10000);
    timer.unref();
  });

  const close = async () => {
    child.kill();
    await once(child, 'exit').catch(() => {});
  };

  return { send, close };
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

test('Deletion Plan D1: Config schema defaults and resolution', async () => {
  assert.equal(DEFAULT_CONFIG.allowDeleteOriginal, false, 'allowDeleteOriginal must be false by default');
  assert.equal(DEFAULT_CONFIG.deleteBackupRetentionDays, 30, 'deleteBackupRetentionDays must default to 30');

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'zap-cfg-test-'));
  try {
    const zapDir = path.join(tmp, '.zapwebp');
    await fs.mkdir(zapDir, { recursive: true });
    await fs.writeFile(path.join(zapDir, 'config.json'), JSON.stringify({
      allowDeleteOriginal: true,
      deleteBackupRetentionDays: 14,
    }));

    const { config } = await loadConfigFile(tmp);
    assert.equal(config.allowDeleteOriginal, true);
    assert.equal(config.deleteBackupRetentionDays, 14);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

test('Deletion Plan D3 & D10: CLI refuses deletion without opt-in and restores on undo', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'zap-cli-delete-'));
  try {
    const svgPath = path.join(tmp, 'test-delete.svg');
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="green"/></svg>';
    await fs.writeFile(svgPath, svgContent);
    const origHash = sha256(Buffer.from(svgContent));

    // 1. Without allowDeleteOriginal in config and without --yes in non-TTY: must exit with error code and E_DELETE_NOT_ENABLED
    const resRefuse = runCli(['test-delete.svg', '--to', 'webp', '--delete-original'], tmp);
    assert.notEqual(resRefuse.status, 0);
    assert.match(resRefuse.stderr, /E_DELETE_NOT_ENABLED/);
    assert.ok(fsSync.existsSync(svgPath), 'Source file must not be deleted when opt-in is missing');

    // 2. With --yes: deletion executes, writes verified backup to .zapwebp/backups/
    const resAllow = runCli(['test-delete.svg', '--to', 'webp', '--delete-original', '--yes'], tmp);
    assert.equal(resAllow.status, 0, resAllow.stderr);

    const outWebp = path.join(tmp, 'test-delete.webp');
    assert.ok(fsSync.existsSync(outWebp), 'Converted WebP must exist');
    assert.ok(!fsSync.existsSync(svgPath), 'Source SVG must be unlinked after conversion');

    // Verify backup exists
    const backupsDir = path.join(tmp, '.zapwebp', 'backups');
    assert.ok(fsSync.existsSync(backupsDir), '.zapwebp/backups directory must exist');
    const sessions = await fs.readdir(backupsDir);
    assert.ok(sessions.length > 0, 'Backup session directory must exist');
    const backupFile = path.join(backupsDir, sessions[0], 'test-delete.svg');
    assert.ok(fsSync.existsSync(backupFile), 'Backup file must exist');

    const backupBytes = await fs.readFile(backupFile);
    assert.equal(sha256(backupBytes), origHash, 'Backup file must match original SHA-256 hash');

    // 3. Test undoTransaction: restores original file identically
    const undoRes = await undoTransaction(tmp);
    assert.ok(undoRes.undoneCount > 0, 'Undo must report restored operations');
    assert.ok(fsSync.existsSync(svgPath), 'Source SVG must be restored by undoTransaction');
    const restoredBytes = await fs.readFile(svgPath);
    assert.equal(sha256(restoredBytes), origHash, 'Restored file must be bit-for-bit identical to original');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

test('Deletion Plan D5: MCP tool refuses deletion without config and handles backup/undo', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'zap-mcp-delete-'));
  const client = createMcpClient(tmp);
  try {
    await client.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });

    const svgPath = path.join(tmp, 'mcp-test.svg');
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>';
    await fs.writeFile(svgPath, svgContent);

    // 1. Without config: refuse deletion
    const refuseRes = await client.send('tools/call', {
      name: 'convert_image',
      arguments: {
        inputPath: 'mcp-test.svg',
        to: 'webp',
        deleteOriginal: true,
      },
    });

    assert.ok(refuseRes.result.isError, 'Tool result must indicate error');
    assert.ok(refuseRes.result.content[0].text.includes('E_DELETE_NOT_ENABLED') || refuseRes.result.content[0].text.includes('disabled for AI agents'));
    assert.ok(fsSync.existsSync(svgPath), 'File must not be deleted');

    // 2. Enable in .zapwebp/config.json
    const zapDir = path.join(tmp, '.zapwebp');
    await fs.mkdir(zapDir, { recursive: true });
    await fs.writeFile(path.join(zapDir, 'config.json'), JSON.stringify({ allowDeleteOriginal: true }));

    // 3. Re-run tool: deletion should now succeed with backup
    const successRes = await client.send('tools/call', {
      name: 'convert_image',
      arguments: {
        inputPath: 'mcp-test.svg',
        to: 'webp',
        deleteOriginal: true,
      },
    });

    assert.ok(!successRes.result.isError, 'Tool execution should succeed with allowDeleteOriginal: true');
    assert.ok(!fsSync.existsSync(svgPath), 'Source SVG must be deleted');
    const parsed = JSON.parse(successRes.result.content[0].text);
    assert.equal(parsed.originalDeleted, true);
    assert.ok(parsed.backupPath);

    // 4. Test undo_last tool
    const undoRes = await client.send('tools/call', {
      name: 'undo_last',
      arguments: { force: true },
    });
    assert.ok(!undoRes.result.isError, 'undo_last must succeed');
    assert.ok(fsSync.existsSync(svgPath), 'Original SVG must be restored by undo_last tool');
  } finally {
    await client.close();
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

test('Deletion Plan D8: Storage Adapter refuses original deletion without opt-in', async () => {
  const dummyAdapter = {
    name: 'custom',
    async write() { return { path: 'test.webp', bytes: 100 }; },
    async read() { return new Uint8Array([0, 1, 2]); },
    async delete() {},
  };

  const wrapper = withZapwebp(dummyAdapter, {
    deleteOriginal: true,
    allowDeleteOriginal: false,
  });

  const samplePng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');

  await assert.rejects(
    async () => {
      await wrapper.upload('my-bucket', 'avatar.png', samplePng);
    },
    (err) => {
      assert.equal(err.code, 'E_DELETE_NOT_ENABLED');
      return true;
    }
  );
});

test('Deletion Plan D9: CI Guard strictly forbids original file deletion on fork pull requests', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'zap-ci-guard-'));
  try {
    const eventFile = path.join(tmp, 'event.json');
    await fs.writeFile(eventFile, JSON.stringify({
      pull_request: {
        head: {
          repo: {
            fork: true,
          },
        },
      },
    }));

    const mockEnv = {
      GITHUB_EVENT_PATH: eventFile,
    };

    assert.throws(
      () => {
        assertForkSafety({ deleteOriginal: true, mode: 'check' }, mockEnv);
      },
      (err) => {
        assert.equal(err.code, 'E_FORK_DELETE_FORBIDDEN');
        return true;
      }
    );

    assert.throws(
      () => {
        assertForkSafety({ keepOriginal: false, mode: 'check' }, mockEnv);
      },
      (err) => {
        assert.equal(err.code, 'E_FORK_DELETE_FORBIDDEN');
        return true;
      }
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});
