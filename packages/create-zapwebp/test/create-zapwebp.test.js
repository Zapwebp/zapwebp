'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { scaffoldProject } = require('../src');

test('create-zapwebp scaffolds valid format plugin project', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zapwebp-test-'));

  try {
    const res = await scaffoldProject({
      targetDir: tmpDir,
      archetype: 'format',
      name: 'heic',
      author: 'Tester',
    });

    assert.ok(res.targetDir.includes('zapwebp-format-heic'));
    assert.ok(res.files.includes('package.json'));
    assert.ok(res.files.includes('src/index.js'));
    assert.ok(res.files.includes('test/index.test.js'));

    const pkg = JSON.parse(await fs.readFile(path.join(res.targetDir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'zapwebp-format-heic');

    const src = await fs.readFile(path.join(res.targetDir, 'src', 'index.js'), 'utf8');
    assert.ok(src.includes("name: 'heic'"));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
