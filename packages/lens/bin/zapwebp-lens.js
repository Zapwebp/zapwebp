#!/usr/bin/env node
'use strict';

const {
  inspectCommand,
  compareCommand,
  alphaCommand,
  diffCommand,
  reportCommand,
  verifyCommand,
  LensError,
} = require('../src');
const { formatLensError } = require('../src/errors');

const HELP = `zapwebp-lens — Read-only container inspection, visual comparison, and verification CLI.

USAGE
  zapwebp-lens <command> [files...] [options]
  lens <command> [files...] [options]

COMMANDS
  inspect <file>            List chunks, metadata, dimensions, and container info
  compare <fileA> <fileB>   Side-by-side comparison on checkerboard
  alpha <file>              Isolate alpha channel & verify corner/edge transparency
  diff <fileA> <fileB>      Byte-level and structural chunk diff (add --visual for SSIM)
  report <files...>         Batch summary of multiple images (add --html for PR artifact)
  verify <file>             Verify deterministic checksum against expected hash or manifest

OPTIONS
  --open                    Launch browser viewer with checkerboard
  --visual                  Generate interactive side-by-side SSIM pixel diff viewer
  --html [file]             Generate static, self-contained HTML batch report
  --fail-if-dirty           Exit code 1 if image contains EXIF/XMP/IPTC metadata chunks
  --expected-sha256 <hex>   Expected SHA-256 hash for verify command
  --from-manifest <file>    Manifest JSON file containing expected checksums
  --max-bytes <bytes>       Maximum allowed file read size (default: 104,857,600 / 100 MB)
  --max-batch <count>       Maximum files analyzed in a single report batch (default: 500)
  --timeout <ms>            Decode timeout limit in milliseconds (default: 5,000)
  --allow-unsafe            Allow inspection of SVGs containing active scripts or external entities
  --json                    Emit structured versioned JSON output
  --help, -h                Show this help message
`;

function parseArgValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return null;
}

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
    visual: args.includes('--visual'),
    failIfDirty: args.includes('--fail-if-dirty'),
    allowUnsafe: args.includes('--allow-unsafe'),
    expectedSha256: parseArgValue(args, '--expected-sha256'),
    fromManifest: parseArgValue(args, '--from-manifest'),
    html: args.includes('--html') ? (parseArgValue(args, '--html') || 'lens-report.html') : null,
  };

  const maxBytesStr = parseArgValue(args, '--max-bytes');
  if (maxBytesStr) {
    const parsed = parseInt(maxBytesStr, 10);
    if (!isNaN(parsed) && parsed > 0) flags.maxBytes = parsed;
  }

  const maxBatchStr = parseArgValue(args, '--max-batch');
  if (maxBatchStr) {
    const parsed = parseInt(maxBatchStr, 10);
    if (!isNaN(parsed) && parsed > 0) flags.maxBatch = parsed;
  }

  const timeoutStr = parseArgValue(args, '--timeout');
  if (timeoutStr) {
    const parsed = parseInt(timeoutStr, 10);
    if (!isNaN(parsed) && parsed > 0) flags.timeout = parsed;
  }

  // Filter out flags and flag values from positional targets
  const targets = [];
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (['--expected-sha256', '--from-manifest', '--max-bytes', '--max-batch', '--timeout'].includes(arg)) {
        i++; // skip next arg value
      } else if (arg === '--html' && i + 1 < args.length && !args[i + 1].startsWith('--')) {
        i++; // skip custom html path
      }
      continue;
    }
    targets.push(arg);
  }

  // CI Open Guard
  const isCI = process.env.CI === 'true' || process.env.CI === '1' || process.env.GITHUB_ACTIONS === 'true';
  if (flags.open && isCI) {
    const err = new LensError({
      code: 'E_OPEN_IN_CI',
      message: 'Cannot open browser in CI environment.',
      fix: 'Use --json or inspect without --open.',
    });
    if (flags.json) {
      process.stderr.write(JSON.stringify({ version: '1.0.0', tool: 'zapwebp-lens', command, result: null, errors: [err.toJSON()] }) + '\n');
    } else {
      process.stderr.write(formatLensError(err));
    }
    process.exit(1);
  }

  try {
    switch (command) {
      case 'inspect':
        if (!targets[0]) {
          throw new LensError({
            code: 'E_MISSING_ARG',
            message: 'File path required for inspect command.',
            fix: 'Usage: zapwebp-lens inspect <file> [--json] [--fail-if-dirty]',
          });
        }
        await inspectCommand(targets[0], flags);
        break;

      case 'compare':
        if (!targets[0] || !targets[1]) {
          throw new LensError({
            code: 'E_MISSING_ARG',
            message: 'Two file paths required for compare command.',
            fix: 'Usage: zapwebp-lens compare <fileA> <fileB> [--open] [--json]',
          });
        }
        await compareCommand(targets[0], targets[1], flags);
        break;

      case 'alpha':
        if (!targets[0]) {
          throw new LensError({
            code: 'E_MISSING_ARG',
            message: 'File path required for alpha command.',
            fix: 'Usage: zapwebp-lens alpha <file> [--json]',
          });
        }
        await alphaCommand(targets[0], flags);
        break;

      case 'diff':
        if (!targets[0] || !targets[1]) {
          throw new LensError({
            code: 'E_MISSING_ARG',
            message: 'Two file paths required for diff command.',
            fix: 'Usage: zapwebp-lens diff <fileA> <fileB> [--visual] [--json]',
          });
        }
        await diffCommand(targets[0], targets[1], flags);
        break;

      case 'report':
        if (!targets.length) {
          throw new LensError({
            code: 'E_MISSING_ARG',
            message: 'At least one file required for report command.',
            fix: 'Usage: zapwebp-lens report <files...> [--html [out]] [--json]',
          });
        }
        await reportCommand(targets, flags);
        break;

      case 'verify':
        if (!targets[0]) {
          throw new LensError({
            code: 'E_MISSING_ARG',
            message: 'File path required for verify command.',
            fix: 'Usage: zapwebp-lens verify <file> (--expected-sha256 <hex> | --from-manifest <file>)',
          });
        }
        await verifyCommand(targets[0], flags);
        break;

      default:
        throw new LensError({
          code: 'E_UNKNOWN_COMMAND',
          message: `Unknown command "${command}". Run "zapwebp-lens --help" for usage.`,
          fix: 'Choose from: inspect, compare, alpha, diff, report, verify.',
        });
    }
    process.exit(0);
  } catch (err) {
    const isConfigError = err.code === 'E_UNKNOWN_COMMAND' || err.code === 'E_MISSING_ARG';
    const exitCode = isConfigError ? 2 : (err instanceof LensError ? 1 : 3);

    if (flags.json) {
      const errObj = err instanceof LensError ? err.toJSON() : { code: 'E_INTERNAL', message: err.message || String(err) };
      process.stderr.write(JSON.stringify({
        version: '1.0.0',
        tool: 'zapwebp-lens',
        command,
        result: null,
        errors: [errObj],
      }) + '\n');
    } else {
      process.stderr.write(formatLensError(err));
    }
    process.exit(exitCode);
  }
}

main();
