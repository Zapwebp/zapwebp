'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

test('Laravel: all expected package files and directories exist', () => {
  const expectedFiles = [
    'composer.json',
    'package.json',
    'README.md',
    'config/zapwebp.php',
    'src/ZapwebpServiceProvider.php',
    'src/Facades/Zap.php',
    'src/Commands/ZapConvertCommand.php',
    'src/Commands/ZapCheckCommand.php',
    'src/Process/Runner.php',
    'src/Process/ConversionBuilder.php',
    'src/Process/ConversionResult.php',
    'src/Middleware/ConvertUploads.php',
    'src/Rules/SafeImage.php',
    'src/helpers.php',
  ];

  for (const rel of expectedFiles) {
    const full = path.join(rootDir, rel);
    assert.ok(fs.existsSync(full), `File ${rel} must exist in packages/laravel`);
  }
});

test('Laravel: composer.json contains valid configuration, autoloader, and extra metadata', () => {
  const composer = JSON.parse(fs.readFileSync(path.join(rootDir, 'composer.json'), 'utf8'));
  assert.equal(composer.name, 'zapwebp/laravel');
  assert.ok(composer.autoload['psr-4']['Zapwebp\\Laravel\\']);
  assert.ok(composer.autoload.files.includes('src/helpers.php'));
  assert.ok(composer.extra.laravel.providers.includes('Zapwebp\\Laravel\\ZapwebpServiceProvider'));
  assert.equal(composer.extra.laravel.aliases.Zap, 'Zapwebp\\Laravel\\Facades\\Zap');
});

test('Laravel: PHP syntax check passes on all source files via php -l', () => {
  const phpFiles = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collect(full);
      } else if (entry.isFile() && entry.name.endsWith('.php')) {
        phpFiles.push(full);
      }
    }
  }
  collect(srcDir);
  collect(path.join(rootDir, 'config'));

  assert.ok(phpFiles.length >= 10, 'Expected at least 10 PHP files');

  for (const file of phpFiles) {
    const out = execFileSync('php', ['-l', file], { encoding: 'utf8' });
    assert.match(out, /No syntax errors detected/);
  }
});

test('Laravel: helper functions generate valid URLs, srcsets, and picture tags', () => {
  const phpCode = `
    require_once '${path.join(srcDir, 'helpers.php').replace(/\\/g, '/')}';
    
    // 1. zap_url
    $url = zap_url('images/hero.png', ['to' => 'webp']);
    
    // 2. zap_srcset
    $srcset = zap_srcset('images/hero.png', [1, 2, 3], 'avif');
    
    // 3. zap_picture
    $picture = zap_picture('images/hero.png', ['alt' => 'Hero Banner', 'class' => 'hero-img'], [
        'formats' => ['avif', 'webp'],
        'scales' => [1, 2],
    ]);
    
    echo json_encode([
        'url' => $url,
        'srcset' => $srcset,
        'picture' => $picture,
    ]);
  `;

  const out = execFileSync('php', ['-r', phpCode], { encoding: 'utf8' });
  const data = JSON.parse(out);

  assert.equal(data.url, '/images/hero.webp');
  assert.ok(data.srcset.includes('/images/hero.avif 1x'));
  assert.ok(data.srcset.includes('/images/hero@2x.avif 2x'));
  assert.ok(data.srcset.includes('/images/hero@3x.avif 3x'));
  assert.ok(data.picture.startsWith('<picture>'));
  assert.ok(data.picture.includes('<source type="image/avif"'));
  assert.ok(data.picture.includes('<source type="image/webp"'));
  assert.ok(data.picture.includes('alt="Hero Banner"'));
  assert.ok(data.picture.includes('class="hero-img"'));
  assert.ok(data.picture.endsWith('</picture>'));
});

test('Laravel: ConversionResult computes saved bytes, percentage, and string casting', () => {
  const phpCode = `
    require_once '${path.join(srcDir, 'Process', 'ConversionResult.php').replace(/\\/g, '/')}';
    
    $res = new \\Zapwebp\\Laravel\\Process\\ConversionResult(
        outputPath: '/path/to/hero.webp',
        originalSize: 100000,
        convertedSize: 40000,
        format: 'webp',
        width: 800,
        height: 600,
        hasAlpha: true,
        durationMs: 42.5
    );
    
    echo json_encode([
        'outputPath' => $res->outputPath,
        'asString' => (string) $res,
        'savedBytes' => $res->savedBytes(),
        'savedPercent' => $res->savedPercentage(),
        'hasAlpha' => $res->hasAlpha,
        'format' => $res->format,
    ]);
  `;

  const out = execFileSync('php', ['-r', phpCode], { encoding: 'utf8' });
  const data = JSON.parse(out);

  assert.equal(data.outputPath, '/path/to/hero.webp');
  assert.equal(data.asString, '/path/to/hero.webp');
  assert.equal(data.savedBytes, 60000);
  assert.equal(data.savedPercent, 60.0);
  assert.equal(data.hasAlpha, true);
  assert.equal(data.format, 'webp');
});

