'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { withZapwebp, ZapwebpWebpackPlugin } = require('../src/index');
const svgLoader = require('../src/loader');

const SAMPLE_SVG = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="44" height="44" rx="8" fill="#8dc63f" />
</svg>
`.trim();

test('withZapwebp augments Next config and preserves custom properties and webpack chain', () => {
  let customWebpackRan = false;

  const nextConfig = {
    reactStrictMode: true,
    trailingSlash: false,
    webpack(config, context) {
      customWebpackRan = true;
      config.customProperty = 'applied';
      return config;
    },
  };

  const wrapped = withZapwebp({
    scale: [1, 2],
    respectNextImage: true,
  })(nextConfig);

  assert.equal(wrapped.reactStrictMode, true);
  assert.equal(wrapped.trailingSlash, false);
  assert.ok(wrapped.images.formats.includes('image/webp'));

  // Execute wrapped webpack function
  const fakeWebpackConfig = { plugins: [], module: { rules: [] } };
  const fakeContext = { dev: false, isServer: false, defaultLoaders: {} };

  const result = wrapped.webpack(fakeWebpackConfig, fakeContext);
  assert.equal(customWebpackRan, true);
  assert.equal(result.customProperty, 'applied');
  assert.ok(result.plugins.some((p) => p instanceof ZapwebpWebpackPlugin));
  assert.ok(result.module.rules.some((r) => r.test && r.test.test('test.svg')));
});

test('ZapwebpWebpackPlugin runs beforeCompile hook, converts SVGs and generates manifest', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zapwebp-next-plugin-'));
  const assetsDir = path.join(tmpDir, 'src', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  fs.writeFileSync(path.join(assetsDir, 'brand.svg'), SAMPLE_SVG, 'utf8');

  const plugin = new ZapwebpWebpackPlugin(
    {
      scale: [1, 2],
      baseWidth: 100,
      quality: 80,
      lossless: false,
      clean: true,
      sourceDirs: ['src/assets'],
      outDir: 'public/icons',
      emitManifest: true,
      respectNextImage: true,
      onConflict: 'overwrite',
    },
    tmpDir
  );

  let tapHookName = null;
  let tapHookFn = null;

  const fakeCompiler = {
    hooks: {
      beforeCompile: {
        tapPromise(name, fn) {
          tapHookName = name;
          tapHookFn = fn;
        },
      },
    },
  };

  plugin.apply(fakeCompiler);
  assert.equal(tapHookName, 'zapwebp');
  assert.ok(typeof tapHookFn === 'function');

  // Trigger beforeCompile hook
  await tapHookFn();

  // Verify converted files in outDir
  const outDir = path.join(tmpDir, 'public', 'icons');
  assert.ok(fs.existsSync(outDir));
  assert.ok(fs.existsSync(path.join(outDir, 'brand.webp')));
  assert.ok(fs.existsSync(path.join(outDir, 'brand@2x.webp')));

  // Verify manifest written
  const manifestPath = path.join(outDir, 'zapwebp.manifest.json');
  assert.ok(fs.existsSync(manifestPath));

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.generatedBy, 'zapwebp-next@1.0.0');
  assert.equal(manifest.totals.inputFiles, 1);
  assert.equal(manifest.totals.outputFiles, 2);
  assert.equal(manifest.files.length, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('svgLoader translates resourcePath into public WebP URL string', () => {
  const context = {
    resourcePath: '/path/to/project/src/assets/logo.svg',
    getOptions: () => ({ outDir: 'public/icons' }),
  };

  const output = svgLoader.call(context, '<svg></svg>');
  assert.equal(output, 'export default "/icons/logo.webp";');
});

test('zapwebpLoader derives optimized WebP URLs with dimensions and quality query', () => {
  const { zapwebpLoader } = require('../src/index');
  assert.equal(typeof zapwebpLoader, 'function');

  const url = zapwebpLoader({ src: '/images/hero.png', width: 800, quality: 80 });
  assert.equal(url, '/images/hero.webp?w=800&q=80');

  const remote = zapwebpLoader({ src: 'https://cdn.example.com/photo.jpg', width: 600 });
  assert.equal(remote, 'https://cdn.example.com/photo.jpg');
});

