import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_OPTIONS } from '@zapwebp/shared';

export const CONFIG_FILENAMES = ['.zapwebp.config.json', 'zapwebp.config.json', 'zapwebp.json', '.zapwebp.json'];

export const DEFAULT_CONFIG = {
  format: DEFAULT_OPTIONS.to,
  quality: DEFAULT_OPTIONS.quality,
  lossless: DEFAULT_OPTIONS.lossless,
  effort: DEFAULT_OPTIONS.effort,
  scales: [...DEFAULT_OPTIONS.scale],
  baseWidth: DEFAULT_OPTIONS.baseWidth,
  clean: DEFAULT_OPTIONS.clean,
  maxFileSizeBytes: 10 * 1024 * 1024,
  followSymlinks: false,
  allowOutsideRoot: false,
  lockTarget: undefined,
  strict: true,
  overrideLock: false,
  gitignore: {
    outputs: 'auto',
    journal: 'auto',
  },
};

/**
 * Loads project configuration file if present.
 * @param {string} rootDir
 * @param {string} [explicitConfigPath]
 * @returns {Promise<{ config: object, filePath: string | null }>}
 */
export async function loadConfigFile(rootDir, explicitConfigPath) {
  if (explicitConfigPath) {
    const full = path.resolve(rootDir, explicitConfigPath);
    const content = await readFile(full, 'utf8');
    return { config: JSON.parse(content), filePath: full };
  }

  for (const filename of CONFIG_FILENAMES) {
    const full = path.join(rootDir, filename);
    const exists = await stat(full).then((s) => s.isFile(), () => false);
    if (exists) {
      try {
        const content = await readFile(full, 'utf8');
        return { config: JSON.parse(content), filePath: full };
      } catch (err) {
        throw new Error(`Failed to parse configuration file ${filename}: ${err.message}`);
      }
    }
  }

  return { config: {}, filePath: null };
}

/**
 * Resolves final options with explicit precedence tracking:
 * CLI flags > config file > environment variables > built-in defaults.
 * @param {object} params
 * @returns {{ resolved: object, origins: Record<string, string> }}
 */
export function resolveConfigPrecedence({ cliOptions = {}, fileConfig = {}, env = process.env }) {
  const resolved = {};
  const origins = {};

  const fields = [
    'format', 'to', 'quality', 'lossless', 'effort', 'scales', 'scale', 'baseWidth',
    'width', 'height', 'fit',
    'outDir', 'background', 'clean', 'stripMetadata', 'verifyClean', 'assertAlpha', 'report',
    'maxFileSizeBytes', 'followSymlinks', 'allowOutsideRoot',
    'lockTarget', 'strict', 'overrideLock',
  ];

  for (const field of fields) {
    // 1. CLI flag
    if (cliOptions[field] !== undefined) {
      resolved[field] = cliOptions[field];
      origins[field] = 'cli_flag';
      continue;
    }

    // 2. Config file
    let fileVal = fileConfig[field];
    if (field === 'lockTarget') {
      fileVal = fileConfig.lockTarget || fileConfig.output?.lock || fileConfig.ingest?.target || fileConfig.lock;
    } else if (field === 'strict') {
      fileVal = fileConfig.strict !== undefined ? fileConfig.strict : (fileConfig.output?.strict !== undefined ? fileConfig.output.strict : fileConfig.ingest?.strict);
    } else if (field === 'background') {
      fileVal = fileConfig.background || fileConfig.defaultBackground || fileConfig.output?.background;
    }
    if (fileVal !== undefined) {
      resolved[field] = fileVal;
      origins[field] = 'config_file';
      continue;
    }

    // 3. Env var
    if (field === 'lockTarget' && (env.ZAPWEBP_TARGET !== undefined || env.ZAPWEBP_LOCK_TARGET !== undefined)) {
      resolved[field] = env.ZAPWEBP_TARGET || env.ZAPWEBP_LOCK_TARGET;
      origins[field] = 'env_var';
      continue;
    }
    if (field === 'strict' && env.ZAPWEBP_STRICT !== undefined) {
      resolved[field] = env.ZAPWEBP_STRICT === 'true' || env.ZAPWEBP_STRICT === '1';
      origins[field] = 'env_var';
      continue;
    }
    if (field === 'background' && (env.ZAPWEBP_BACKGROUND !== undefined || env.ZAPWEBP_DEFAULT_BACKGROUND !== undefined)) {
      resolved[field] = env.ZAPWEBP_BACKGROUND || env.ZAPWEBP_DEFAULT_BACKGROUND;
      origins[field] = 'env_var';
      continue;
    }
    const envKey = `ZAPWEBP_${field.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    if (env[envKey] !== undefined) {
      resolved[field] = env[envKey];
      origins[field] = 'env_var';
      continue;
    }

    // 4. Default
    const defaultField = field === 'to' ? 'format' : field === 'scale' ? 'scales' : field;
    if (DEFAULT_CONFIG[defaultField] !== undefined) {
      resolved[field] = DEFAULT_CONFIG[defaultField];
      origins[field] = 'default';
    }
  }

  return { resolved, origins };
}
