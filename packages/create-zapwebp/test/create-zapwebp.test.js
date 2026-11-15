'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { scaffoldProject } = require('../src');

test('create-zapwebp scaffolds valid agent-native format plugin project', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zapwebp-format-'));

  try {
    const res = await scaffoldProject({
      targetDir: tmpDir,
      archetype: 'format',
      name: 'heic',
      author: 'Tester',
      githubUser: 'testuser',
      packageManager: 'pnpm',
    });

    assert.ok(res.targetDir.includes('zapwebp-format-heic'));
    assert.equal(res.pluginName, 'zapwebp-format-heic');

    // Structural files
    assert.ok(res.files.includes('package.json'));
    assert.ok(res.files.includes('src/index.ts'));
    assert.ok(res.files.includes('src/types.ts'));
    assert.ok(res.files.includes('test/index.test.ts'));
    assert.ok(res.files.includes('test/fixtures/README.md'));
    assert.ok(res.files.includes('AGENTS.md'));
    assert.ok(res.files.includes('SKILLS.md'));
    assert.ok(res.files.includes('agent.json'));
    assert.ok(res.files.includes('.zapwebp-scaffold.json'));
    assert.ok(res.files.includes('README.md'));
    assert.ok(res.files.includes('CHANGELOG.md'));
    assert.ok(res.files.includes('CONTRIBUTING.md'));
    assert.ok(res.files.includes('CODE_OF_CONDUCT.md'));
    assert.ok(res.files.includes('LICENSE'));
    assert.ok(res.files.includes('.gitignore'));
    assert.ok(res.files.includes('tsconfig.json'));
    assert.ok(res.files.includes('tsup.config.ts'));
    assert.ok(res.files.includes('vitest.config.ts'));
    assert.ok(res.files.includes('.eslintrc.json'));
    assert.ok(res.files.includes('.prettierrc'));
    assert.ok(res.files.includes('.github/workflows/test.yml'));
    assert.ok(res.files.includes('.github/workflows/release.yml'));
    assert.ok(res.files.includes('.github/ISSUE_TEMPLATE/bug_report.yml'));
    assert.ok(res.files.includes('.github/ISSUE_TEMPLATE/feature_request.yml'));
    assert.ok(res.files.includes('.github/PULL_REQUEST_TEMPLATE.md'));

    // package.json checks
    const pkg = JSON.parse(await fs.readFile(path.join(res.targetDir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'zapwebp-format-heic');
    assert.deepEqual(pkg.zapwebp.permissions, []);

    // src/index.ts checks
    const src = await fs.readFile(path.join(res.targetDir, 'src', 'index.ts'), 'utf8');
    assert.ok(src.includes("name: 'heic'"));
    assert.ok(src.includes('FormatHandler'));

    // AGENTS.md checks
    const agents = await fs.readFile(path.join(res.targetDir, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('# AGENTS.md — Project Context'));
    assert.ok(agents.includes('## What this plugin does'));
    assert.ok(agents.includes('HEIC input support'));

    // SKILLS.md checks
    const skills = await fs.readFile(path.join(res.targetDir, 'SKILLS.md'), 'utf8');
    assert.ok(skills.includes('# SKILLS.md — Agent Skills for This Plugin'));
    assert.ok(skills.includes('## Skill: `zapwebp-format-heic`'));
    assert.ok(skills.includes('### Agent workflow for this plugin'));

    // agent.json checks
    const agent = JSON.parse(await fs.readFile(path.join(res.targetDir, 'agent.json'), 'utf8'));
    assert.equal(agent.name, 'zapwebp-format-heic');
    assert.equal(agent.version, '0.1.0');

    // .zapwebp-scaffold.json checks
    const scaffoldMeta = JSON.parse(await fs.readFile(path.join(res.targetDir, '.zapwebp-scaffold.json'), 'utf8'));
    assert.equal(scaffoldMeta.pluginType, 'format');
    assert.equal(scaffoldMeta.pluginName, 'zapwebp-format-heic');
    assert.equal(scaffoldMeta.authorName, 'Tester');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('create-zapwebp scaffolds valid storage plugin with network permissions', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zapwebp-storage-'));

  try {
    const res = await scaffoldProject({
      targetDir: tmpDir,
      archetype: 'storage',
      name: 's3',
      author: 'Tester',
    });

    const pkg = JSON.parse(await fs.readFile(path.join(res.targetDir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'zapwebp-storage-s3');
    assert.deepEqual(pkg.zapwebp.permissions, ['network']);

    const src = await fs.readFile(path.join(res.targetDir, 'src', 'index.ts'), 'utf8');
    assert.ok(src.includes('StorageAdapter'));

    const readme = await fs.readFile(path.join(res.targetDir, 'README.md'), 'utf8');
    assert.ok(readme.includes('Network permissions'));
    assert.ok(readme.includes('withZapwebp'));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('create-zapwebp scaffolds transform, metadata, build, and custom plugins', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zapwebp-all-'));

  try {
    for (const arch of ['transform', 'metadata', 'build', 'custom']) {
      const res = await scaffoldProject({
        targetDir: tmpDir,
        archetype: arch,
        name: `test-${arch}`,
      });

      assert.ok(res.files.includes('src/index.ts'));
      assert.ok(res.files.includes('AGENTS.md'));
      assert.ok(res.files.includes('SKILLS.md'));
      assert.ok(res.files.includes('.zapwebp-scaffold.json'));

      const meta = JSON.parse(await fs.readFile(path.join(res.targetDir, '.zapwebp-scaffold.json'), 'utf8'));
      assert.equal(meta.pluginType, arch);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
