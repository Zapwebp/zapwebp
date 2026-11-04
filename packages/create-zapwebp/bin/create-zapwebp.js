#!/usr/bin/env node
'use strict';

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { scaffoldProject, ARCHETYPES } = require('../src');

async function main() {
  const args = process.argv.slice(2);
  let archetype = args[0];
  let name = args[1];

  if (!archetype || !name) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!archetype) {
        output.write('⚡ Welcome to create-zapwebp!\n');
        output.write(`Available archetypes: ${ARCHETYPES.join(', ')}\n`);
        archetype = (await rl.question('? What do you want to build? (format|storage|plugin|cli|metadata): ')).trim();
      }
      if (!name) {
        name = (await rl.question('? What is the plugin or format name?: ')).trim();
      }
    } finally {
      rl.close();
    }
  }

  if (!archetype || !name) {
    console.error('Error: Archetype and name are required.');
    process.exit(1);
  }

  try {
    const result = await scaffoldProject({ archetype, name, targetDir: process.cwd() });
    console.log(`\n✅ Successfully scaffolded project at ${result.targetDir}`);
    console.log(`Generated ${result.files.length} files:\n  ${result.files.join('\n  ')}\n`);
    console.log('Next steps:');
    console.log(`  cd zapwebp-${archetype}-${name}`);
    console.log('  pnpm install && pnpm test\n');
  } catch (err) {
    console.error(`\n❌ Scaffolding failed: ${err.message}\n`);
    process.exit(1);
  }
}

main();
