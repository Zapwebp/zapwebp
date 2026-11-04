import { stat, lstat, readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import ignore from 'ignore';
import core from '@zapwebp/core';

const { detectFormat, checkSvgSafety, INPUT_FORMATS } = core;

export const DEFAULT_IGNORES = [
  'node_modules/**',
  '.git/**',
  '.next/**',
  '.nuxt/**',
  'dist/**',
  'build/**',
  'out/**',
  'coverage/**',
  'vendor/**',
  '.venv/**',
  '__pycache__/**',
  '.zapwebp/**',
];

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Calculates SHA-256 hash of a buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Resolves list of modified files using git diff.
 * @param {'changed'|'staged'} mode
 * @param {string} cwd
 * @returns {string[]}
 */
export function getGitFiles(mode, cwd = process.cwd()) {
  try {
    const gitCmd = mode === 'staged'
      ? 'git diff --cached --name-only --diff-filter=ACMR'
      : 'git diff --name-only --diff-filter=ACMR HEAD';
    const output = execSync(gitCmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((rel) => path.resolve(cwd, rel));
  } catch {
    return [];
  }
}

/**
 * Compiles ignore rules from built-ins, .zapwebpignore, and config.
 * @param {string} rootDir
 * @param {object} [options]
 * @returns {Promise<{ isIgnored: (filePath: string) => { ignored: boolean, rule?: string, source?: string } }>}
 */
export async function createIgnoreChecker(rootDir, options = {}) {
  const ig = ignore();
  const ruleOrigins = [];

  // Layer 1: Built-ins
  if (!options.noDefaultIgnores && !options.includeAll) {
    ig.add(DEFAULT_IGNORES);
    for (const r of DEFAULT_IGNORES) ruleOrigins.push({ rule: r, source: 'builtin' });
  }

  // Layer 2: .zapwebpignore
  if (!options.includeIgnored && !options.includeAll) {
    const zapignorePath = path.join(rootDir, '.zapwebpignore');
    const zapignoreContent = await readFile(zapignorePath, 'utf8').catch(() => null);
    if (zapignoreContent) {
      const lines = zapignoreContent.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      ig.add(lines);
      for (const r of lines) ruleOrigins.push({ rule: r, source: '.zapwebpignore' });
    }
  }

  // Layer 3: Config ignore
  if (!options.includeIgnored && !options.includeAll && Array.isArray(options.configIgnores)) {
    ig.add(options.configIgnores);
    for (const r of options.configIgnores) ruleOrigins.push({ rule: r, source: '.zapwebp.config.json' });
  }

  return {
    isIgnored(filePath) {
      const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
      if (rel.startsWith('.zapwebp/') || rel === '.zapwebp') {
        return { ignored: true, rule: '.zapwebp/**', source: 'internal_artifact' };
      }
      const ignored = ig.ignores(rel);
      if (!ignored) return { ignored: false };
      // Find matching rule
      const match = ruleOrigins.find((o) => {
        const testIg = ignore().add(o.rule);
        return testIg.ignores(rel);
      });
      return { ignored: true, rule: match?.rule || 'matched pattern', source: match?.source || 'ignore_rule' };
    },
  };
}

/**
 * Runs a file candidate through the 10-gate selection chain.
 * @param {string} filePath
 * @param {object} context
 * @returns {Promise<{ inScope: boolean, reason?: string, detail?: string, stats?: object }>}
 */
export async function evaluateGateChain(filePath, context) {
  const {
    rootDir,
    ignoreChecker,
    fromFormat,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
    followSymlinks = false,
    allowOutside = false,
    allowUnsafe = false,
    force = false,
  } = context;

  const resolved = path.resolve(filePath);

  // Gate 8: Outside root check
  const relRoot = path.relative(rootDir, resolved);
  const isOutside = relRoot === '..' || relRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relRoot);
  if (isOutside && !allowOutside && !force) {
    return { inScope: false, reason: 'outside_root', detail: 'Path escapes project boundary' };
  }

  // Gate 7: Symlink check
  const lstats = await lstat(resolved).catch(() => null);
  if (!lstats) {
    return { inScope: false, reason: 'not_found', detail: 'File does not exist' };
  }
  if (lstats.isSymbolicLink() && !followSymlinks && !force) {
    return { inScope: false, reason: 'symlink', detail: 'Symbolic links ignored by default' };
  }

  // Gate 1: Exists & readable file
  const stats = await stat(resolved).catch(() => null);
  if (!stats || !stats.isFile()) {
    return { inScope: false, reason: 'not_found', detail: 'Not a regular file' };
  }

  // Gate 2 & 3: Ignore list & internal artifact
  const ignoreResult = ignoreChecker.isIgnored(resolved);
  if (ignoreResult.ignored) {
    return { inScope: false, reason: ignoreResult.source === 'internal_artifact' ? 'internal_artifact' : 'ignored', detail: `${ignoreResult.source}: ${ignoreResult.rule}` };
  }

  // Gate 6: Size cap
  if (stats.size > maxFileSizeBytes) {
    return { inScope: false, reason: 'too_large', detail: `File exceeds size limit (${Math.round(stats.size / 1024 / 1024)}MB > ${Math.round(maxFileSizeBytes / 1024 / 1024)}MB)` };
  }

  // Read header bytes for format & safety
  let bytes;
  try {
    bytes = await readFile(resolved);
  } catch (err) {
    return { inScope: false, reason: 'permission_denied', detail: err.message };
  }

  // Gate 4: Supported format & matches --from
  let format;
  const supportedInputs = (core.registry && typeof core.registry.getSupportedInputs === 'function')
    ? core.registry.getSupportedInputs()
    : INPUT_FORMATS;

  try {
    format = detectFormat(bytes);
  } catch (err) {
    const ext = path.extname(resolved).toLowerCase();
    if (ext === '.heic' || ext === '.heif') {
      return { inScope: false, reason: 'unsupported_format', detail: 'This format requires a plugin. Install it with: npm i -g zapwebp-format-heic' };
    }
    if (ext === '.jxl') {
      return { inScope: false, reason: 'unsupported_format', detail: 'This format requires a plugin. Install it with: npm i -g zapwebp-format-jxl' };
    }
    return { inScope: false, reason: 'unsupported_format', detail: err.message };
  }
  if (!supportedInputs.includes(format)) {
    return { inScope: false, reason: 'unsupported_format', detail: `Unsupported format: ${format}` };
  }
  if (fromFormat && format !== fromFormat) {
    return { inScope: false, reason: 'format_mismatch', detail: `Format is ${format}, expected ${fromFormat}` };
  }

  // Gate 5: SVG Safety checks
  if (format === 'svg') {
    const safety = checkSvgSafety(bytes);
    if (!safety.safe && !allowUnsafe) {
      return { inScope: false, reason: 'unsafe_svg', detail: safety.detail };
    }
  }

  return {
    inScope: true,
    format,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    sha256: sha256(bytes),
    bytes,
  };
}

