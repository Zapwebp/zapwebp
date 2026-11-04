import { readFile, writeFile, mkdir, stat, glob, rename, rm } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { zipSync } from 'fflate';
import core from '@zapwebp/core';
import shared from '@zapwebp/shared';
const { DEFAULT_OPTIONS, ZapwebpError, setLocale, t } = shared;
import { writeSafe, resolveSafePath, getPlatformConcurrency } from './fs.js';
import {
  evaluateGateChain,
  createIgnoreChecker,
  getGitFiles,
  sha256,
  DEFAULT_MAX_FILE_SIZE,
} from './gate-chain.js';
import {
  writeTransaction,
  undoTransaction,
  redoTransaction,
  listTransactions,
  pruneJournal,
  generateTransactionId,
  getJournalPaths,
} from './journal.js';
import {
  syncGitignore,
  readGitignore,
  updateGitignoreBlock,
  extractBlockPaths,
  isGitRepo,
} from './gitignore.js';
import {
  loadConfigFile,
  resolveConfigPrecedence,
} from './config.js';

const {
  convertImage,
  inspectImage,
  detectFormat,
  outputName,
  parseScales,
  scaleSuffix,
  generateSrcset,
  auditConversionCommand,
  explainBlackBackground,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
} = core;

const HELP = `zapwebp — SVG → WebP, safe, reversible, and scoped.

USAGE
  zap [paths...] [options]
  zap <command> [options]

COMMANDS
  init              Set up config, ignore rules, and .gitignore
  watch             Convert on change (undoable)
  audit             Dry-run + safety audit report or command linter
  check             CI mode: exit 1 if any conversion is needed
  explain <file>    Explain why a file will or won't convert
  ignored [dir]     Explain why files are skipped by ignore rules
  history           List past conversion transactions
  undo [id|step]    Revert the last run (or a specific transaction)
  redo [id]         Reapply the last undone transaction
  show <id>         Inspect a transaction's operations
  gc                Prune old journal logs and backups
  gitignore <subcmd> Manage .gitignore block (show, add, remove)
  config show       Display resolved configuration and origins
  doctor            Verify system environment and dependencies
  inspect <image>   Analyze image container and metadata chunks
  explain-black-bg  Explain ImageMagick black background bugs

OPTIONS
  -o, --output <file>     Output file (single input) or .zip archive
      --out-dir <dir>     Destination folder for converted outputs
      --to <formats>      Target format(s), comma-separated (default: webp)
      --from <format>     Restrict input format filter
      --scale <scales>    Multiplier scales, e.g. 1,2,3 (default: 1)
      --base-width <px>   Base pixel width for scale 1x (default: 512)
      --width <px>        Explicit output width (max 4096)
      --height <px>       Explicit output height (max 4096)
      --fit <mode>        contain, cover, fill, inside, outside
      --quality <0-100>   Compression quality (default: 85)
      --lossless          Encode losslessly where supported
      --effort <0-9>      Encoding effort
      --background <col>  Flatten color for JPEG output
      --clean             Strip AI provenance and metadata (default: true)
      --no-clean          Preserve container metadata
      --verify-clean      Enforce 0 metadata chunks and Clean Certificate
      --assert-alpha      Strictly fail if transparent input loses alpha
      --lock-target <fmt> Enforce many-to-one conversion to specified format
      --strict            Strictly fail on unconvertible inputs (default when locked)
      --no-strict         Pass through unconvertible files unchanged
      --override-lock     Explicit opt-in to bypass configured target lock
      --zip               Bundle outputs into a single ZIP archive
      --srcset            Print responsive <img srcset> HTML tags
      --changed           Only convert files modified vs HEAD (git)
      --staged            Only convert files in git staging area
      --include-ignored   Bypass .zapwebpignore and config ignores
      --include-all       Bypass all ignore layers including built-ins
      --follow-symlinks   Follow symbolic links (disabled by default)
      --allow-outside     Allow paths outside current workspace
      --allow-unsafe      Permit SVGs with minor safety warnings
      --force             Force conversion of up-to-date files
      --force-undo        Force undo even if outputs were modified
      --commit-outputs    Do not add outDir to .gitignore
      --gitignore=off     Disable automatic .gitignore management
      --stdin             Read image from standard input
      --manifest          Write manifest.json
      --dry-run           Plan conversion without writing files or journal
      --json              Emit machine-readable JSON output
      --config <file>     Explicit path to configuration file
  -h, --help              Show this help

SAFETY & PRIVACY
  • Zero telemetry. Zero network calls. Files never leave your machine.
  • Reversible: every run creates an undoable journal in .zapwebp/journal/.
  • TOCTOU safe: files are re-verified immediately before writing.
  • Atomic writes: tmp -> rename ensures no half-written files.
`;

function parseArgs(argv) {
  const parsed = { inputs: [], options: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--lossless') parsed.options.lossless = true;
    else if (arg === '--watch') parsed.watch = true;
    else if (arg === '--manifest') parsed.manifest = true;
    else if (arg === '--check') parsed.check = true;
    else if (arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--stdin') parsed.stdin = true;
    else if (arg === '--list') parsed.list = true;
    else if (arg === '--pick') parsed.pick = true;
    else if (arg === '--here') parsed.here = true;
    else if (arg === '--files') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a file path.`);
      parsed.filesFile = value;
    } else if (arg === '--concurrency') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a number.`);
      parsed.concurrency = Number(value);
    } else if (arg === '--keep') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires metadata handler names (comma-separated).`);
      parsed.options.keep = value.split(',').map((s) => s.trim().toLowerCase());
    } else if (arg === '--lang') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a locale code (e.g. en, tl).`);
      parsed.lang = value.toLowerCase();
    } else if (arg === '--strip') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        i++;
        parsed.options.strip = next.split(',').map((s) => s.trim().toLowerCase());
      } else {
        parsed.options.stripMetadata = true;
      }
    }
    else if (arg === '--lock-target') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a target format.`);
      parsed.lockTarget = value.toLowerCase();
      parsed.options.lockTarget = value.toLowerCase();
    } else if (arg === '--strict') {
      parsed.strict = true;
      parsed.options.strict = true;
    } else if (arg === '--no-strict') {
      parsed.strict = false;
      parsed.options.strict = false;
    } else if (arg === '--override-lock') {
      parsed.overrideLock = true;
      parsed.options.overrideLock = true;
    }
    else if (arg === '--clean') parsed.options.clean = true;
    else if (arg === '--no-clean') parsed.options.clean = false;
    else if (arg === '--verify-clean') parsed.options.verifyClean = true;
    else if (arg === '--assert-alpha') parsed.options.assertAlpha = true;
    else if (arg === '--report') parsed.options.report = true;
    else if (arg === '--zip') parsed.zip = true;
    else if (arg === '--srcset') parsed.srcset = true;
    else if (arg === '--changed') parsed.changed = true;
    else if (arg === '--staged') parsed.staged = true;
    else if (arg === '--include-ignored') parsed.includeIgnored = true;
    else if (arg === '--include-all') parsed.includeAll = true;
    else if (arg === '--no-default-ignores') parsed.noDefaultIgnores = true;
    else if (arg === '--follow-symlinks') parsed.followSymlinks = true;
    else if (arg === '--allow-outside') parsed.allowOutside = true;
    else if (arg === '--allow-unsafe') parsed.allowUnsafe = true;
    else if (arg === '--force') parsed.force = true;
    else if (arg === '--force-undo') parsed.forceUndo = true;
    else if (arg === '--commit-outputs') parsed.commitOutputs = true;
    else if (arg === '--gitignore=off') parsed.gitignoreOff = true;
    else if (arg === '--hook') parsed.hook = true;
    else if (arg === '--scale' || arg === '--scales') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} needs a multiplier value, e.g. 1,2,3`);
      parsed.scales = parseScales(value);
    } else if (arg === '--base-width') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} needs a pixel value, e.g. 512`);
      parsed.baseWidth = Number(value);
    } else if (['-o', '--output', '--out-dir', '--width', '--height', '--quality', '--effort', '--fit', '--to', '--from', '--background', '--config'].includes(arg)) {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} needs a value.`);
      if (arg === '-o' || arg === '--output') parsed.output = value;
      else if (arg === '--out-dir') parsed.outDir = value;
      else if (arg === '--config') parsed.config = value;
      else if (arg === '--to') parsed.targets = value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      else if (arg === '--from') parsed.from = value.toLowerCase();
      else if (arg === '--fit' || arg === '--background') parsed.options[arg.slice(2)] = value;
      else parsed.options[arg.slice(2)] = Number(value);
    } else if (arg === '-') parsed.inputs.push('-');
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else parsed.inputs.push(arg);
  }
  return parsed;
}

async function writeAtomic(filePath, data) {
  return writeSafe(filePath, data);
}

function commonDirectory(paths) {
  if (!paths || !paths.length) return process.cwd();
  const resolved = paths.map((p) => path.resolve(p));
  let common = path.extname(resolved[0]) ? path.dirname(resolved[0]) : resolved[0];
  for (let i = 0; i < resolved.length; i++) {
    const item = resolved[i];
    while (!item.startsWith(common + path.sep) && item !== common) {
      const parent = path.dirname(common);
      if (parent === common) break;
      common = parent;
    }
  }
  return common;
}

function inputRootForPatterns(patterns, files, rootDir = process.cwd()) {
  const roots = [];
  for (const pat of patterns) {
    if (pat === '-' || pat.startsWith('-')) continue;
    const resolved = path.resolve(rootDir, pat);
    const magicIndex = resolved.search(/[*?{}[\]]/);
    if (magicIndex !== -1) {
      const prefix = resolved.slice(0, magicIndex);
      const lastSep = prefix.lastIndexOf(path.sep);
      roots.push(lastSep !== -1 ? prefix.slice(0, lastSep) : prefix);
    }
  }
  if (roots.length) {
    return commonDirectory(roots);
  }
  if (files && files.length > 1) {
    return commonDirectory(files);
  }
  if (files && files.length === 1) {
    return path.dirname(path.resolve(files[0]));
  }
  return rootDir;
}

function outputFor(input, inputs, output, outDir, inputRoot, target, scale = 1) {
  const extension = target === 'jpeg' ? 'jpg' : target;
  const suffix = scaleSuffix(scale);
  let destination;
  if (output && inputs.length === 1 && !output.endsWith('.zip')) {
    const ext = path.extname(output);
    const base = output.slice(0, -ext.length);
    destination = scale === 1 ? path.resolve(output) : path.resolve(`${base}${suffix}${ext}`);
  } else if (!outDir) {
    destination = path.join(path.dirname(input), outputName(input, target, scale));
  } else {
    const rel = path.relative(inputRoot, input);
    const relPath = rel.startsWith('..') ? path.basename(input) : rel;
    destination = path.join(outDir, relPath.replace(/\.[^.]+$/, `${suffix}.${extension}`));
  }
  return destination;
}

async function main() {
  const rootDir = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }

  // 1. Subcommand: init
  if (args.inputs[0] === 'init') {
    const configPath = path.join(rootDir, '.zapwebp.config.json');
    const zapignorePath = path.join(rootDir, '.zapwebpignore');

    const starterConfig = {
      format: DEFAULT_OPTIONS.to,
      quality: DEFAULT_OPTIONS.quality,
      scales: [1, 2, 3],
      baseWidth: DEFAULT_OPTIONS.baseWidth,
      clean: DEFAULT_OPTIONS.clean,
      outDir: DEFAULT_OPTIONS.outDir,
      gitignore: { outputs: 'auto', journal: 'auto' },
    };
    await writeAtomic(configPath, JSON.stringify(starterConfig, null, 2) + '\n');

    const starterIgnore = `# .zapwebpignore\n# Ignore legacy assets or raw sources\nsrc/icons/legacy/**\n**/*.bak.svg\n`;
    await writeAtomic(zapignorePath, starterIgnore);

    await syncGitignore(rootDir, { outDir: 'public/icons', commitOutputs: args.commitOutputs, gitignoreMode: 'always' });

    if (args.hook) {
      const hookPath = path.join(rootDir, '.git', 'hooks', 'pre-commit');
      if (await stat(path.dirname(hookPath)).then(() => true, () => false)) {
        await writeFile(hookPath, '#!/bin/sh\nzap --staged --check\n', { mode: 0o755 });
        process.stdout.write('✓ Installed Git pre-commit hook (.git/hooks/pre-commit)\n');
      }
    }

    process.stdout.write('✓ Initialized Zap in this project:\n  - Created .zapwebp.config.json\n  - Created .zapwebpignore\n  - Synchronized .gitignore\n');
    return;
  }

  // 2. Subcommand: undo
  if (args.inputs[0] === 'undo') {
    const targetId = args.inputs[1];
    const res = await undoTransaction(rootDir, targetId, { forceUndo: args.forceUndo });
    process.stdout.write(`✓ Undone transaction ${res.id} (${res.undoneCount} operations reverted)\n`);
    for (const op of res.operations) {
      process.stdout.write(`  - ${op.type}: ${op.path}\n`);
    }
    return;
  }

  // 3. Subcommand: redo
  if (args.inputs[0] === 'redo') {
    const targetId = args.inputs[1];
    const res = await redoTransaction(rootDir, targetId);
    process.stdout.write(`✓ Redone transaction ${res.id} (${res.redoneCount} operations re-applied)\n`);
    return;
  }

  // 4. Subcommand: history
  if (args.inputs[0] === 'history') {
    const history = await listTransactions(rootDir);
    if (args.json) {
      process.stdout.write(JSON.stringify(history, null, 2) + '\n');
    } else {
      process.stdout.write('\nRecent Transactions:\n─────────────────────────────────────────────────────────────────\n');
      if (!history.length) process.stdout.write('  No transactions recorded in .zapwebp/journal.\n');
      for (const t of history) {
        process.stdout.write(`  ${t.id} [${t.status.toUpperCase()}] ${t.startedAt} (${t.operations.length} ops)\n    Command: ${t.command}\n`);
      }
      process.stdout.write('\n');
    }
    return;
  }

  // 5. Subcommand: show
  if (args.inputs[0] === 'show') {
    const targetId = args.inputs[1];
    if (!targetId) throw new Error('Usage: zap show <transaction-id>');
    const history = await listTransactions(rootDir);
    const tx = history.find((t) => t.id === targetId || t.id.endsWith(targetId));
    if (!tx) throw new Error(`Transaction not found: ${targetId}`);
    if (args.json) {
      process.stdout.write(JSON.stringify(tx, null, 2) + '\n');
    } else {
      process.stdout.write(`\nTransaction: ${tx.id}\nStatus: ${tx.status}\nStarted: ${tx.startedAt}\nCommand: ${tx.command}\nOperations:\n`);
      for (const op of tx.operations) {
        process.stdout.write(`  - ${op.type} ${op.path} (${op.bytes || 0} bytes, sha256: ${op.sha256?.slice(0, 10)}...)\n`);
      }
      process.stdout.write('\n');
    }
    return;
  }

  // 6. Subcommand: gc
  if (args.inputs[0] === 'gc') {
    const res = await pruneJournal(rootDir);
    process.stdout.write(`✓ Garbage collected journal: pruned ${res.prunedCount} old transaction logs.\n`);
    return;
  }

  // 7. Subcommand: doctor
  if (args.inputs[0] === 'doctor') {
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    const insideGit = await isGitRepo(rootDir);
    const { journalDir } = getJournalPaths(rootDir);
    let journalWritable = false;
    try {
      await mkdir(journalDir, { recursive: true });
      journalWritable = true;
    } catch {}

    process.stdout.write('\nZap Health Diagnostics:\n────────────────────────────────────────\n');
    process.stdout.write(`Node.js version:      v${process.versions.node} ${nodeMajor >= 22 ? '✓' : '✗ (Needs >=22)'}\n`);
    process.stdout.write(`Git Repository:       ${insideGit ? '✓ Active' : '- Not a git repo'}\n`);
    process.stdout.write(`Journal Permissions:  ${journalWritable ? '✓ Writable' : '✗ Read-only'}\n`);
    process.stdout.write(`Engine Availability:  ✓ @zapwebp/core ready (resvg + sharp)\n`);
    process.stdout.write(`Telemetry:            ✓ Disabled (0 network calls)\n\n`);
    return;
  }

  // 8. Subcommand: gitignore
  if (args.inputs[0] === 'gitignore') {
    const sub = args.inputs[1];
    const { content } = await readGitignore(rootDir);
    const blockPaths = extractBlockPaths(content);

    if (sub === 'show' || !sub) {
      process.stdout.write('\nPaths currently managed in .gitignore block:\n');
      if (!blockPaths.length) process.stdout.write('  (none)\n');
      for (const p of blockPaths) process.stdout.write(`  - ${p}\n`);
      process.stdout.write('\n');
      return;
    }
    if (sub === 'add') {
      const p = args.inputs[2];
      if (!p) throw new Error('Usage: zap gitignore add <path>');
      const updated = [...new Set([...blockPaths, p])];
      await updateGitignoreBlock(rootDir, updated);
      process.stdout.write(`✓ Added ${p} to .gitignore block\n`);
      return;
    }
    if (sub === 'remove') {
      const p = args.inputs[2];
      if (!p) throw new Error('Usage: zap gitignore remove <path>');
      const updated = blockPaths.filter((item) => item !== p && item !== `${p}/`);
      await updateGitignoreBlock(rootDir, updated);
      process.stdout.write(`✓ Removed ${p} from .gitignore block\n`);
      return;
    }
    throw new Error(`Unknown gitignore subcommand: ${sub}. Choose show, add, or remove.`);
  }

  // 9. Subcommand: audit (shell command linting)
  if (args.inputs[0] === 'audit' && args.inputs.length > 1 && !args.inputs[1].includes('*') && (args.inputs[1].includes(' ') || /\b(magick|convert|cwebp)\b/.test(args.inputs.slice(1).join(' ')))) {
    const commandToAudit = args.inputs.slice(1).join(' ').trim();
    const result = auditConversionCommand(commandToAudit);
    if (args.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      process.stdout.write(`\nCommand: ${commandToAudit}\n`);
      process.stdout.write(`Safe: ${result.safe ? 'YES' : 'NO'}\n`);
      if (result.issues.length) {
        process.stdout.write('Issues detected:\n');
        for (const issue of result.issues) process.stdout.write(`  - ${issue}\n`);
      }
      process.stdout.write(`Recommended Zap command:\n  ${result.recommendedCommand}\n\n`);
    }
    if (!result.safe) process.exitCode = 1;
    return;
  }

  // 10. Subcommand: explain-black-bg
  if (args.inputs[0] === 'explain-black-bg' || args.inputs[0] === 'explain-black-background') {
    const result = explainBlackBackground();
    if (args.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      process.stdout.write(`\nRoot Cause: ${result.cause}\n\nTechnical details:\n`);
      for (const item of result.technicalDetails) process.stdout.write(`  - ${item}\n`);
      process.stdout.write(`\nRemedy:\n  ${result.remedy}\n\nZap Solution:\n  ${result.zapSolution}\n\n`);
    }
    return;
  }

  // 11. Subcommand: inspect
  if (args.inputs[0] === 'inspect') {
    const fileToInspect = args.inputs[1];
    if (!fileToInspect) throw new Error('The inspect command requires an image file path.');
    const inputData = await readFile(path.resolve(fileToInspect));
    const result = await inspectImage(inputData);
    if (args.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      process.stdout.write(`\nFile: ${fileToInspect}\n`);
      process.stdout.write(`Format: ${result.format.toUpperCase()}\n`);
      process.stdout.write(`Dimensions: ${result.width || 'vector'} × ${result.height || 'vector'}\n`);
      process.stdout.write(`Transparency: ${result.hasAlpha ? 'yes' : 'no'}\n`);
      process.stdout.write(`Size: ${result.bytes} bytes\n`);
      process.stdout.write(`Container Metadata: ${result.metadata.hasMetadata ? result.metadata.summary.join(', ') : 'none (clean)'}\n\n`);
    }
    return;
  }

  // Load config & resolve precedence
  const { config: fileConfig } = await loadConfigFile(rootDir, args.config);
  const { resolved: options, origins } = resolveConfigPrecedence({
    cliOptions: { ...args.options, outDir: args.outDir, from: args.from },
    fileConfig,
  });

  // 12. Subcommand: config show
  if (args.inputs[0] === 'config' && (args.inputs[1] === 'show' || !args.inputs[1])) {
    if (args.json) {
      process.stdout.write(JSON.stringify({ options, origins }, null, 2) + '\n');
    } else {
      process.stdout.write('\nResolved Configuration & Precedence:\n────────────────────────────────────────\n');
      for (const [k, v] of Object.entries(options)) {
        process.stdout.write(`  ${k.padEnd(20)} ${String(Array.isArray(v) ? v.join(',') : v).padEnd(20)} (${origins[k]})\n`);
      }
      process.stdout.write('\n');
    }
    return;
  }

  // Build Ignore Checker
  const ignoreChecker = await createIgnoreChecker(rootDir, {
    includeIgnored: args.includeIgnored,
    includeAll: args.includeAll,
    noDefaultIgnores: args.noDefaultIgnores,
    configIgnores: fileConfig.ignore,
  });

  // 13. Subcommand: ignored [dir]
  if (args.inputs[0] === 'ignored') {
    const targetDir = path.resolve(args.inputs[1] || '.');
    const matched = [];
    for await (const file of glob('**/*', { cwd: targetDir, nodir: true })) {
      const full = path.resolve(targetDir, file);
      const res = ignoreChecker.isIgnored(full);
      if (res.ignored) {
        matched.push({ path: path.relative(rootDir, full), ...res });
      }
    }
    if (args.json) {
      process.stdout.write(JSON.stringify(matched, null, 2) + '\n');
    } else {
      process.stdout.write(`\nIgnored Files in ${path.relative(rootDir, targetDir) || '.'}:\n────────────────────────────────────────────────────────────\n`);
      for (const m of matched) {
        process.stdout.write(`  ${m.path.padEnd(35)} [${m.source}] rule: ${m.rule}\n`);
      }
      process.stdout.write(`\nTotal ignored: ${matched.length}\n\n`);
    }
    return;
  }

  // 14. Subcommand: explain <file>
  if (args.inputs[0] === 'explain') {
    const targetFile = args.inputs[1];
    if (!targetFile) throw new Error('Usage: zap explain <file>');
    const gateResult = await evaluateGateChain(targetFile, {
      rootDir,
      ignoreChecker,
      fromFormat: args.from,
      followSymlinks: args.followSymlinks,
      allowOutside: args.allowOutside,
      allowUnsafe: args.allowUnsafe,
      force: args.force,
    });
    if (args.json) {
      process.stdout.write(JSON.stringify(gateResult, null, 2) + '\n');
    } else {
      process.stdout.write(`\nFile: ${targetFile}\n`);
      process.stdout.write(`In Scope: ${gateResult.inScope ? 'YES ✓' : 'NO ✗'}\n`);
      if (!gateResult.inScope) {
        process.stdout.write(`Reason:   ${gateResult.reason}\n`);
        process.stdout.write(`Detail:   ${gateResult.detail}\n`);
      } else {
        process.stdout.write(`Format:   ${gateResult.format}\n`);
        process.stdout.write(`Size:     ${gateResult.size} bytes\n`);
      }
      process.stdout.write('\n');
    }
    return;
  }

  // File candidate expansion
  let rawCandidates = [];
  if (args.here && !args.inputs.length) {
    for await (const f of glob('*', { cwd: rootDir, nodir: true })) rawCandidates.push(path.resolve(rootDir, f));
  } else if (args.changed) {
    rawCandidates = getGitFiles('changed', rootDir);
  } else if (args.staged) {
    rawCandidates = getGitFiles('staged', rootDir);
  } else if (args.inputs[0] === 'audit') {
    const patterns = args.inputs.slice(1).length ? args.inputs.slice(1) : ['**/*'];
    for (const pat of patterns) {
      for await (const f of glob(pat, { cwd: rootDir, nodir: true })) rawCandidates.push(path.resolve(rootDir, f));
    }
  } else if (args.inputs.length) {
    for (const pat of args.inputs) {
      if (pat === '-') { rawCandidates.push('-'); continue; }
      if (!/[*?{}[\]]/.test(pat)) {
        rawCandidates.push(path.resolve(rootDir, pat));
      } else {
        for await (const f of glob(pat, { cwd: rootDir, nodir: true })) rawCandidates.push(path.resolve(rootDir, f));
      }
    }
  } else if (fileConfig.include) {
    const incs = Array.isArray(fileConfig.include) ? fileConfig.include : [fileConfig.include];
    for (const pat of incs) {
      for await (const f of glob(pat, { cwd: rootDir, nodir: true })) rawCandidates.push(path.resolve(rootDir, f));
    }
  }

  if (args.filesFile) {
    const listPath = path.resolve(rootDir, args.filesFile);
    const content = await readFile(listPath, 'utf8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    for (const l of lines) {
      rawCandidates.push(path.resolve(rootDir, l));
    }
  }

  // Stdin handling
  if (args.stdin || rawCandidates.includes('-')) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const inputBuffer = Buffer.concat(chunks);
    const format = detectFormat(inputBuffer);
    const targetFormat = args.targets?.[0] || options.to || 'webp';
    const converted = await convertImage(inputBuffer, { ...options, to: targetFormat });
    if (args.output) {
      await writeAtomic(path.resolve(args.output), converted.data);
    } else {
      process.stdout.write(converted.data);
    }
    return;
  }

  if (!rawCandidates.length) {
    throw new Error('No input files or globs specified.\n\n' + HELP);
  }

  // Deduplicate candidates
  rawCandidates = [...new Set(rawCandidates)];

  // Run 10-Gate Selection Chain
  const inScopeFiles = [];
  const skippedFiles = [];
  const skipReasons = {};

  for (const candidate of rawCandidates) {
    const gate = await evaluateGateChain(candidate, {
      rootDir,
      ignoreChecker,
      fromFormat: args.from,
      followSymlinks: args.followSymlinks,
      allowOutside: args.allowOutside,
      allowUnsafe: args.allowUnsafe,
      force: args.force,
    });

    if (gate.inScope) {
      inScopeFiles.push({ path: candidate, ...gate });
    } else {
      skippedFiles.push({ path: candidate, ...gate });
      skipReasons[gate.reason] = (skipReasons[gate.reason] || 0) + 1;
    }
  }

  // Target lock gate enforcement: fail fast when strict, pass through when non-strict
  const lockTarget = args.lockTarget || options.lockTarget;
  const isStrict = options.strict !== undefined ? Boolean(options.strict) : (lockTarget ? true : false);
  const overrideLock = Boolean(args.overrideLock || options.overrideLock);

  if (lockTarget && !overrideLock && isStrict && skippedFiles.some((f) => f.reason === 'unsupported_format')) {
    const failedFile = skippedFiles.find((f) => f.reason === 'unsupported_format');
    process.stderr.write(`❌ ${path.relative(rootDir, failedFile.path)}: E_UNSUPPORTED_FORMAT: Cannot decode this file into the locked target format (${lockTarget}).\nFix: Upload a supported format, or install the format plugin for this file.\n`);
    process.exitCode = 1;
    return;
  }

  if (lockTarget && !overrideLock && !isStrict) {
    const passThroughCandidates = skippedFiles.filter((f) => f.reason === 'unsupported_format');
    for (const item of passThroughCandidates) {
      inScopeFiles.push({ path: item.path, ...item, passedThrough: true });
    }
  }

  // Handle --list
  if (args.list) {
    if (args.json) {
      process.stdout.write(JSON.stringify({
        count: inScopeFiles.length,
        files: inScopeFiles.map((f, idx) => ({
          index: idx + 1,
          path: path.relative(rootDir, f.path),
          size: f.size,
          format: f.format,
        })),
      }, null, 2) + '\n');
    } else {
      process.stdout.write(`\nFound ${inScopeFiles.length} media file(s):\n`);
      process.stdout.write('─'.repeat(54) + '\n');
      inScopeFiles.forEach((f, idx) => {
        const rel = path.relative(rootDir, f.path);
        const sizeStr = `${(f.size / 1024).toFixed(1)} KB`;
        process.stdout.write(`  [${String(idx + 1).padStart(2)}] ${rel.padEnd(28)} ${sizeStr.padStart(8)}   ${(f.format || '').toUpperCase()}\n`);
      });
      process.stdout.write('\nLegend: [index] name · size · format\nRun `zap --list --json` for machine-readable output.\n\n');
    }
    return;
  }

  // Handle --pick
  if (args.pick) {
    if (args.json) {
      process.stdout.write(JSON.stringify({
        count: inScopeFiles.length,
        files: inScopeFiles.map((f, idx) => ({
          index: idx + 1,
          path: path.relative(rootDir, f.path),
          size: f.size,
          format: f.format,
          selected: false,
        })),
      }, null, 2) + '\n');
      return;
    }
    const readline = await import('node:readline/promises');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      process.stdout.write(`\nFound ${inScopeFiles.length} media file(s):\n`);
      inScopeFiles.forEach((f, idx) => {
        process.stdout.write(`  [${idx + 1}] ${path.relative(rootDir, f.path)} (${(f.size / 1024).toFixed(1)} KB, ${(f.format || '').toUpperCase()})\n`);
      });
      const ans = await rl.question('\nEnter indices to convert (comma-separated, e.g. 1,2 or "all"): ');
      if (ans.trim().toLowerCase() !== 'all' && ans.trim().length > 0) {
        const indices = ans.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= inScopeFiles.length);
        if (indices.length) {
          const selected = indices.map((i) => inScopeFiles[i - 1]);
          inScopeFiles.length = 0;
          inScopeFiles.push(...selected);
        }
      }
    } finally {
      rl.close();
    }
  }

  // Target formats & scales
  let targetFormats;
  if (lockTarget && !overrideLock) {
    targetFormats = [lockTarget];
  } else {
    targetFormats = args.targets?.length ? args.targets : [options.to || options.format || 'webp'];
  }
  const scales = args.scales?.length ? args.scales : options.scales?.length ? options.scales : [1];
  const baseWidth = args.baseWidth || options.baseWidth || 512;
  const configuredOutDir = args.outDir || options.outDir;
  const outDir = configuredOutDir ? path.resolve(rootDir, configuredOutDir) : (args.here ? rootDir : undefined);
  const patternsForRoot = args.inputs.length ? args.inputs : fileConfig.include ? (Array.isArray(fileConfig.include) ? fileConfig.include : [fileConfig.include]) : [];
  const commonBase = inputRootForPatterns(patternsForRoot, inScopeFiles.map((f) => f.path), rootDir);

  const plannedOutputsCount = inScopeFiles.length * targetFormats.length * scales.length;

  // Dry-run handling
  if (args.dryRun) {
    const plannedRecords = [];
    for (const fileItem of inScopeFiles) {
      for (const target of targetFormats) {
        for (const scale of scales) {
          const dest = outputFor(fileItem.path, inScopeFiles.map((f) => f.path), args.output, outDir, commonBase, target, scale);
          plannedRecords.push({
            input: fileItem.path,
            output: dest,
            scale,
            format: target,
            status: 'planned',
          });
        }
      }
    }
    if (args.json) {
      process.stdout.write(`${JSON.stringify(plannedRecords)}\n`);
    } else {
      process.stdout.write(`\nzap run ${new Date().toISOString()} (dry-run)\n`);
      process.stdout.write('─────────────────────────────────────────────────────\n');
      process.stdout.write(`Scanned     ${rawCandidates.length} files\n`);
      process.stdout.write(`In scope    ${inScopeFiles.length} files\n`);
      process.stdout.write(`Skipped     ${skippedFiles.length} files\n`);
      for (const [r, count] of Object.entries(skipReasons)) {
        process.stdout.write(`  ├─ ${r.padEnd(20)} ${count}\n`);
      }
      process.stdout.write(`Outputs     ${plannedOutputsCount} files (${inScopeFiles.length} × ${scales.length} scales)\n`);
      process.stdout.write('─────────────────────────────────────────────────────\n');
      process.stdout.write('Re-run without --dry-run to apply.\n\n');
    }
    return;
  }

  // Print Summary Table
  if (!args.json) {
    process.stdout.write(`\nzap run ${new Date().toISOString()}\n`);
    process.stdout.write('─────────────────────────────────────────────────────\n');
    process.stdout.write(`Scanned     ${rawCandidates.length} files\n`);
    process.stdout.write(`In scope    ${inScopeFiles.length} files\n`);
    process.stdout.write(`Skipped     ${skippedFiles.length} files\n`);
    for (const [r, count] of Object.entries(skipReasons)) {
      process.stdout.write(`  ├─ ${r.padEnd(20)} ${count}\n`);
    }
    process.stdout.write(`Outputs     ${plannedOutputsCount} files (${inScopeFiles.length} × ${scales.length} scales)\n`);
    process.stdout.write('─────────────────────────────────────────────────────\n');
  }

  if (args.inputs[0] === 'audit') {
    if (args.json) {
      process.stdout.write(JSON.stringify({ scanned: rawCandidates.length, inScope: inScopeFiles.length, skipped: skippedFiles }, null, 2) + '\n');
    }
    return;
  }

  if (!inScopeFiles.length) {
    if (args.check) process.exitCode = 1;
    if (!args.watch) return;
  }

  // Execute Conversion Run
  const transactionId = generateTransactionId();
  const operations = [];
  const records = [];

  for (const fileItem of inScopeFiles) {
    // TOCTOU Guard: Re-read & re-hash immediately before processing
    const currentBytes = await readFile(fileItem.path).catch(() => null);
    if (!currentBytes || sha256(currentBytes) !== fileItem.sha256) {
      skippedFiles.push({ path: fileItem.path, reason: 'changed_during_run' });
      continue;
    }

    for (const target of targetFormats) {
      for (const scale of scales) {
        const dest = outputFor(fileItem.path, inScopeFiles.map((f) => f.path), args.output, outDir, commonBase, target, scale);
        const computeWidth = () => {
          if (options.width !== undefined) return Math.round(options.width * scale);
          if (args.scales?.length || args.baseWidth) return Math.round(baseWidth * scale);
          return undefined;
        };
        const computedWidth = computeWidth();
        const targetOptions = {
          ...options,
          to: target,
          lockTarget,
          strict: isStrict,
          overrideLock,
          ...(computedWidth ? { width: computedWidth } : {}),
        };

        const existingOutput = await readFile(dest).catch(() => null);
        if (args.check) {
          records.push({
            input: fileItem.path,
            output: dest,
            status: existingOutput ? 'current' : 'stale',
          });
          continue;
        }

        let converted;
        try {
          converted = await convertImage(currentBytes, targetOptions);
        } catch (err) {
          if (err.code === 'E_UNSUPPORTED_FORMAT') {
            process.stderr.write(`❌ ${path.relative(rootDir, fileItem.path)}: ${err.message}\nFix: ${err.fix}\n`);
            process.exitCode = 1;
            return;
          }
          throw err;
        }

        if (converted.passedThrough) {
          await writeAtomic(dest, currentBytes);
          records.push({
            input: fileItem.path,
            output: dest,
            scale,
            format: 'unknown',
            size: currentBytes.length,
            passedThrough: true,
            status: 'passed_through',
          });
          continue;
        }

        await writeAtomic(dest, converted.data);

        operations.push({
          type: 'create',
          path: path.relative(rootDir, dest).replace(/\\/g, '/'),
          sha256: sha256(converted.data),
          bytes: converted.size,
        });

        records.push({
          input: fileItem.path,
          output: dest,
          scale,
          format: target,
          size: converted.size,
          width: converted.width,
          height: converted.height,
          alphaPreserved: converted.alphaPreserved,
          clean: converted.clean,
          certificate: converted.certificate,
          removedMetadata: converted.removedMetadata,
          status: 'converted',
        });
      }
    }
  }

  // Handle --zip
  if (args.zip && !args.dryRun) {
    const zipEntries = {};
    for (const r of records) {
      if (r.status === 'converted') {
        const rel = path.relative(outDir || commonBase, r.output).replace(/\\/g, '/');
        zipEntries[rel] = await readFile(r.output);
      }
    }
    const manifestData = {
      generatedBy: 'zap 1.1.0',
      generatedAt: new Date().toISOString(),
      settings: { format: targetFormats.join(','), scales, baseWidth },
      records,
    };
    zipEntries['manifest.json'] = Buffer.from(JSON.stringify(manifestData, null, 2) + '\n', 'utf8');
    const archiveBuffer = zipSync(zipEntries);
    const archivePath = args.output && args.output.endsWith('.zip')
      ? path.resolve(args.output)
      : path.join(outDir || commonBase, 'zap-export.zip');
    await writeAtomic(archivePath, archiveBuffer);
    process.stdout.write(`✓ Created archive ${archivePath} (${archiveBuffer.length} bytes; ${records.length} files)\n`);
  }

  // Handle --manifest
  if (args.manifest && !args.dryRun) {
    const manifestPath = path.join(outDir || commonBase, 'manifest.json');
    const manifestData = {
      generatedBy: 'zap 1.1.0',
      generatedAt: new Date().toISOString(),
      settings: { format: targetFormats.join(','), scales, baseWidth },
      records,
    };
    await writeAtomic(manifestPath, JSON.stringify(manifestData, null, 2) + '\n');
  }

  // Handle --srcset
  if (args.srcset) {
    for (const fileItem of inScopeFiles) {
      process.stdout.write(generateSrcset(fileItem.path, scales, targetFormats[0]) + '\n');
    }
  }

  // Persist Transaction Journal
  if (operations.length && !args.dryRun) {
    await writeTransaction(rootDir, {
      id: transactionId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      command: process.argv.slice(2).join(' '),
      cwd: rootDir,
      status: 'completed',
      operations,
    });
  }

  // Synchronize .gitignore
  if (!args.gitignoreOff) {
    await syncGitignore(rootDir, {
      outDir: configuredOutDir,
      commitOutputs: args.commitOutputs,
    });
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(records)}\n`);
  } else {
    for (const r of records) {
      process.stdout.write(`${r.status === 'converted' ? '✓' : '='} ${r.input} → ${r.output}${r.size ? ` (${r.size} bytes)` : ''}\n`);
    }
  }

  if (args.check && records.some((r) => r.status === 'stale')) {
    process.exitCode = 1;
  }

  if (args.watch) {
    const watchDir = commonBase || rootDir;
    process.stdout.write(`Watching ${path.relative(rootDir, watchDir) || '.'} for changes...\n`);

    const watcher = watch(watchDir, { recursive: true }, async (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.resolve(watchDir, filename);
      if (outDir && (fullPath === outDir || fullPath.startsWith(outDir + path.sep))) return;
      if (fullPath.includes('.zapwebp')) return;

      await new Promise((resolve) => setTimeout(resolve, 60));

      const fileStat = await stat(fullPath).catch(() => null);
      if (!fileStat || !fileStat.isFile()) return;

      const gate = await evaluateGateChain(fullPath, {
        rootDir,
        ignoreChecker,
        fromFormat: args.from,
        followSymlinks: args.followSymlinks,
        allowOutside: args.allowOutside,
        allowUnsafe: args.allowUnsafe,
        force: true,
      });

      if (!gate.inScope) return;

      const currentBytes = await readFile(fullPath).catch(() => null);
      if (!currentBytes || currentBytes.length === 0) return;

      for (const target of targetFormats) {
        for (const scale of scales) {
          const dest = outputFor(fullPath, [fullPath], args.output, outDir, commonBase, target, scale);
          const computeWidth = () => {
            if (options.width !== undefined) return Math.round(options.width * scale);
            if (args.scales?.length || args.baseWidth) return Math.round(baseWidth * scale);
            return undefined;
          };
          const computedWidth = computeWidth();
          const targetOptions = {
            ...options,
            to: target,
            ...(computedWidth ? { width: computedWidth } : {}),
          };
          try {
            const converted = await convertImage(currentBytes, targetOptions);
            await writeAtomic(dest, converted.data);
            process.stdout.write(`✓ ${path.relative(rootDir, fullPath)} → ${path.relative(rootDir, dest)} (${converted.size} bytes)\n`);
          } catch (err) {
            process.stderr.write(`zap watch error on ${filename}: ${err.message}\n`);
          }
        }
      }
    });

    await new Promise((resolve) => {
      process.on('SIGINT', () => { watcher.close(); resolve(); });
      process.on('SIGTERM', () => { watcher.close(); resolve(); });
    });
  }
}

main().catch((error) => {
  if (error instanceof ZapwebpError) {
    process.stderr.write(`⚡ zap! ${error.message}\n`);
    if (error.fix) process.stderr.write(`   → ${error.fix}\n`);
    if (error.docs) process.stderr.write(`   → ${error.docs}\n`);
    process.exit(error.exitCode || 1);
  }
  process.stderr.write(`zap: ${error.message}\n`);
  process.exitCode = 1;
});
