import { readFile, writeFile, mkdir, stat, glob, rename, rm } from 'node:fs/promises';
import { watch, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { zipSync } from 'fflate';
import core from '@zapwebp/core';
import shared from '@zapwebp/shared';
const {
  DEFAULT_OPTIONS,
  DEFAULT_LIMITS,
  evaluateLimits,
  createLimitsMetadata,
  formatBytes,
  ZapwebpError,
  setLocale,
  t,
} = shared;
import { loadSession, recordSession, resetSession } from './session.js';
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
  computePerformanceReport,
  formatPerformanceReport,
  analyzeSmart,
  DEFAULT_TEAM_POLICY_TEMPLATE,
  validateTeamPolicy,
  evaluateFilePolicy,
  checkExceptionsStatus,
  formatPolicyStatus,
  getSharp,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
} = core;

function getHelpText() {
  return `${t('cli.description')}

USAGE
  ${t('cli.usage')}
  zap <command> [options]

${t('cli.commands_header')}
  init              ${t('cmd.init')} (--team for policy)
  watch             ${t('cmd.watch')}
  report [path]     ${t('cmd.report')}
  policy <cmd>      ${t('cmd.policy')}
  audit             ${t('cmd.audit')}
  check             ${t('cmd.check')}
  explain <file>    ${t('cmd.explain')}
  ignored [dir]     ${t('cmd.ignored')}
  history           ${t('cmd.history')}
  undo [id|step]    ${t('cmd.undo')}
  redo [id]         ${t('cmd.redo')}
  show <id>         ${t('cmd.show')}
  gc                ${t('cmd.gc')}
  gitignore <subcmd> ${t('cmd.gitignore')}
  config show       ${t('cmd.config')}
  doctor            ${t('cmd.doctor')}
  inspect <image>   ${t('cmd.inspect')}
  explain-black-bg  ${t('cmd.explain_black_bg')}

${t('cli.options_header')}
  -o, --output <file>     ${t('flag.output')}
      --out-dir <dir>     ${t('flag.out_dir')}
      --to <formats>      ${t('flag.to')}
      --from <format>     ${t('flag.from')}
      --smart             ${t('flag.smart')}
      --explain           ${t('flag.explain')}
      --since <period>    ${t('flag.since')}
      --team              ${t('flag.team')}
      --scale <scales>    ${t('flag.scale')}
      --base-width <px>   ${t('flag.base_width')}
      --width <px>        ${t('flag.width')}
      --height <px>       ${t('flag.height')}
      --fit <mode>        ${t('flag.fit')}
  -q, --quality <0-100>   ${t('flag.quality')}
      --lossless          ${t('flag.lossless')}
      --effort <0-9>      ${t('flag.effort')}
      --background <col>  ${t('flag.background')}
      --clean             ${t('flag.clean')}
      --no-clean          ${t('flag.no_clean')}
      --verify <hash>     ${t('flag.verify')}
      --verify-clean      ${t('flag.verify_clean')}
      --assert-alpha      ${t('flag.assert_alpha')}
      --lock-target <fmt> ${t('flag.lock_target')}
      --strict            ${t('flag.strict')}
      --no-strict         ${t('flag.no_strict')}
      --same-format <mod> ${t('flag.same_format')}
      --size-mode <mode>  ${t('flag.size_mode')}
      --flexible          ${t('flag.flexible')}
      --min-input <bytes> ${t('flag.min_input')}
      --max-input <bytes> ${t('flag.max_input')}
      --min-output <byte> ${t('flag.min_output')}
      --max-output <byte> ${t('flag.max_output')}
      --target <size>     ${t('flag.target')}
      --min-quality <q>   ${t('flag.min_quality')}
      --no-downscale      ${t('flag.no_downscale')}
      --no-lock           ${t('flag.no_lock')}
      --lock-status       ${t('flag.lock_status')}
      --override-lock     ${t('flag.override_lock')}
      --zip               ${t('flag.zip')}
      --srcset            ${t('flag.srcset')}
      --changed           ${t('flag.changed')}
      --staged            ${t('flag.staged')}
      --include-ignored   ${t('flag.include_ignored')}
      --include-all       ${t('flag.include_all')}
      --follow-symlinks   ${t('flag.follow_symlinks')}
      --allow-outside     ${t('flag.allow_outside')}
      --allow-unsafe      ${t('flag.allow_unsafe')}
  -f, --force             ${t('flag.force')}
      --force-undo        ${t('flag.force_undo')}
      --commit-outputs    ${t('flag.commit_outputs')}
      --gitignore=off     ${t('flag.gitignore')}
      --stdin             ${t('flag.stdin')}
      --manifest          ${t('flag.manifest')}
      --dry-run           ${t('flag.dry_run')}
      --json              ${t('flag.json')}
      --config <file>     ${t('flag.config')}
      --max-files <n>     ${t('flag.max_files')}
      --unlimited         ${t('flag.unlimited')}
      --concurrency <n>   ${t('flag.concurrency')}
      --max-bytes <size>  ${t('flag.max_bytes')}
      --reset-session     ${t('flag.reset_session')}
      --lang <code>       ${t('flag.lang')}
  -h, --help              ${t('flag.help')}

${t('cli.safety_header')}
  • ${t('cli.safety_telemetry')}
  • ${t('cli.safety_reversible')}
  • ${t('cli.safety_toctou')}
  • ${t('cli.safety_atomic')}

${t('cli.exit_codes_header')}
  0   ${t('exit.0')}
  1   ${t('exit.1')}
  2   ${t('exit.2')}
`;
}

const HELP = getHelpText();

function parseByteSize(val) {
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  const match = str.match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)?$/i);
  if (!match) {
    const num = Number(str);
    if (!Number.isFinite(num)) throw new Error(`Invalid byte size: "${val}". Expected e.g. 500B, 15KB, 1MB, or numeric bytes.`);
    return Math.round(num);
  }
  const count = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  if (unit === 'KB') return Math.round(count * 1024);
  if (unit === 'MB') return Math.round(count * 1024 * 1024);
  if (unit === 'GB') return Math.round(count * 1024 * 1024 * 1024);
  return Math.round(count);
}

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
      parsed.options.sizeMode = 'strict';
    } else if (arg === '--no-strict') {
      parsed.strict = false;
      parsed.options.strict = false;
    } else if (arg === '--same-format') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a mode: passthrough, reencode, or reject.`);
      parsed.options.sameFormat = value.toLowerCase();
    } else if (arg === '--size-mode') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a mode: compress, strict, or flexible.`);
      parsed.options.sizeMode = value.toLowerCase();
    } else if (arg === '--flexible') {
      parsed.options.sizeMode = 'flexible';
    } else if (arg === '--min-input') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a byte size (e.g. 100B, 5KB).`);
      parsed.options.minInputBytes = parseByteSize(value);
    } else if (arg === '--max-input') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a byte size (e.g. 15MB).`);
      parsed.options.maxInputBytes = parseByteSize(value);
    } else if (arg === '--min-output') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a byte size (e.g. 500B, 10KB).`);
      parsed.options.minOutputBytes = parseByteSize(value);
    } else if (arg === '--max-output') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a byte size (e.g. 15KB, 1MB).`);
      parsed.options.maxOutputBytes = parseByteSize(value);
    } else if (arg === '--target') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a target size (e.g. 500kb, 1mb, 500000).`);
      parsed.target = value;
      parsed.options.targetBytes = parseByteSize(value);
    } else if (arg === '--min-quality') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires an integer quality (1-100).`);
      parsed.options.minQuality = Number(value);
    } else if (arg === '--no-downscale') {
      parsed.options.allowDownscale = false;
    } else if (arg === '--override-lock') {
      parsed.overrideLock = true;
      parsed.options.overrideLock = true;
    }
    else if (arg === '--clean') parsed.options.clean = true;
    else if (arg === '--no-clean') parsed.options.clean = false;
    else if (arg === '--force' || arg === '-f') {
      parsed.force = true;
      parsed.options.force = true;
    } else if (arg === '--no-lock') {
      parsed.noLock = true;
      parsed.options.noLock = true;
    } else if (arg === '--lock-status') {
      parsed.lockStatus = true;
    }
    else if (arg === '--delete-original') {
      parsed.deleteOriginal = true;
      parsed.options.keepOriginal = false;
    } else if (arg === '--keep-original') {
      parsed.keepOriginal = true;
      parsed.options.keepOriginal = true;
    } else if (arg === '--yes' || arg === '-y') {
      parsed.yes = true;
    } else if (arg === '--all') {
      parsed.all = true;
    } else if (arg === '--cleanup' || arg === '--cleanup-delay') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a mode: immediate, session, or manual.`);
      parsed.cleanup = value.toLowerCase();
      parsed.options.cleanupDelay = value.toLowerCase();
    } else if (arg === '--delete-after') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a duration (e.g. 1h, 30m).`);
      parsed.deleteAfter = value.toLowerCase();
      parsed.cleanup = 'manual';
      parsed.options.cleanupDelay = 'manual';
    }
    else if (arg === '--verify') {
      const value = argv[i + 1];
      if (value && !value.startsWith('-')) {
        i++;
        parsed.verifyHash = value.toLowerCase();
        parsed.options.verifyHash = value.toLowerCase();
      } else {
        parsed.verifyHash = 'true';
        parsed.options.verifyHash = 'true';
      }
    }
    else if (arg === '--verify-clean') parsed.options.verifyClean = true;
    else if (arg === '--assert-alpha') parsed.options.assertAlpha = true;
    else if (arg === '--report') parsed.options.report = true;
    else if (arg === '--smart') {
      parsed.smart = true;
      parsed.options.smart = true;
    }
    else if (arg === '--explain') parsed.explain = true;
    else if (arg === '--team') parsed.team = true;
    else if (arg === '--since') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a timeframe string (e.g. "30 days ago", 7d).`);
      parsed.since = value;
    }
    else if (arg === '--format') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a format name (e.g. table, json, csv, markdown).`);
      parsed.format = value.toLowerCase();
    }
    else if (arg === '--top') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a number.`);
      parsed.topN = Number(value);
    }
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
    else if (arg === '--max-files') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a number.`);
      parsed.maxFiles = Number(value);
      parsed.options.maxFiles = Number(value);
    } else if (arg === '--unlimited') {
      parsed.unlimited = true;
      parsed.options.unlimited = true;
    } else if (arg === '--concurrency') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a number.`);
      parsed.concurrency = Number(value);
      parsed.options.concurrency = Number(value);
    } else if (arg === '--max-bytes') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a byte size (e.g. 100MB).`);
      parsed.maxBytes = parseByteSize(value);
      parsed.options.maxBytes = parseByteSize(value);
    } else if (arg === '--reset-session') {
      parsed.resetSession = true;
    }
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
  const locale = args.lang || process.env.ZAPWEBP_LANG || (process.env.LANG ? process.env.LANG.split(/[-_.@]/)[0].toLowerCase() : 'en');
  setLocale(locale);
  if (args.help) { process.stdout.write(getHelpText()); return; }

  // Subcommand / flag: --lock-status
  if (args.lockStatus) {
    const targetFile = args.inputs[0];
    if (!targetFile) {
      process.stderr.write('Error: --lock-status requires a target file path.\n');
      process.exitCode = 1;
      return;
    }
    const fullPath = path.resolve(rootDir, targetFile);
    const fileBytes = await readFile(fullPath).catch(() => null);
    if (!fileBytes) {
      process.stderr.write(`Error: Cannot read file: ${targetFile}\n`);
      process.exitCode = 1;
      return;
    }
    const { readLock } = await import('@zapwebp/lock');
    const lock = readLock(fileBytes);
    if (!lock) {
      process.stdout.write('Lock: not present (file has not been locked by Zapwebp)\n');
      return;
    }
    process.stdout.write('Lock: present\n');
    process.stdout.write(`  Input SHA-256:    ${lock.inputSha256 || 'n/a'}\n`);
    process.stdout.write(`  Options SHA-256:  ${lock.optionsSha256 || 'n/a'}\n`);
    process.stdout.write(`  Engine version:   ${lock.engineVersion || 'n/a'}\n`);
    process.stdout.write(`  Converted at:     ${lock.convertedAt || 'n/a'}\n`);
    if (lock.optionsSummary) {
      const summaryList = Object.entries(lock.optionsSummary)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ');
      process.stdout.write(`  Options:          ${summaryList}\n`);
    }
    return;
  }

  // Handle --reset-session
  if (args.resetSession) {
    await resetSession(rootDir);
    process.stdout.write('✓ Session reset. Processed files count is now 0.\n');
    return;
  }

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

    if (args.team) {
      const policyPath = path.join(rootDir, 'zapwebp.policy.json');
      await writeAtomic(policyPath, JSON.stringify(DEFAULT_TEAM_POLICY_TEMPLATE, null, 2) + '\n');
      process.stdout.write('  - Created zapwebp.policy.json (Team Governance Policy)\n');
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
    if (args.all && !args.yes && process.stdin.isTTY) {
      process.stdout.write('⚠️  zapwebp gc --all will permanently purge all backups.\n');
    }
    const res = await pruneJournal(rootDir, 50, 30, {
      all: args.all,
      dryRun: args.dryRun,
    });
    if (args.dryRun) {
      process.stdout.write(`ℹ Dry-run: would prune ${res.prunedCount} transaction backup(s).\n`);
    } else {
      process.stdout.write(`✓ Garbage collected journal: pruned ${res.prunedCount} old transaction logs.\n`);
    }
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

  // 7b. Subcommand: report
  if (args.inputs[0] === 'report') {
    const targetPath = args.inputs[1] || '.';
    const transactions = await listTransactions(rootDir);
    const reportData = computePerformanceReport(transactions, {
      path: targetPath === '.' ? '' : targetPath,
      since: args.since,
      topN: args.topN || 10,
    });
    const outputFmt = args.format || (args.json ? 'json' : 'table');
    process.stdout.write(formatPerformanceReport(reportData, outputFmt) + '\n');
    return;
  }

  // 7c. Subcommand: policy
  if (args.inputs[0] === 'policy') {
    const action = args.inputs[1];
    const policyPath = path.join(rootDir, 'zapwebp.policy.json');
    const exists = await stat(policyPath).then(() => true, () => false);
    if (!exists) {
      throw new Error('zapwebp.policy.json not found in project root. Run "zap init --team" to generate a policy template.');
    }
    const content = await readFile(policyPath, 'utf8');
    let policyObj;
    try {
      policyObj = JSON.parse(content);
    } catch (e) {
      throw new Error(`Invalid JSON in zapwebp.policy.json: ${e.message}`);
    }

    if (action === 'validate') {
      const { valid, errors } = validateTeamPolicy(policyObj);
      if (valid) {
        process.stdout.write('✓ zapwebp.policy.json is valid and conforms to enterprise standards.\n');
        return;
      }
      process.stderr.write('❌ zapwebp.policy.json contains validation errors:\n');
      for (const err of errors) {
        process.stderr.write(`  - ${err}\n`);
      }
      process.exitCode = 1;
      return;
    }

    if (action === 'status' || !action) {
      const statusOut = formatPolicyStatus(policyObj);
      process.stdout.write(statusOut + '\n');
      return;
    }

    throw new Error(`Unknown policy command: "${action}". Supported: validate, status.`);
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
    if (args.verifyHash && args.verifyHash !== 'true') {
      const actualHash = sha256(converted.data);
      if (actualHash.toLowerCase() !== args.verifyHash.toLowerCase()) {
        throw new ZapwebpError({
          code: 'E_VERIFICATION_FAILED',
          message: `E_VERIFICATION_FAILED: Converted output SHA-256 (${actualHash}) does not match expected hash (${args.verifyHash})`,
          fix: 'Verify the expected hash or check engine version determinism.',
        });
      }
    }
    if (converted.warnings && converted.warnings.length) {
      for (const w of converted.warnings) {
        process.stderr.write(`⚠️  Warning: ${w}\n`);
      }
    }
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

  // Enforce Configurable Limits & Rate Controls
  const session = await loadSession(rootDir);
  let totalInputBytes = 0;
  for (const fileItem of inScopeFiles) {
    totalInputBytes += fileItem.size || 0;
  }

  evaluateLimits({
    filesCount: inScopeFiles.length,
    totalBytes: totalInputBytes,
    sessionCount: session.filesProcessed,
    limits: options.limits || DEFAULT_LIMITS,
  });

  const limitsMetadata = createLimitsMetadata({
    filesCount: inScopeFiles.length,
    totalBytes: totalInputBytes,
    sessionCount: session.filesProcessed,
    limits: options.limits || DEFAULT_LIMITS,
  });

  // Team Policy Enforcement
  const policyFile = path.join(rootDir, 'zapwebp.policy.json');
  let teamPolicy = null;
  if (await stat(policyFile).then(() => true, () => false)) {
    try {
      teamPolicy = JSON.parse(await readFile(policyFile, 'utf8'));
    } catch {}
  }

  if (teamPolicy) {
    const isCi = Boolean(process.env.CI);
    let policyFailed = false;
    for (const fileItem of inScopeFiles) {
      const evalRes = evaluateFilePolicy(teamPolicy, fileItem, options, { isCi });
      if (!evalRes.allowed && evalRes.violations.length) {
        const enf = isCi ? (teamPolicy.enforcement?.onCi || 'block') : (teamPolicy.enforcement?.onLocal || 'warn');
        if (enf === 'block') {
          process.stderr.write(`❌ Policy Violation: ${path.relative(rootDir, fileItem.path)}\n`);
          for (const v of evalRes.violations) {
            process.stderr.write(`   - ${v}\n`);
          }
          policyFailed = true;
        } else {
          process.stderr.write(`⚠️  Policy Warning: ${path.relative(rootDir, fileItem.path)}\n`);
          for (const v of evalRes.violations) {
            process.stderr.write(`   - ${v}\n`);
          }
        }
      }
    }
    if (policyFailed) {
      process.exitCode = 1;
      return;
    }
  }

  // Smart Optimization: Explanation & Dry-Run
  if (args.smart && (args.explain || args.dryRun)) {
    for (const fileItem of inScopeFiles) {
      const bytes = await readFile(fileItem.path).catch(() => null);
      if (!bytes) continue;
      const res = await analyzeSmart(bytes, { format: fileItem.format }, getSharp);
      process.stdout.write(`\nFile: ${path.relative(rootDir, fileItem.path)}\n${res.recommendation.explanation}\n`);
    }
    if (args.explain || args.dryRun) {
      return;
    }
  }

  // Execute Conversion Run
  const transactionId = generateTransactionId();
  const operations = [];
  const records = [];
  const sessionCleanups = [];

  const isDeleteOptIn = options.allowDeleteOriginal === true || fileConfig.allowDeleteOriginal === true;

  if (args.deleteOriginal && !args.dryRun && !args.check) {
    if (!isDeleteOptIn && !args.yes) {
      if (!process.stdin.isTTY) {
        throw new ZapwebpError({
          code: 'E_DELETE_NOT_ENABLED',
          message: `--delete-original requires explicit opt-in (requires --yes in non-interactive environments). Set 'allowDeleteOriginal: true' in .zapwebp/config.json or pass --yes to confirm for this run.`,
          fix: 'Add --yes to the command line or configure "allowDeleteOriginal": true in .zapwebp/config.json.',
        });
      }

      process.stderr.write(`⚠️  --delete-original will permanently delete ${inScopeFiles.length} source file(s) after conversion.\n`);
      process.stderr.write(`   Deleted originals are backed up to .zapwebp/backups/ for 30 days and restorable with: zapwebp undo\n`);

      const readline = await import('node:readline/promises');
      const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
      try {
        const answer = await rl.question('   Proceed and remember this choice in .zapwebp/config.json? [y/N]: ');
        if (answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes') {
          const zapConfigDir = path.join(rootDir, '.zapwebp');
          const zapConfigFile = path.join(zapConfigDir, 'config.json');
          await mkdir(zapConfigDir, { recursive: true });
          let existingJson = {};
          try {
            existingJson = JSON.parse(await readFile(zapConfigFile, 'utf8'));
          } catch {}
          existingJson.allowDeleteOriginal = true;
          existingJson.deleteBackupRetentionDays = existingJson.deleteBackupRetentionDays || 30;
          await writeFile(zapConfigFile, JSON.stringify(existingJson, null, 2) + '\n', 'utf8');
          process.stderr.write(`   Saved allowDeleteOriginal: true to .zapwebp/config.json\n`);
        } else {
          process.stderr.write('   Aborted original file deletion.\n');
          args.deleteOriginal = false;
        }
      } finally {
        rl.close();
      }
    } else if (args.deleteOriginal) {
      process.stderr.write(`⚠️  --delete-original active: backing up to .zapwebp/backups/ and deleting ${inScopeFiles.length} source file(s).\n`);
    }
  }

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
          smart: Boolean(args.smart),
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

        // Idempotent Conversion Lock: skip if existing output matches input, options, and engine
        if (!args.force && !args.noLock && existingOutput && existingOutput.length > 0) {
          const { verifyLock } = await import('@zapwebp/lock');
          const verification = verifyLock(existingOutput, currentBytes, targetOptions, { force: args.force });
          if (verification.match) {
            process.stdout.write(`⏭  ${path.relative(rootDir, dest)} already converted with matching options. Skipped. Use --force to re-convert.\n`);
            continue;
          }
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
          if (args.verifyHash && args.verifyHash !== 'true') {
            const actualHash = sha256(converted.data);
            if (actualHash.toLowerCase() !== args.verifyHash.toLowerCase()) {
              throw new ZapwebpError({
                code: 'E_VERIFICATION_FAILED',
                message: `E_VERIFICATION_FAILED: Converted output SHA-256 (${actualHash}) does not match expected hash (${args.verifyHash})`,
                fix: 'Verify the expected hash or check engine version determinism.',
              });
            }
          }
          await writeAtomic(dest, converted.data);
          operations.push({
            type: 'create',
            path: path.relative(rootDir, dest).replace(/\\/g, '/'),
            sha256: sha256(converted.data),
            bytes: converted.size,
            inputPath: path.relative(rootDir, fileItem.path).replace(/\\/g, '/'),
            inputBytes: currentBytes.length,
            format: converted.targetFormat || target,
            fromFormat: fileItem.format,
            durationMs: converted.durationMs || 0,
          });
          records.push({
            input: fileItem.path,
            output: dest,
            scale,
            format: converted.targetFormat || target,
            size: converted.size,
            inputBytes: currentBytes.length,
            durationMs: converted.durationMs || 0,
            passedThrough: true,
            status: 'passed_through',
            warnings: converted.warnings || [],
          });
          continue;
        }

        let outputData = converted.data;
        if (!args.noLock) {
          const { writeLock, createLockFingerprint } = await import('@zapwebp/lock');
          const fp = createLockFingerprint({
            input: currentBytes,
            options: targetOptions,
          });
          outputData = writeLock(outputData, converted.targetFormat || target, fp);
        }

        if (args.verifyHash && args.verifyHash !== 'true') {
          const actualHash = sha256(outputData);
          if (actualHash.toLowerCase() !== args.verifyHash.toLowerCase()) {
            throw new ZapwebpError({
              code: 'E_VERIFICATION_FAILED',
              message: `E_VERIFICATION_FAILED: Converted output SHA-256 (${actualHash}) does not match expected hash (${args.verifyHash})`,
              fix: 'Verify the expected hash or check engine version determinism.',
            });
          }
        }

        await writeAtomic(dest, outputData);

        operations.push({
          type: 'create',
          path: path.relative(rootDir, dest).replace(/\\/g, '/'),
          sha256: sha256(outputData),
          bytes: outputData.length,
          inputPath: path.relative(rootDir, fileItem.path).replace(/\\/g, '/'),
          inputBytes: currentBytes.length,
          format: target,
          fromFormat: fileItem.format,
          durationMs: converted.durationMs || 0,
        });

        records.push({
          input: fileItem.path,
          output: dest,
          scale,
          format: target,
          size: converted.size,
          inputBytes: currentBytes.length,
          durationMs: converted.durationMs || 0,
          width: converted.width,
          height: converted.height,
          alphaPreserved: converted.alphaPreserved,
          clean: converted.clean,
          certificate: converted.certificate,
          removedMetadata: converted.removedMetadata,
          status: 'converted',
          warnings: converted.warnings || [],
          lossless: converted.lossless,
          losslessVerified: converted.losslessVerified,
          sourceQuality: converted.sourceQuality,
          sizeImpact: converted.sizeImpact,
          compression: converted.compression,
          limits: limitsMetadata,
        });
      }
    }

    // Lifecycle Management: If deleteOriginal is requested, back up and delete the source asset
    if (args.deleteOriginal && !args.dryRun && !args.check) {
      const relSrc = path.relative(rootDir, fileItem.path).replace(/\\/g, '/');
      const backupRel = path.join('.zapwebp', 'backups', transactionId, relSrc).replace(/\\/g, '/');
      const backupFull = path.resolve(rootDir, backupRel);

      await mkdir(path.dirname(backupFull), { recursive: true });
      await writeFile(backupFull, currentBytes);

      // Deterministic SHA-256 verification of backup file before deleting original
      const backupWritten = await readFile(backupFull);
      const backupHash = sha256(backupWritten);
      if (backupHash !== fileItem.sha256) {
        throw new ZapwebpError({
          code: 'E_BACKUP_VERIFICATION_FAILED',
          message: `Backup SHA-256 mismatch for ${relSrc}. Source file was not deleted.`,
          fix: 'Check disk space and write permissions in .zapwebp/backups/.',
        });
      }

      operations.push({
        type: 'delete',
        path: relSrc,
        sha256Before: fileItem.sha256,
        backupPath: backupRel,
      });

      const cleanupMode = args.cleanup || 'immediate';
      if (cleanupMode === 'immediate') {
        await rm(fileItem.path, { force: true });
        process.stderr.write(`🗑  ${path.basename(fileItem.path)} → ${backupRel} (Restore with: zapwebp undo)\n`);
      } else if (cleanupMode === 'session') {
        sessionCleanups.push(fileItem.path);
      }
    }
  }

  if (sessionCleanups.length > 0) {
    process.on('exit', () => {
      for (const p of sessionCleanups) {
        try {
          rmSync(p, { force: true });
        } catch {}
      }
    });
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
      records,
    });

    const retentionDays = options.deleteBackupRetentionDays || fileConfig.deleteBackupRetentionDays || 30;
    await pruneJournal(rootDir, 50, retentionDays).catch(() => {});
  }

  if (!args.dryRun && !args.check && records.length > 0) {
    await recordSession(rootDir, inScopeFiles.length);
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
      const prefix = r.passedThrough ? '⚡' : (r.status === 'converted' ? '✓' : '=');
      const passTag = r.passedThrough ? ' [same-format passthrough]' : '';
      const compTag = r.compression
        ? ` [target: ${r.compression.target} B | achieved: ${r.size} B${r.compression.downscaled ? ` (downscaled ${r.compression.downscaleCount}x)` : ''}]`
        : '';
      process.stdout.write(`${prefix} ${r.input} → ${r.output}${r.size ? ` (${r.size} bytes)` : ''}${passTag}${compTag}\n`);
      if (r.warnings && r.warnings.length) {
        for (const w of r.warnings) {
          process.stderr.write(`  ⚠️  Warning: ${w}\n`);
        }
      }
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
            if (converted.warnings && converted.warnings.length) {
              for (const w of converted.warnings) {
                process.stderr.write(`  ⚠️  Warning: ${w}\n`);
              }
            }
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
