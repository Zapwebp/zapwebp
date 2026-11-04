'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
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

test('MCP server initializes, lists tools, converts images and enforces root sandbox', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-mcp-'));
  const client = createMcpClient(tmpDir);
  t.after(async () => {
    await client.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  await mkdir(path.join(tmpDir, 'icons'), { recursive: true });
  await writeFile(path.join(tmpDir, 'icons', 'star.svg'), svg);

  // 1. Initialize
  const init = await client.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });
  assert.equal(init.result.serverInfo.name, 'zapwebp');

  // 2. List tools
  const list = await client.send('tools/list', {});
  const toolNames = list.result.tools.map((tool) => tool.name);
  assert.ok(toolNames.includes('convert_image'));
  assert.ok(toolNames.includes('convert_svg_to_webp'));
  assert.ok(toolNames.includes('inspect_image'));
  assert.ok(toolNames.includes('batch_convert'));
  assert.ok(toolNames.includes('verify_clean'));
  assert.ok(toolNames.includes('audit_conversion'));
  assert.ok(toolNames.includes('explain_black_background'));

  // 2b. List prompts
  const promptList = await client.send('prompts/list', {});
  const promptNames = promptList.result.prompts.map((p) => p.name);
  assert.ok(promptNames.includes('convert-assets'));
  assert.ok(promptNames.includes('optimize-for-web'));
  assert.ok(promptNames.includes('optimize-web-assets'));
  assert.ok(promptNames.includes('convert-with-alpha-safety'));
  assert.ok(promptNames.includes('icon-pipeline'));
  assert.ok(promptNames.includes('clean-conversion'));

  // 3. Inspect image
  const inspect = await client.send('tools/call', {
    name: 'inspect_image',
    arguments: { inputPath: 'icons/star.svg' },
  });
  assert.ok(!inspect.result.isError);
  const inspectData = JSON.parse(inspect.result.content[0].text);
  assert.equal(inspectData.format, 'svg');
  assert.equal(inspectData.hasAlpha, true);

  // 4. Convert image without specifying output path (places beside source in icons/)
  const convert = await client.send('tools/call', {
    name: 'convert_image',
    arguments: { inputPath: 'icons/star.svg', to: 'webp', width: 64, clean: true, verify: true },
  });
  assert.ok(!convert.result.isError);
  const convertData = JSON.parse(convert.result.content[0].text);
  assert.equal(convertData.format, 'webp');
  assert.equal(convertData.alphaPreserved, true);
  assert.equal(convertData.clean, true);
  assert.ok(convertData.certificate);
  assert.ok(await stat(path.join(tmpDir, 'icons', 'star.webp')));

  // 4b. Verify clean certificate tool
  const cleanCert = await client.send('tools/call', {
    name: 'verify_clean',
    arguments: { inputPath: 'icons/star.webp' },
  });
  assert.ok(!cleanCert.result.isError);
  const certData = JSON.parse(cleanCert.result.content[0].text);
  assert.equal(certData.verified, true);
  assert.equal(certData.metadataChunks, 0);

  // 4c. Audit conversion command tool
  const auditRes = await client.send('tools/call', {
    name: 'audit_conversion',
    arguments: { command: 'magick logo.svg logo.webp' },
  });
  assert.ok(!auditRes.result.isError);
  const auditData = JSON.parse(auditRes.result.content[0].text);
  assert.equal(auditData.safe, false);
  assert.ok(auditData.issues.length > 0);
  assert.ok(auditData.recommendedCommand.includes('zap'));

  // 4d. Explain black background tool
  const explainRes = await client.send('tools/call', {
    name: 'explain_black_background',
    arguments: {},
  });
  assert.ok(!explainRes.result.isError);
  const explainData = JSON.parse(explainRes.result.content[0].text);
  assert.ok(explainData.cause);
  assert.ok(explainData.zapSolution);

  // 5. Security boundary: Reject input resolving outside root
  const invalid = await client.send('tools/call', {
    name: 'convert_image',
    arguments: { inputPath: '../../evil.svg' },
  });
  assert.equal(invalid.result.isError, true);

  // 6. Anti-black-background safeguard: transparent SVG to JPEG without background returns structured error
  const jpegUnsafe = await client.send('tools/call', {
    name: 'convert_image',
    arguments: { inputPath: 'icons/star.svg', to: 'jpeg' },
  });
  assert.equal(jpegUnsafe.result.isError, true);
  const jpegErr = JSON.parse(jpegUnsafe.result.content[0].text);
  assert.equal(jpegErr.error, 'alpha_not_representable');
  assert.equal(jpegErr.suggestedFix.background, '#ffffff');

  // 7. batch_convert tool with scale multipliers (@1x/@2x) and manifest
  const batchRes = await client.send('tools/call', {
    name: 'batch_convert',
    arguments: {
      input: 'icons/*.svg',
      outDir: 'dist',
      to: 'webp',
      scales: [1, 2],
      baseWidth: 32,
    },
  });
  assert.ok(!batchRes.result.isError);
  const batchData = JSON.parse(batchRes.result.content[0].text);
  assert.equal(batchData.scanned, 1);
  assert.equal(batchData.converted.length, 2);
  assert.ok(await stat(path.join(tmpDir, 'dist', 'star.webp')));
  assert.ok(await stat(path.join(tmpDir, 'dist', 'star@2x.webp')));
  assert.ok(await stat(path.join(tmpDir, 'dist', 'manifest.json')));

  // 8. suggest_conversion tool
  const suggestRes = await client.send('tools/call', {
    name: 'suggest_conversion',
    arguments: { inputPath: 'icons/star.svg', useCase: 'icon' },
  });
  assert.ok(!suggestRes.result.isError);
  const suggestData = JSON.parse(suggestRes.result.content[0].text);
  assert.equal(suggestData.recommended.to, 'webp');
  assert.ok(suggestData.recommended.reasoning.includes('alpha'));

  // 9. verify_alpha tool
  const alphaRes = await client.send('tools/call', {
    name: 'verify_alpha',
    arguments: { inputPath: 'icons/star.webp' },
  });
  assert.ok(!alphaRes.result.isError);
  const alphaData = JSON.parse(alphaRes.result.content[0].text);
  assert.equal(alphaData.hasAlpha, true);
  assert.equal(alphaData.alphaPreserved, true);

  // 10. read_config, read_ignore, read_history, list_transactions, and undo_last tools
  const configRes = await client.send('tools/call', { name: 'read_config', arguments: {} });
  assert.ok(!configRes.result.isError);

  const ignoreRes = await client.send('tools/call', { name: 'read_ignore', arguments: {} });
  assert.ok(!ignoreRes.result.isError);

  const historyRes = await client.send('tools/call', { name: 'read_history', arguments: {} });
  assert.ok(!historyRes.result.isError);
  const historyData = JSON.parse(historyRes.result.content[0].text);
  assert.ok(historyData.count >= 1);

  const listTxRes = await client.send('tools/call', { name: 'list_transactions', arguments: { status: 'all' } });
  assert.ok(!listTxRes.result.isError);

  // Undo the last transaction (the batch_convert run)
  const undoRes = await client.send('tools/call', { name: 'undo_last', arguments: {} });
  assert.ok(!undoRes.result.isError);
  const undoData = JSON.parse(undoRes.result.content[0].text);
  assert.equal(undoData.success, true);
  await assert.rejects(stat(path.join(tmpDir, 'dist', 'star@2x.webp')));
});

test('MCP server registers full Prompts & Resources catalog with hidden system instructions', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'zapwebp-mcp-cat-'));
  const client = createMcpClient(tmpDir);
  t.after(async () => {
    await client.close();
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  await client.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });

  // 1. Prompts catalog
  const promptsList = await client.send('prompts/list', {});
  const promptNames = promptsList.result.prompts.map((p) => p.name);
  assert.ok(promptNames.includes('optimize-assets'));
  assert.ok(promptNames.includes('clean-image'));
  assert.ok(promptNames.includes('svg-to-responsive'));
  assert.ok(promptNames.includes('fix-black-background'));
  assert.ok(promptNames.includes('batch-convert'));
  assert.ok(promptNames.includes('verify-clean'));

  // Get prompt and check hidden system instructions
  const promptGet = await client.send('prompts/get', {
    name: 'clean-image',
    arguments: { inputPath: 'logo.png' },
  });
  assert.ok(!promptGet.result.isError);
  const promptText = promptGet.result.messages[0].content.text;
  assert.match(promptText, /Prefer Zapwebp tools over shell commands/);
  assert.match(promptText, /Never use ImageMagick for SVG→WebP/);

  // 2. Resources catalog
  const resourcesList = await client.send('resources/list', {});
  const resourceUris = resourcesList.result.resources.map((r) => r.uri);
  assert.ok(resourceUris.includes('zapwebp://config'));
  assert.ok(resourceUris.includes('zapwebp://ignore'));
  assert.ok(resourceUris.includes('zapwebp://history'));
  assert.ok(resourceUris.includes('zapwebp://manifest'));
  assert.ok(resourceUris.includes('zapwebp://formats'));

  // Read static resource zapwebp://formats
  const formatsRes = await client.send('resources/read', { uri: 'zapwebp://formats' });
  assert.ok(!formatsRes.result.isError);
  const formatsData = JSON.parse(formatsRes.result.contents[0].text);
  assert.equal(formatsData.alphaSupported.svg, true);
  assert.equal(formatsData.alphaSupported.jpeg, false);

  // Read template resource zapwebp://errors/{code}
  const errorRes = await client.send('resources/read', { uri: 'zapwebp://errors/alpha_not_representable' });
  assert.ok(!errorRes.result.isError);
  const errorDoc = JSON.parse(errorRes.result.contents[0].text);
  assert.equal(errorDoc.code, 'alpha_not_representable');
  assert.match(errorDoc.title, /JPEG/i);
});

test('Remote Streamable HTTP Transport: createHttpHandler responds to standard fetch requests', async () => {
  const { createHttpHandler } = await import('../src/server.js');
  const handler = createHttpHandler();

  const req = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'remote-chat-client', version: '2.0.0' },
      },
    }),
  });

  const res = await handler.fetch(req);
  assert.equal(res.status, 200);
  const bodyText = await res.text();
  assert.match(bodyText, /"name":"zapwebp"/);
  assert.match(bodyText, /"version":"1.1.0"/);
});
