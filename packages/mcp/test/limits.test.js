'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/zapwebp-mcp.js');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="#8dc63f"/></svg>';

function createMcpClient(cwd) {
  const child = spawn(process.execPath, [bin], {
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

test('MCP Limits: batch_convert enforces maxFilesPerRequest and returns structured error', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-mcp-limits-'));
  const client = createMcpClient(tmpDir);

  try {
    await client.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });

    // Write custom config with maxFilesPerRequest = 3
    await mkdir(path.join(tmpDir, '.zapwebp'), { recursive: true });
    await writeFile(
      path.join(tmpDir, '.zapwebp', 'config.json'),
      JSON.stringify({
        limits: {
          maxFilesPerRequest: 3,
        },
      }),
      'utf8'
    );

    // Create 5 SVG icons
    await mkdir(path.join(tmpDir, 'icons'), { recursive: true });
    for (let i = 1; i <= 5; i++) {
      await writeFile(path.join(tmpDir, 'icons', `icon${i}.svg`), svg, 'utf8');
    }

    // Call batch_convert which matches 5 files > 3 limit
    const res = await client.send('tools/call', {
      name: 'batch_convert',
      arguments: {
        input: 'icons/*.svg',
        outDir: 'dist',
      },
    });

    assert.equal(res.result.isError, true);
    const content = JSON.parse(res.result.content[0].text);
    assert.equal(content.error, 'E_TOO_MANY_FILES');
    assert.ok(content.message.includes('matched 5 files'));
    assert.ok(content.message.includes('limit is 3'));
    assert.equal(content.suggestedFix.maxFiles, 3);
    assert.equal(content.suggestedFix.glob, 'icons/*.svg');

    // Call with explicit maxFiles override: 10
    const overrideRes = await client.send('tools/call', {
      name: 'batch_convert',
      arguments: {
        input: 'icons/*.svg',
        outDir: 'dist',
        maxFiles: 10,
      },
    });

    assert.equal(overrideRes.result.isError, undefined);
    const overrideData = JSON.parse(overrideRes.result.content[0].text);
    assert.equal(overrideData.converted.length, 5);
    assert.ok(overrideData.limits);
    assert.equal(overrideData.limits.filesProcessed, 5);
    assert.equal(overrideData.limits.remainingFiles, 0); // 3 from config
  } finally {
    await client.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('MCP Limits: convert_image and batch_convert return limits metadata block', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-mcp-meta-'));
  const client = createMcpClient(tmpDir);

  try {
    await client.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });

    await writeFile(path.join(tmpDir, 'single.svg'), svg, 'utf8');

    const singleRes = await client.send('tools/call', {
      name: 'convert_image',
      arguments: {
        inputPath: 'single.svg',
      },
    });

    assert.equal(singleRes.result.isError, undefined);
    const singleData = JSON.parse(singleRes.result.content[0].text);
    assert.ok(singleData.limits);
    assert.equal(singleData.limits.filesProcessed, 1);
    assert.equal(singleData.limits.filesRemaining, 19);
    assert.ok(singleData.limits.bytesProcessed > 0);
    assert.ok(singleData.limits.bytesRemaining > 0);
  } finally {
    await client.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
