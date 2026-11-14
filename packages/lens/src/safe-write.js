'use strict';

const { writeFile, mkdtemp, realpath } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { LensError } = require('./errors');

/**
 * Safely writes temporary content to an isolated temp directory verified to stay within os.tmpdir().
 * Enforces owner-only permissions (0o600) and guards against symlink escapes.
 *
 * @param {string} filename - Target temporary filename
 * @param {Buffer|Uint8Array|string} bytes - Content bytes or string
 * @returns {Promise<string>} The absolute path to the safely written file
 * @throws {LensError}
 */
async function safeTempWrite(filename, bytes) {
  const allowedTmpRoot = await realpath(os.tmpdir());
  const dir = await mkdtemp(path.join(allowedTmpRoot, 'zapwebp-lens-'));

  const realDir = await realpath(dir);
  if (!realDir.startsWith(allowedTmpRoot)) {
    throw new LensError({
      code: 'E_TMP_ESCAPE',
      message: 'Temp directory escaped allowed operating system root',
      fix: 'Verify your TMPDIR or TEMP environment variable is set to a legitimate local path.',
    });
  }

  const filePath = path.join(realDir, filename);
  await writeFile(filePath, bytes, { mode: 0o600 });
  return filePath;
}

module.exports = {
  safeTempWrite,
};
