'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const ARCHETYPES = ['format', 'storage', 'transform', 'metadata', 'build', 'custom'];

/**
 * Generates scaffolding for an agent-native Zapwebp ecosystem project.
 *
 * @param {object} options
 * @param {string} [options.targetDir] - Destination root directory
 * @param {'format'|'storage'|'transform'|'metadata'|'build'|'custom'} options.archetype - Plugin archetype
 * @param {string} options.name - Plugin or format name
 * @param {string} [options.author='Jane Doe'] - Author name
 * @param {string} [options.githubUser='janedoe'] - GitHub username
 * @param {'pnpm'|'npm'|'yarn'|'bun'} [options.packageManager='pnpm'] - Preferred package manager
 * @returns {Promise<{ targetDir: string, pluginName: string, files: string[] }>}
 */
async function scaffoldProject(options) {
  const {
    targetDir = process.cwd(),
    archetype = 'format',
    name,
    author = 'Jane Doe',
    githubUser = 'janedoe',
    packageManager = 'pnpm',
  } = options;

  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Project name is required.');
  }

  const rawArch = String(archetype || '').toLowerCase();
  const normalizedArch =
    rawArch === 'plugin' || rawArch === 'cli'
      ? 'custom'
      : rawArch === 'meta'
      ? 'metadata'
      : rawArch;

  if (!ARCHETYPES.includes(normalizedArch)) {
    throw new Error(`Invalid archetype "${archetype}". Supported: ${ARCHETYPES.join(', ')}`);
  }

  const pluginName = cleanName.startsWith('zapwebp-')
    ? cleanName
    : cleanName.includes('-')
    ? cleanName
    : `zapwebp-${normalizedArch}-${cleanName}`;

  const resolvedDir = path.resolve(targetDir, pluginName);

  await fs.mkdir(resolvedDir, { recursive: true });
  await fs.mkdir(path.join(resolvedDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(resolvedDir, 'test', 'fixtures'), { recursive: true });
  await fs.mkdir(path.join(resolvedDir, '.github', 'workflows'), { recursive: true });
  await fs.mkdir(path.join(resolvedDir, '.github', 'ISSUE_TEMPLATE'), { recursive: true });

  const files = [];

  // 1. package.json
  const pkgJson = {
    name: pluginName,
    version: '0.1.0',
    description: `Zapwebp ${normalizedArch} plugin for ${cleanName}`,
    author,
    license: 'MIT',
    type: 'module',
    main: './dist/index.cjs',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        import: {
          types: './dist/index.d.ts',
          default: './dist/index.js',
        },
        require: {
          types: './dist/index.d.ts',
          default: './dist/index.cjs',
        },
      },
    },
    files: ['dist', 'agent.json', 'README.md', 'LICENSE'],
    scripts: {
      build: 'tsup',
      dev: 'tsup --watch',
      test: 'vitest run',
      'test:watch': 'vitest',
      lint: 'eslint src test --ext .ts',
      format: 'prettier --write "src/**/*.ts" "test/**/*.ts"',
    },
    dependencies: {
      '@zapwebp/plugin-sdk': '^1.1.0',
    },
    devDependencies: {
      '@typescript-eslint/eslint-plugin': '^7.0.0',
      '@typescript-eslint/parser': '^7.0.0',
      eslint: '^8.57.0',
      prettier: '^3.2.5',
      tsup: '^8.0.2',
      typescript: '^5.4.0',
      vitest: '^1.4.0',
    },
    zapwebp: {
      permissions: normalizedArch === 'storage' ? ['network'] : [],
    },
  };
  await fs.writeFile(path.join(resolvedDir, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');
  files.push('package.json');

  // 2. tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      declaration: true,
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'test'],
  };
  await fs.writeFile(path.join(resolvedDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n');
  files.push('tsconfig.json');

  // 3. tsup.config.ts
  const tsupConfig = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
`;
  await fs.writeFile(path.join(resolvedDir, 'tsup.config.ts'), tsupConfig);
  files.push('tsup.config.ts');

  // 4. vitest.config.ts
  const vitestConfig = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
`;
  await fs.writeFile(path.join(resolvedDir, 'vitest.config.ts'), vitestConfig);
  files.push('vitest.config.ts');

  // 5. .eslintrc.json
  const eslintrc = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  };
  await fs.writeFile(path.join(resolvedDir, '.eslintrc.json'), JSON.stringify(eslintrc, null, 2) + '\n');
  files.push('.eslintrc.json');

  // 6. .prettierrc
  const prettierrc = {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
  };
  await fs.writeFile(path.join(resolvedDir, '.prettierrc'), JSON.stringify(prettierrc, null, 2) + '\n');
  files.push('.prettierrc');

  // 7. .gitignore
  const gitignore = `node_modules
dist
.zapwebp
coverage
*.log
.DS_Store
*.tgz
`;
  await fs.writeFile(path.join(resolvedDir, '.gitignore'), gitignore);
  files.push('.gitignore');

  // 8. LICENSE
  const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  await fs.writeFile(path.join(resolvedDir, 'LICENSE'), licenseContent);
  files.push('LICENSE');

  // 9. src/types.ts
  const typesContent = `/**
 * Re-exported types from @zapwebp/plugin-sdk for convenience.
 */
export type {
  FormatHandler,
  StorageAdapter,
  TransformStep,
  MetadataHandler,
  MetadataField,
  RawImage,
  ZapPlugin,
  ZapPluginHooks,
  ZapPluginAgentMetadata,
  ConvertContext,
  ConvertOutput,
} from '@zapwebp/plugin-sdk';
`;
  await fs.writeFile(path.join(resolvedDir, 'src', 'types.ts'), typesContent);
  files.push('src/types.ts');

  // 10. src/index.ts (Per archetype)
  let indexTsContent = '';
  if (normalizedArch === 'format') {
    indexTsContent = `import type { FormatHandler } from './types';

// TODO: Implement your format plugin.
// See AGENTS.md for what this plugin should do.
// See SKILLS.md for how AI agents should work on it.

export const handler: FormatHandler = {
  name: '${cleanName}',
  extensions: ['.${cleanName}'],
  mimeTypes: ['image/${cleanName}'],
  supportsAlpha: true,

  detect: (_bytes) => false,
  decode: async () => {
    throw new Error('Not implemented');
  },
  encode: async () => {
    throw new Error('Not implemented');
  },
};

export default handler;
`;
  } else if (normalizedArch === 'storage') {
    indexTsContent = `import type { StorageAdapter } from './types';

// TODO: Implement your storage adapter.
// See AGENTS.md for what this adapter should do.
// See SKILLS.md for how AI agents should work on it.

export class Adapter implements StorageAdapter {
  name: string;
  config: Record<string, any>;

  constructor(config: Record<string, any> = {}) {
    this.name = '${cleanName}';
    this.config = config;
  }

  async read(_sourcePath: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }

  async write(_destinationPath: string, _data: Buffer): Promise<void> {
    throw new Error('Not implemented');
  }

  async delete(_destinationPath: string): Promise<void> {
    throw new Error('Not implemented');
  }
}

export const adapter = (config?: Record<string, any>) => new Adapter(config);
export default adapter;
`;
  } else if (normalizedArch === 'transform') {
    indexTsContent = `import type { RawImage, TransformStep } from './types';

// TODO: Implement your transform plugin.
// See AGENTS.md for what this transform should do.
// See SKILLS.md for how AI agents should work on it.

export interface TransformOptions {
  [key: string]: any;
}

export function transform(options: TransformOptions = {}): TransformStep {
  return {
    name: '${cleanName}',
    metadata: options,
    async apply(image: RawImage): Promise<RawImage> {
      // Return transformed RawImage
      return image;
    },
  };
}

export default transform;
`;
  } else if (normalizedArch === 'metadata') {
    indexTsContent = `import type { MetadataHandler, MetadataField } from './types';

// TODO: Implement your metadata handler.
// See AGENTS.md for what this handler should do.
// See SKILLS.md for how AI agents should work on it.

export const handler: MetadataHandler = {
  name: '${cleanName}',

  async inspect(_bytes: Uint8Array | Buffer): Promise<MetadataField[]> {
    return [];
  },

  async strip(bytes: Uint8Array | Buffer): Promise<Uint8Array | Buffer> {
    return bytes;
  },
};

export default handler;
`;
  } else if (normalizedArch === 'build') {
    indexTsContent = `import type { ZapPlugin } from './types';

// TODO: Implement your build tool plugin.
// See AGENTS.md for what this build plugin should do.
// See SKILLS.md for how AI agents should work on it.

export interface BuildPluginOptions {
  [key: string]: any;
}

export function plugin(_options: BuildPluginOptions = {}): ZapPlugin {
  return {
    name: '${pluginName}',
    version: '0.1.0',
    description: '',
    hooks: {
      beforeConvert: (ctx) => ctx,
      afterConvert: (_ctx, outputs) => outputs,
    },
  };
}

export default plugin;
`;
  } else {
    indexTsContent = `import type { ZapPlugin } from './types';

// TODO: Implement your custom Zapwebp plugin.
// See AGENTS.md for what this plugin should do.
// See SKILLS.md for how AI agents should work on it.

export const plugin: ZapPlugin = {
  name: '${pluginName}',
  version: '0.1.0',
  description: '',
  hooks: {
    beforeConvert: (ctx) => ctx,
    afterConvert: (_ctx, outputs) => outputs,
  },
};

export default plugin;
`;
  }
  await fs.writeFile(path.join(resolvedDir, 'src', 'index.ts'), indexTsContent);
  files.push('src/index.ts');

  // 11. test/fixtures/README.md
  const fixturesReadme = `# Test Fixtures

Place sample images, vectors, and test files in this directory.
Use small, copyright-free fixtures for unit and integration testing.
`;
  await fs.writeFile(path.join(resolvedDir, 'test', 'fixtures', 'README.md'), fixturesReadme);
  files.push('test/fixtures/README.md');

  // 12. test/index.test.ts
  const testContent = `import { describe, it, expect } from 'vitest';
import * as plugin from '../src/index';

describe('${pluginName}', () => {
  it('exports at least one thing', () => {
    expect(Object.keys(plugin).length).toBeGreaterThan(0);
  });
});
`;
  await fs.writeFile(path.join(resolvedDir, 'test', 'index.test.ts'), testContent);
  files.push('test/index.test.ts');

  // 13. AGENTS.md
  let agentsExampleComment = '<!-- Example: Describe what this plugin does in one paragraph. -->';
  if (normalizedArch === 'format') {
    agentsExampleComment = '<!-- Example: This plugin adds HEIC input support to Zapwebp via libheif WASM. -->';
  } else if (normalizedArch === 'storage') {
    agentsExampleComment = '<!-- Example: This adapter uploads converted images to Cloudflare R2. -->';
  } else if (normalizedArch === 'transform') {
    agentsExampleComment = '<!-- Example: This transform crops images based on face coordinates. -->';
  } else if (normalizedArch === 'build') {
    agentsExampleComment = '<!-- Example: This plugin integrates Zapwebp into Vite build pipeline. -->';
  } else if (normalizedArch === 'metadata') {
    agentsExampleComment = '<!-- Example: This plugin extracts and strips proprietary EXIF tags. -->';
  }

  const agentsMd = `# AGENTS.md — Project Context

This file tells AI coding agents what this plugin does and how to work on it.
**Fill this in before writing any code.**
The scaffolder left this empty on purpose — it is your project, not ours.

---

## What this plugin does
<!-- One paragraph. What problem does it solve? Who is it for? -->
${agentsExampleComment}

## Who it is for
<!-- Be specific. "Developers converting HEIC to WebP on macOS" is good. "Everyone" is not. -->

## What it does NOT do
<!-- List the things you deliberately excluded. This prevents scope creep. -->

## Key decisions
<!--
Any non-obvious choice made in this plugin. Each entry should be:
- What we chose
- Why we chose it
- What we gave up
Example:
- **We use libheif via WASM** — runs in browsers without native dependencies
  - Gave up: ~2.5MB bundle size
-->

## How to work on this plugin
<!--
Tell future contributors (and agents) how to run the tests, build, and publish.
Example:
- \`${packageManager} test\` — runs unit tests
- \`${packageManager} build\` — produces \`dist/\`
- \`${packageManager} changeset\` — create a release note
-->

## Edge cases we care about
<!--
List the specific edge cases this plugin must handle correctly.
Example:
- HEIC files with multiple images (return first)
- HEIC files with alpha channel
- HEIC files larger than 50 MB (reject before decode)
-->

## Edge cases we do NOT care about
<!--
List what's out of scope.
Example:
- HEIC encoding (we only decode)
- HEIC sequences (single image only)
-->

## External resources
<!-- Links to specs, docs, or issues that are essential to understand this plugin -->
`;
  await fs.writeFile(path.join(resolvedDir, 'AGENTS.md'), agentsMd);
  files.push('AGENTS.md');

  // 14. SKILLS.md
  let howToInvokeCode = `import { registerFormat } from '@zapwebp/core';\nimport { handler } from '${pluginName}';\nregisterFormat(handler);`;
  if (normalizedArch === 'storage') {
    howToInvokeCode = `import { withZapwebp } from '@zapwebp/storage';\nimport { adapter } from '${pluginName}';\nconst zap = withZapwebp(adapter(config), { to: 'webp' });`;
  } else if (normalizedArch === 'transform') {
    howToInvokeCode = `import { convert } from '@zapwebp/core';\nimport { transform } from '${pluginName}';\nconst output = await convert(bytes, { transforms: [transform()] });`;
  } else if (normalizedArch === 'metadata') {
    howToInvokeCode = `import { registerMetadataHandler } from '@zapwebp/core';\nimport { handler } from '${pluginName}';\nregisterMetadataHandler(handler);`;
  } else if (normalizedArch === 'build') {
    howToInvokeCode = `import { defineConfig } from 'vite';\nimport { plugin } from '${pluginName}';\nexport default defineConfig({ plugins: [plugin()] });`;
  }

  const skillsMd = `# SKILLS.md — Agent Skills for This Plugin

This file teaches AI agents how to work on this specific plugin.
It is used by:
- Antigravity (as a skill definition)
- Cursor (as a \`.cursorrules\` fallback)
- Claude Desktop (as additional context)

**Fill this in before starting development.**
The scaffolder left this empty on purpose.

---

## Skill: \`${pluginName}\`

### When to use this skill
<!--
Describe the user requests that should trigger this skill.
Example:
- "Convert HEIC files to WebP"
- "Handle iPhone photos in the asset pipeline"
- "Add HEIC support to my build"
-->

### What this plugin provides
<!--
List the functions, tools, or hooks this plugin exposes.
Example:
- \`heicHandler\`: A \`FormatHandler\` for HEIC input
- \`heicDecode(bytes)\`: Low-level decoder
-->

### How to invoke it
<!--
Show the exact import and usage for a developer.
Example:
\`\`\`typescript
${howToInvokeCode}
\`\`\`
-->

### Common patterns
<!--
Show how to use this plugin for common tasks.
Example:
\`\`\`typescript
const webp = await convert(bytes, { to: 'webp' });
\`\`\`
-->

### Errors you might see
<!--
List the errors this plugin can throw, and what they mean.
Example:
- \`E_HEIC_CORRUPT\`: The HEIC file is corrupted or truncated
- \`E_HEIC_UNSUPPORTED\`: The HEIC variant is not supported
-->

### How to debug
<!--
Describe how to diagnose issues.
Example:
- Set \`DEBUG=zapwebp:${cleanName}\` before running
- Check \`test/fixtures/\` for known-working samples
-->

### Agent workflow for this plugin

When a user asks you (the agent) to work on this plugin, follow these steps:

1. Read AGENTS.md to understand the project context.
2. Read this SKILLS.md to understand the capabilities.
3. Read src/index.ts to understand the current implementation.
4. If adding a feature, update AGENTS.md first.
5. If adding a capability, update this SKILLS.md first.
6. Write tests in test/.
7. Run ${packageManager} test before submitting.
`;
  await fs.writeFile(path.join(resolvedDir, 'SKILLS.md'), skillsMd);
  files.push('SKILLS.md');

  // 15. agent.json
  const agentJson = {
    name: pluginName,
    version: '0.1.0',
    description: '',
    capabilities: [],
    functions: [],
    errors: {},
    examples: [],
    docs: '',
  };
  await fs.writeFile(path.join(resolvedDir, 'agent.json'), JSON.stringify(agentJson, null, 2) + '\n');
  files.push('agent.json');

  // 16. .zapwebp-scaffold.json
  const scaffoldMetadata = {
    scaffolderVersion: '1.1.0',
    pluginType: normalizedArch,
    templateVersion: '1',
    generatedAt: new Date().toISOString(),
    pluginName,
    authorName: author,
    githubUser,
  };
  await fs.writeFile(path.join(resolvedDir, '.zapwebp-scaffold.json'), JSON.stringify(scaffoldMetadata, null, 2) + '\n');
  files.push('.zapwebp-scaffold.json');

  // 17. README.md
  let readmeUsageSnippet = '';
  if (normalizedArch === 'format') {
    readmeUsageSnippet = `import { registerFormat } from '@zapwebp/core';
import { handler } from '${pluginName}';

registerFormat(handler);
`;
  } else if (normalizedArch === 'storage') {
    readmeUsageSnippet = `import { withZapwebp } from '@zapwebp/storage';
import { adapter } from '${pluginName}';

const zap = withZapwebp(adapter(config), { to: 'webp' });
`;
  } else if (normalizedArch === 'transform') {
    readmeUsageSnippet = `import { convert } from '@zapwebp/core';
import { transform } from '${pluginName}';

const output = await convert(input, {
  transforms: [transform({ /* options */ })],
});
`;
  } else if (normalizedArch === 'metadata') {
    readmeUsageSnippet = `import { registerMetadataHandler } from '@zapwebp/core';
import { handler } from '${pluginName}';

registerMetadataHandler(handler);
`;
  } else if (normalizedArch === 'build') {
    readmeUsageSnippet = `import { defineConfig } from 'vite';
import { plugin } from '${pluginName}';

export default defineConfig({
  plugins: [plugin({ /* options */ })],
});
`;
  } else {
    readmeUsageSnippet = `import { definePlugin } from '@zapwebp/plugin-sdk';
import { plugin } from '${pluginName}';
`;
  }

  const readmeContent = `# ${pluginName}

A Zapwebp ${normalizedArch} plugin for \`${cleanName}\` by ${author}.

## Install

\`\`\`bash
${packageManager} add ${pluginName}
\`\`\`

## Usage

\`\`\`typescript
${readmeUsageSnippet}\`\`\`

## Implementation Notes

Fill in \`AGENTS.md\` and \`SKILLS.md\` before writing code. They guide human contributors and autonomous AI agents.

## Security & Sandbox Model

Zapwebp executes plugins in an isolated capability-based sandbox.
- **Bytes in, bytes out**: Your plugin receives byte buffers and returns byte buffers.
- **No filesystem/process access**: Direct access to \`node:fs\` or \`node:child_process\` is forbidden and rejected with \`E_PLUGIN_SANDBOX_VIOLATION\`.
${normalizedArch === 'storage' ? '- **Network permissions**: As a storage adapter, network capability is declared in `package.json` under `zapwebp.permissions: ["network"]` and requires user consent.' : '- **Zero network access**: Format, transform, and metadata plugins run offline with no network capabilities.'}

## Testing & Verification

\`\`\`bash
${packageManager} test
${packageManager} run build
\`\`\`

## License

MIT © [${author}](https://github.com/${githubUser})
`;
  await fs.writeFile(path.join(resolvedDir, 'README.md'), readmeContent);
  files.push('README.md');

  // 18. CHANGELOG.md
  const today = new Date().toISOString().split('T')[0];
  const changelogContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - ${today}

### Added
- Initial project skeleton scaffolded via \`create-zapwebp\`.
- Initial structured \`AGENTS.md\` and \`SKILLS.md\` context files.
- Test harness and build configuration.
`;
  await fs.writeFile(path.join(resolvedDir, 'CHANGELOG.md'), changelogContent);
  files.push('CHANGELOG.md');

  // 19. CONTRIBUTING.md
  const contributingContent = `# Contributing to ${pluginName}

Thank you for your interest in contributing!

## Workflow

1. **Check the context first**: Read \`AGENTS.md\` and \`SKILLS.md\` to understand the project goals and constraints.
2. **Branching**: Create a topic branch from \`main\`.
3. **Tests**: Add unit tests in \`test/\` for any new logic or bug fixes.
4. **Code style**: Run \`${packageManager} run lint\` and \`${packageManager} run format\` before opening a pull request.
5. **Pull Request**: Open a PR with a clear description linking relevant issues.
`;
  await fs.writeFile(path.join(resolvedDir, 'CONTRIBUTING.md'), contributingContent);
  files.push('CONTRIBUTING.md');

  // 20. CODE_OF_CONDUCT.md
  const cocContent = `# Contributor Code of Conduct

## Our Pledge
We pledge to make participation in this project a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

## Standards
- Demonstrate empathy and kindness toward others
- Be respectful of differing opinions, viewpoints, and experiences
- Give and gracefully accept constructive feedback
- Accept responsibility and apologize to those affected by our mistakes

## Scope
This Code of Conduct applies within all project spaces, and also applies when an individual is officially representing the project in public spaces.

## Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project maintainers.
`;
  await fs.writeFile(path.join(resolvedDir, 'CODE_OF_CONDUCT.md'), cocContent);
  files.push('CODE_OF_CONDUCT.md');

  // 21. .github/workflows/test.yml
  const ciTestContent = `name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g ${packageManager === 'bun' ? 'bun' : 'pnpm'}
      - run: ${packageManager} install
      - run: ${packageManager} run lint
      - run: ${packageManager} run build
      - run: ${packageManager} test
`;
  await fs.writeFile(path.join(resolvedDir, '.github', 'workflows', 'test.yml'), ciTestContent);
  files.push('.github/workflows/test.yml');

  // 22. .github/workflows/release.yml
  const ciReleaseContent = `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm install -g ${packageManager === 'bun' ? 'bun' : 'pnpm'}
      - run: ${packageManager} install
      - run: ${packageManager} run build
      - run: ${packageManager} test
      - run: ${packageManager} publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;
  await fs.writeFile(path.join(resolvedDir, '.github', 'workflows', 'release.yml'), ciReleaseContent);
  files.push('.github/workflows/release.yml');

  // 23. .github/ISSUE_TEMPLATE/bug_report.yml
  const bugReportContent = `name: Bug Report
description: File a bug report to help improve this plugin
title: "[Bug]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: Thanks for taking the time to report an issue!
  - type: textarea
    id: description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what the bug is.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Convert image with options...
        2. Inspect output...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen.
    validations:
      required: true
`;
  await fs.writeFile(path.join(resolvedDir, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'), bugReportContent);
  files.push('.github/ISSUE_TEMPLATE/bug_report.yml');

  // 24. .github/ISSUE_TEMPLATE/feature_request.yml
  const featureRequestContent = `name: Feature Request
description: Suggest an idea or enhancement for this plugin
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: Share your ideas for new capabilities or improvements.
  - type: textarea
    id: problem
    attributes:
      label: Is your feature request related to a problem?
      description: A clear and concise description of what the problem is.
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
    validations:
      required: true
`;
  await fs.writeFile(path.join(resolvedDir, '.github', 'ISSUE_TEMPLATE', 'feature_request.yml'), featureRequestContent);
  files.push('.github/ISSUE_TEMPLATE/feature_request.yml');

  // 25. .github/PULL_REQUEST_TEMPLATE.md
  const prTemplateContent = `## Description
<!-- Describe what this PR does and why it was needed. -->

## Related AGENTS.md / Issue
<!-- Link to the issue or AGENTS.md scope decision. -->

## Checklist
- [ ] Read AGENTS.md and verified changes match project scope
- [ ] Tests added/updated in \`test/\`
- [ ] All tests pass (\`${packageManager} test\`)
- [ ] Built successfully (\`${packageManager} run build\`)
- [ ] Lint passed (\`${packageManager} run lint\`)
`;
  await fs.writeFile(path.join(resolvedDir, '.github', 'PULL_REQUEST_TEMPLATE.md'), prTemplateContent);
  files.push('.github/PULL_REQUEST_TEMPLATE.md');

  return { targetDir: resolvedDir, pluginName, files };
}

module.exports = {
  scaffoldProject,
  ARCHETYPES,
};
