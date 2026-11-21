#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { buildDocs, serveDocs, initDocs } = require('../src');
const pkg = require('../package.json');

const HELP = `⚡ zapwebp-docs — Universal Documentation Delivery Engine (v${pkg.version})

USAGE
  zapwebp-docs <command> [options]
  docs <command> [options]

COMMANDS
  build             Compile Markdown files into static HTML, .md mirrors, and agent manifests
  serve, preview    Launch local zero-dependency preview server for built static docs
  init              Scaffold starter docs.config.json and content/index.md in current directory

BUILD OPTIONS
  -c, --config <file>     Path to docs.config.json (default: ./docs.config.json)
  --content <dir>         Content directory containing Markdown files (default: content)
  -o, --output <dir>      Output destination directory (default: dist)
  --json                  Output build metrics in structured JSON format

SERVE OPTIONS
  -d, --dir <dir>         Directory to serve (default: dist)
  -p, --port <number>     Port number (default: 3000)
  --host <host>           Host address (default: localhost)

GLOBAL OPTIONS
  -h, --help              Show this help message
  -v, --version           Print version information

EXAMPLES
  $ zapwebp-docs build
  $ zapwebp-docs build --config docs.custom.json --output public_html
  $ zapwebp-docs serve --port 8080
  $ zapwebp-docs init
`;

async function main() {
  const args = process.argv.slice(2);

  if (!args.length || args.includes('-h') || args.includes('--help')) {
    console.log(HELP);
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`@zapwebp/docs v${pkg.version}`);
    process.exit(0);
  }

  const command = args[0];

  if (command === 'build') {
    let configFile = null;
    let contentDir = null;
    let outputDir = null;
    let jsonOutput = false;

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-c' || arg === '--config') {
        configFile = args[++i];
      } else if (arg === '--content') {
        contentDir = args[++i];
      } else if (arg === '-o' || arg === '--output') {
        outputDir = args[++i];
      } else if (arg === '--json') {
        jsonOutput = true;
      }
    }

    const overrides = {};
    if (contentDir) overrides.content = { dir: contentDir };
    if (outputDir) overrides.output = { dir: outputDir };

    try {
      const res = await buildDocs(configFile, overrides, process.cwd());

      if (jsonOutput) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(`\n⚡ zapwebp-docs build complete!`);
        console.log(`   Compiled: ${res.pageCount} page(s)`);
        console.log(`   Output:   ${res.distDir}`);
        console.log(`   Duration: ${res.durationMs}ms`);
        console.log(`\nOutputs generated:`);
        console.log(`   ✔ Static HTML per page (zero JS required to read)`);
        console.log(`   ✔ .md mirrors for AI crawlers`);
        console.log(`   ✔ llms.txt & llms-full.txt`);
        console.log(`   ✔ sitemap.xml & robots.txt`);
        console.log(`   ✔ agent.json`);
        console.log(`   ✔ search-index.json`);
      }
    } catch (err) {
      console.error(`\n❌ Build failed: ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  } else if (command === 'serve' || command === 'preview') {
    let dir = 'dist';
    let port = 3000;
    let host = 'localhost';

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-d' || arg === '--dir') {
        dir = args[++i];
      } else if (arg === '-p' || arg === '--port') {
        port = parseInt(args[++i], 10);
      } else if (arg === '--host') {
        host = args[++i];
      }
    }

    try {
      const instance = await serveDocs({ dir, port, host });
      console.log(`\n⚡ zapwebp-docs preview running!`);
      console.log(`   Local: ${instance.url}`);
      console.log(`   Serving: ${path.resolve(process.cwd(), dir)}`);
      console.log(`\nPress Ctrl+C to stop.\n`);

      process.on('SIGINT', async () => {
        await instance.close();
        process.exit(0);
      });
    } catch (err) {
      console.error(`\n❌ Failed to start server: ${err.message}`);
      process.exit(1);
    }
  } else if (command === 'init') {
    const force = args.includes('--force');
    const result = initDocs(process.cwd(), { force });

    console.log(`\n⚡ zapwebp-docs project initialized!`);
    if (result.configCreated) {
      console.log(`   Created: ${path.relative(process.cwd(), result.configPath)}`);
    } else {
      console.log(`   Existing config preserved: ${path.relative(process.cwd(), result.configPath)}`);
    }

    if (result.contentCreated) {
      console.log(`   Created: ${path.relative(process.cwd(), result.indexPath)}`);
    } else {
      console.log(`   Existing index preserved: ${path.relative(process.cwd(), result.indexPath)}`);
    }
    console.log(`\nNext steps:`);
    console.log(`   1. Run 'npx zapwebp-docs build' to build static site`);
    console.log(`   2. Run 'npx zapwebp-docs serve' to preview site\n`);
  } else {
    console.error(`Unknown command: "${command}". Run "zapwebp-docs --help" for available commands.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
