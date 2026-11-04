'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const ARCHETYPES = ['format', 'storage', 'plugin', 'cli', 'metadata', 'transform'];

/**
 * Generates scaffolding for a Zapwebp ecosystem project.
 * @param {object} options
 * @param {string} options.targetDir
 * @param {'format'|'storage'|'plugin'|'cli'|'metadata'} options.archetype
 * @param {string} options.name
 * @param {string} [options.author='Zapwebp Developer']
 * @returns {Promise<{ targetDir: string, files: string[] }>}
 */
async function scaffoldProject(options) {
  const { targetDir, archetype, name, author = 'Zapwebp Developer' } = options;
  if (!name || typeof name !== 'string') {
    throw new Error('Project name is required.');
  }
  if (!ARCHETYPES.includes(archetype)) {
    throw new Error(`Invalid archetype "${archetype}". Supported: ${ARCHETYPES.join(', ')}`);
  }

  const resolvedDir = path.resolve(targetDir || process.cwd(), `zapwebp-${archetype}-${name}`);
  await fs.mkdir(resolvedDir, { recursive: true });
  await fs.mkdir(path.join(resolvedDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(resolvedDir, 'test'), { recursive: true });
  await fs.mkdir(path.join(resolvedDir, '.github', 'workflows'), { recursive: true });

  const files = [];

  // 1. package.json
  const pkgJson = {
    name: `zapwebp-${archetype}-${name}`,
    version: '1.0.0',
    description: `Zapwebp ${archetype} plugin for ${name}.`,
    main: 'src/index.js',
    scripts: {
      test: 'node --test',
    },
    dependencies: {
      '@zapwebp/plugin-sdk': '^1.1.0',
    },
    engines: {
      node: '>=20',
    },
  };
  await fs.writeFile(path.join(resolvedDir, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');
  files.push('package.json');

  // 2. src/index.js
  let srcContent = '';
  if (archetype === 'format') {
    srcContent = `'use strict';

const { safeDecode, createMockRawImage } = require('@zapwebp/plugin-sdk');

/** @type {import('@zapwebp/plugin-sdk').FormatHandler} */
const handler = {
  name: '${name}',
  mimeTypes: Object.freeze(['image/${name}']),
  extensions: Object.freeze(['.${name}']),
  supportsAlpha: true,

  detect(bytes) {
    if (!bytes || bytes.length < 4) return false;
    return true; // Match header signature
  },

  async decode(bytes) {
    // Decodes bytes to RGBA RawImage
    return createMockRawImage(100, 100);
  },

  async encode(image, options) {
    return Buffer.alloc(0);
  },
};

module.exports = handler;
`;
  } else if (archetype === 'storage') {
    srcContent = `'use strict';

const { validateStorageWrite } = require('@zapwebp/plugin-sdk');

class StorageAdapter {
  constructor(config = {}) {
    this.name = '${name}';
    this.config = config;
  }

  async read(sourcePath) {
    return Buffer.alloc(0);
  }

  async write(destinationPath, data) {
    validateStorageWrite(destinationPath, data);
  }

  async delete(destinationPath) {
    // Delete implementation
  }
}

module.exports = { StorageAdapter };
`;
  } else if (archetype === 'metadata') {
    srcContent = `'use strict';

/** @type {import('@zapwebp/plugin-sdk').MetadataHandler} */
const handler = {
  name: '${name}',
  async inspect(bytes) {
    return [];
  },
  async strip(bytes) {
    return bytes;
  },
};

module.exports = handler;
`;
  } else if (archetype === 'transform') {
    srcContent = `'use strict';

const { defineTransform } = require('@zapwebp/plugin-sdk');

/**
 * Creates a ${name} TransformStep.
 * @param {object} [options]
 * @returns {import('@zapwebp/plugin-sdk').TransformStep}
 */
function ${name}Transform(options = {}) {
  return defineTransform({
    name: '${name}',
    metadata: options,
    async apply(image) {
      // image is a RawImage: { data: Uint8ClampedArray, width: number, height: number }
      // Return a transformed RawImage
      return image;
    },
  });
}

module.exports = {
  ${name}Transform,
};
`;
  } else {
    srcContent = `'use strict';

const { definePlugin } = require('@zapwebp/plugin-sdk');

const plugin = definePlugin({
  name: 'zapwebp-${archetype}-${name}',
  version: '1.0.0',
  hooks: {
    beforeConvert(ctx) {
      return ctx;
    },
    afterConvert(ctx, outputs) {
      return outputs;
    },
  },
});

module.exports = plugin;
`;
  }
  await fs.writeFile(path.join(resolvedDir, 'src', 'index.js'), srcContent);
  files.push('src/index.js');

  // 3. test/index.test.js
  const testContent = `'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mod = require('../src');

test('Scaffolded module loads and exports expected API', () => {
  assert.ok(mod);
});
`;
  await fs.writeFile(path.join(resolvedDir, 'test', 'index.test.js'), testContent);
  files.push('test/index.test.js');

  // 4. .github/workflows/test.yml
  const ciContent = `name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm test
`;
  await fs.writeFile(path.join(resolvedDir, '.github', 'workflows', 'test.yml'), ciContent);
  files.push('.github/workflows/test.yml');

  // 5. README.md
  const readmeContent = `# zapwebp-${archetype}-${name}

> Zapwebp ${archetype} plugin for ${name} by ${author}.

## Installation

\`\`\`bash
npm install zapwebp-${archetype}-${name}
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`
`;
  await fs.writeFile(path.join(resolvedDir, 'README.md'), readmeContent);
  files.push('README.md');

  return { targetDir: resolvedDir, files };
}

module.exports = {
  scaffoldProject,
  ARCHETYPES,
};
