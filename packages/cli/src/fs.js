import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import shared from '@zapwebp/shared';

const { ZapwebpError } = shared;

/**
 * Resolves a safe file path, handling file:// URIs, Windows drive letters, and traversal prevention.
 * @param {string} inputPath
 * @param {string} [baseDir=process.cwd()]
 * @param {boolean} [allowOutside=false]
 * @returns {string} Normalized absolute path
 */
export function resolveSafePath(inputPath, baseDir = process.cwd(), allowOutside = false) {
  let raw = inputPath.startsWith('file://') ? fileURLToPath(inputPath) : inputPath;

  // Handle Windows extended-length paths (>260 chars)
  if (process.platform === 'win32') {
    const resolvedWin = path.win32.resolve(baseDir, raw);
    if (resolvedWin.length > 260 && !resolvedWin.startsWith('\\\\?\\')) {
      raw = `\\\\?\\${resolvedWin}`;
    }
  }

  const absolute = path.resolve(baseDir, raw);
  const relative = path.relative(baseDir, absolute);

  if (!allowOutside) {
    const isEscaping = relative === '..' || relative.startsWith(`..${path.sep}`) || (path.isAbsolute(relative) && relative !== absolute);
    if (isEscaping) {
      throw new ZapwebpError({
        code: 'E_PATH_TRAVERSAL',
        message: `Path "${inputPath}" escapes working directory boundary.`,
        fix: 'Specify a path within the current project or pass --allow-outside.',
      });
    }
  }

  return absolute;
}

/**
 * Atomically writes file data with Windows Defender EBUSY retry and Android fsync bypass.
 * @param {string} destPath
 * @param {Buffer|Uint8Array} data
 * @param {number} [attempts=3]
 */
export async function writeSafe(destPath, data, attempts = 3) {
  const dir = path.dirname(destPath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code === 'EACCES') {
      throw new ZapwebpError({
        code: 'E_WRITE_PERMISSION',
        message: `Permission denied creating directory: ${dir}`,
        fix: 'Check folder permissions.',
      });
    }
    throw err;
  }

  const tmpPath = path.join(dir, `.zap-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    await fs.writeFile(tmpPath, data);
  } catch (err) {
    if (err.code === 'ENOSPC') {
      throw new ZapwebpError({
        code: 'E_DISK_FULL',
        message: 'No space left on device.',
        fix: 'Free disk space and retry.',
      });
    }
    throw err;
  }

  // Skip fsync on Android Termux (where fsync can hang)
  if (!process.env.ANDROID_ROOT) {
    try {
      const handle = await fs.open(tmpPath, 'r+');
      await handle.sync();
      await handle.close();
    } catch {
      // Non-critical if FS doesn't support sync
    }
  }

  // Atomic rename with Windows EBUSY retry
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await fs.rename(tmpPath, destPath);
      return;
    } catch (err) {
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && attempt < attempts) {
        await new Promise((r) => setTimeout(r, 100 * attempt));
        continue;
      }
      // Clean up tmp file
      await fs.rm(tmpPath, { force: true }).catch(() => {});
      if (err.code === 'EBUSY') {
        throw new ZapwebpError({
          code: 'E_WRITE_LOCKED',
          message: `Destination file is locked: ${destPath}`,
          fix: 'Close any application holding a lock on the file.',
        });
      }
      throw err;
    }
  }
}

/**
 * Determines bounded worker pool concurrency based on hardware and environment.
 * @param {number} [custom]
 * @returns {number}
 */
export function getPlatformConcurrency(custom) {
  if (custom && Number.isFinite(Number(custom)) && Number(custom) > 0) {
    return Math.max(1, Math.min(16, Number(custom)));
  }
  if (process.env.ANDROID_ROOT) return 1; // Termux mobile constraint
  const cpus = os.cpus()?.length || 1;
  return Math.min(cpus, 4); // Standard bounded ceiling
}
