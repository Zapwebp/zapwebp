#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { generateFaviconSuite } = require('../src/favicon');
const { normalizeSizes } = require('../src/write');

const pkg = require('../package.json');

function printHelp() {
  console.log(`
Zapwebp Favicon Generator v${pkg.version}
High-resolution multi-size ICO container and complete PWA favicon suite generator.

Usage:
  zapwebp-favicon <source-image> [options]

Options:
  -o, --out <directory>       Output directory for generated assets (default: ./favicon-dist)
  -n, --name <string>         Application name for site.webmanifest (default: 'App')
  -s, --short-name <string>   Short name for home screens
  -t, --theme-color <hex>     Theme color for browser header (default: #000000)
  -b, --background-color <hex> Background color for splash screen (default: #ffffff)
  --sizes <list>              Comma-separated resolutions for favicon.ico (default: 16,32,48,64,128,256)
  --prefix <url-path>         URL path prefix for tags and manifest (default: /)
  --html-file                 Write HTML link tags to <out>/favicon-tags.html
  --json                      Emit structured JSON output for AI agents and scripts
  -v, --version               Display version
  -h, --help                  Display this help message

Examples:
  zapwebp-favicon logo.svg -o ./public --name "My Project" --theme-color "#10b981"
  zapwebp-favicon icon.png --sizes 16,32,48,256 --json
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`zapwebp-favicon v${pkg.version}`);
    process.exit(0);
  }

  let sourcePath = null;
  let outDir = './favicon-dist';
  let name = 'App';
  let shortName = null;
  let themeColor = '#000000';
  let backgroundColor = '#ffffff';
  let prefix = '/';
  let sizes = null;
  let preset = null;
  let writeHtmlFile = false;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--out') {
      outDir = args[++i];
    } else if (arg === '-n' || arg === '--name') {
      name = args[++i];
    } else if (arg === '-s' || arg === '--short-name') {
      shortName = args[++i];
    } else if (arg === '-t' || arg === '--theme-color') {
      themeColor = args[++i];
    } else if (arg === '-b' || arg === '--background-color') {
      backgroundColor = args[++i];
    } else if (arg === '--prefix') {
      prefix = args[++i];
    } else if (arg === '--sizes') {
      sizes = normalizeSizes(args[++i]);
    } else if (arg === '-p' || arg === '--preset') {
      preset = args[++i];
    } else if (arg === '--html-file') {
      writeHtmlFile = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (!arg.startsWith('-')) {
      sourcePath = arg;
    }
  }

  if (!sourcePath) {
    console.error('Error: Please provide a source image path (e.g. zapwebp-favicon logo.svg)');
    process.exit(1);
  }

  const resolvedSource = path.resolve(process.cwd(), sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Error: Source file does not exist: "${resolvedSource}"`);
    process.exit(1);
  }

  try {
    const result = await generateFaviconSuite(resolvedSource, {
      name,
      shortName,
      themeColor,
      backgroundColor,
      prefix,
      sizes: sizes || undefined,
      preset: preset || undefined,
    });

    const resolvedOutDir = path.resolve(process.cwd(), outDir);
    fs.mkdirSync(resolvedOutDir, { recursive: true });

    const writtenFiles = [];
    let totalBytes = 0;

    for (const [filename, content] of Object.entries(result.files)) {
      const filePath = path.join(resolvedOutDir, filename);
      fs.writeFileSync(filePath, content);
      const byteSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8');
      totalBytes += byteSize;
      writtenFiles.push({ filename, size: byteSize, path: filePath });
    }

    if (writeHtmlFile) {
      const htmlPath = path.join(resolvedOutDir, 'favicon-tags.html');
      fs.writeFileSync(htmlPath, result.html + '\n', 'utf8');
      writtenFiles.push({ filename: 'favicon-tags.html', size: Buffer.byteLength(result.html), path: htmlPath });
    }

    if (jsonOutput) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            source: resolvedSource,
            outputDir: resolvedOutDir,
            files: writtenFiles,
            totalBytes,
            html: result.html,
            manifest: result.manifest,
          },
          null,
          2
        )
      );
    } else {
      console.log(`\n⚡ Zapwebp Favicon Suite Generated Successfully!`);
      console.log(`Destination: ${resolvedOutDir}\n`);
      for (const f of writtenFiles) {
        console.log(`  ✓ ${f.filename.padEnd(24)} ${(f.size / 1024).toFixed(2).padStart(8)} KB`);
      }
      console.log(`  -----------------------------------------`);
      console.log(`  Total: ${writtenFiles.length} files (${(totalBytes / 1024).toFixed(2)} KB)\n`);
      console.log(`HTML Snippet to paste into <head>:`);
      console.log('----------------------------------------------------');
      console.log(result.html);
      console.log('----------------------------------------------------\n');
    }
  } catch (err) {
    if (jsonOutput) {
      console.error(JSON.stringify({ ok: false, error: err.message, code: err.code }));
    } else {
      console.error(`\n❌ Error: ${err.message}`);
      if (err.fix) {
        console.error(`💡 Suggested Fix: ${err.fix}`);
      }
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
