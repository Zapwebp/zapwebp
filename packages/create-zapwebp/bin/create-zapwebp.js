#!/usr/bin/env node
'use strict';

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const path = require('node:path');
const { scaffoldProject } = require('../src');

function parseArgs(argv) {
  const options = {
    name: undefined,
    archetype: undefined,
    author: undefined,
    githubUser: undefined,
    packageManager: undefined,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--type' || arg === '-t') {
      options.archetype = argv[++i];
    } else if (arg === '--author' || arg === '-a') {
      options.author = argv[++i];
    } else if (arg === '--github' || arg === '-g') {
      options.githubUser = argv[++i];
    } else if (arg === '--pm' || arg === '--package-manager') {
      options.packageManager = argv[++i];
    } else if (arg.startsWith('--type=')) {
      options.archetype = arg.slice(7);
    } else if (arg.startsWith('--author=')) {
      options.author = arg.slice(9);
    } else if (arg.startsWith('--github=')) {
      options.githubUser = arg.slice(9);
    } else if (arg.startsWith('--pm=')) {
      options.packageManager = arg.slice(5);
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length === 1) {
    if (['format', 'storage', 'transform', 'metadata', 'build', 'custom', 'plugin', 'meta', 'cli'].includes(positional[0])) {
      options.archetype = options.archetype || positional[0];
    } else {
      options.name = options.name || positional[0];
    }
  } else if (positional.length >= 2) {
    if (['format', 'storage', 'transform', 'metadata', 'build', 'custom', 'plugin', 'meta', 'cli'].includes(positional[0])) {
      options.archetype = options.archetype || positional[0];
      options.name = options.name || positional[1];
    } else {
      options.name = options.name || positional[0];
      options.archetype = options.archetype || positional[1];
    }
  }

  return options;
}

async function promptUser(defaults) {
  const rl = readline.createInterface({ input, output });

  try {
    output.write('\n⚡ Welcome to create-zapwebp!\n');
    output.write('Scaffold an agent-native Zapwebp plugin skeleton.\n\n');

    let archetype = defaults.archetype;
    if (!archetype) {
      output.write('? What do you want to build?\n');
      output.write('  1) Format plugin     (add input/output format support)\n');
      output.write('  2) Storage adapter   (add cloud storage integration)\n');
      output.write('  3) Transform plugin  (crop, filter, resize, etc.)\n');
      output.write('  4) Metadata plugin   (strip, extract, or modify metadata)\n');
      output.write('  5) Build tool plugin (Vite, Next, Webpack integration)\n');
      output.write('  6) Custom plugin     (start from scratch)\n');

      const ans = (await rl.question('  Select archetype [1-6] (default: 1): ')).trim();
      if (ans === '2' || ans.toLowerCase() === 'storage') archetype = 'storage';
      else if (ans === '3' || ans.toLowerCase() === 'transform') archetype = 'transform';
      else if (ans === '4' || ans.toLowerCase() === 'metadata' || ans.toLowerCase() === 'meta') archetype = 'metadata';
      else if (ans === '5' || ans.toLowerCase() === 'build') archetype = 'build';
      else if (ans === '6' || ans.toLowerCase() === 'custom' || ans.toLowerCase() === 'plugin') archetype = 'custom';
      else archetype = 'format';
    }

    let name = defaults.name;
    if (!name) {
      name = (await rl.question('? Plugin name (default: my-zapwebp-plugin): ')).trim() || 'my-zapwebp-plugin';
    }

    let author = defaults.author;
    if (!author) {
      author = (await rl.question('? Your name (for LICENSE, package.json author) [Jane Doe]: ')).trim() || 'Jane Doe';
    }

    let githubUser = defaults.githubUser;
    if (!githubUser) {
      githubUser = (await rl.question('? GitHub username [janedoe]: ')).trim() || 'janedoe';
    }

    let packageManager = defaults.packageManager;
    if (!packageManager) {
      const pmAns = (await rl.question('? Which package manager? (pnpm/npm/yarn/bun) [pnpm]: ')).trim().toLowerCase();
      packageManager = ['npm', 'yarn', 'bun'].includes(pmAns) ? pmAns : 'pnpm';
    }

    return { archetype, name, author, githubUser, packageManager };
  } finally {
    rl.close();
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  let config;
  const isInteractive = process.stdin.isTTY && (!parsed.name || !parsed.archetype);

  if (isInteractive) {
    config = await promptUser(parsed);
  } else {
    config = {
      archetype: parsed.archetype || 'format',
      name: parsed.name || 'my-zapwebp-plugin',
      author: parsed.author || 'Jane Doe',
      githubUser: parsed.githubUser || 'janedoe',
      packageManager: parsed.packageManager || 'pnpm',
    };
  }

  try {
    const result = await scaffoldProject({
      targetDir: process.cwd(),
      ...config,
    });

    const relPath = path.relative(process.cwd(), result.targetDir) || result.pluginName;
    const pm = config.packageManager || 'pnpm';

    console.log(`\n✅ Scaffolded ${result.pluginName}\n`);
    console.log(`Your new plugin is at ./${relPath}/\n`);
    console.log('Before you start writing code:\n');
    console.log('  1. Open this folder in your editor (VS Code, Cursor, Antigravity, etc.)');
    console.log('  2. Read AGENTS.md — it tells the AI agent what you want to build');
    console.log('  3. Read SKILLS.md — it tells the AI agent how to build it');
    console.log('  4. If you\'re using an AI agent, ask it to fill in AGENTS.md and SKILLS.md');
    console.log('     based on what you want to build. Then ask it to start.\n');
    console.log('The scaffolder left AGENTS.md, SKILLS.md, and agent.json empty on purpose.');
    console.log('They are yours, not ours.\n');
    console.log('Quick reference:');
    console.log(`  cd ${relPath}`);
    console.log(`  ${pm} install`);
    console.log(`  ${pm} test       — run tests`);
    console.log(`  ${pm} run build  — build the plugin`);
    console.log(`  ${pm} changeset  — create a release note\n`);
  } catch (err) {
    console.error(`\n❌ Scaffolding failed: ${err.message}\n`);
    process.exit(1);
  }
}

main();
