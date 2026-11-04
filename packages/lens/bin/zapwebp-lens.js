#!/usr/bin/env node
'use strict';

const {
  inspectCommand,
  compareCommand,
  alphaCommand,
  diffCommand,
  reportCommand,
} = require('../src');

const HELP = `zapwebp-lens — Inspect images. Never modifies.

USAGE
  zapwebp-lens <command> [files...] [options]

COMMANDS
  inspect <file>       List chunks, metadata, dimensions, and container info
  compare <fileA> <fileB> Side-by-side comparison on checkerboard
  alpha <file>         Isolate alpha channel & verify corner/edge transparency
  diff <fileA> <fileB> Byte-level and structural chunk diff
  report <files...>    Batch summary of multiple images

OPTIONS
  --open               Launch browser viewer with checkerboard
  --json               Emit structured JSON output
  --help, -h           Show this help message
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  const flags = {
    open: args.includes('--open'),
    json: args.includes('--json'),
  };
  const targets = args.slice(1).filter((a) => !a.startsWith('--'));

  try {
    switch (command) {
      case 'inspect':
        if (!targets[0]) throw new Error('File path required for inspect.');
        await inspectCommand(targets[0], flags);
        break;
      case 'compare':
        if (!targets[0] || !targets[1]) throw new Error('Two file paths required for compare.');
        await compareCommand(targets[0], targets[1], flags);
        break;
      case 'alpha':
        if (!targets[0]) throw new Error('File path required for alpha.');
        await alphaCommand(targets[0], flags);
        break;
      case 'diff':
        if (!targets[0] || !targets[1]) throw new Error('Two file paths required for diff.');
        await diffCommand(targets[0], targets[1], flags);
        break;
      case 'report':
        if (!targets.length) throw new Error('At least one file required for report.');
        await reportCommand(targets, flags);
        break;
      default:
        throw new Error(`Unknown command "${command}".\n\n${HELP}`);
    }
  } catch (err) {
    if (flags.json) {
      process.stderr.write(JSON.stringify({ error: err.message }) + '\n');
    } else {
      process.stderr.write(`⚡ lens! ${err.message}\n`);
    }
    process.exit(1);
  }
}

main();
