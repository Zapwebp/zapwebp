'use strict';

const { parseInputs } = require('./inputs');
const { scan } = require('./scan');
const { convert } = require('./convert');
const { configureGit, hasChanges, commitAndPush, getStatusSummary } = require('./git');
const { postComment, postCheckFailure } = require('./comment');
const { writeManifest } = require('./manifest');
const { assertForkSafety, ZapwebpActionError } = require('./fork');
const { error: emitError, notice: emitNotice, setFailed } = require('./annotations');
const { sanitizeLog } = require('./sanitize');

/**
 * Executes the Zapwebp GitHub Action.
 * @param {string[]} [argv=process.argv.slice(2)]
 * @param {Record<string, string>} [env=process.env]
 * @param {string} [rootDir=process.cwd()]
 * @returns {Promise<{
 *   success: boolean,
 *   mode: string,
 *   filesIn: number,
 *   filesOut: number,
 *   filesSkipped: number,
 *   changed: boolean
 * }>}
 */
async function runAction(argv = process.argv.slice(2), env = process.env, rootDir = process.cwd()) {
  const inputs = parseInputs(argv, env);
  console.log(`⚡ [zapwebp-action] Running in "${inputs.mode}" mode for pattern: "${inputs.glob}"`);

  // 1. Enforce Fork Safety (reject commit mode on fork PRs)
  assertForkSafety(inputs, env);

  // 2. Discover matching files
  const files = scan(rootDir, inputs.glob);
  if (files.length === 0) {
    console.log(`[zapwebp-action] No image files found matching "${inputs.glob}".`);
    return { success: true, mode: inputs.mode, filesIn: 0, filesOut: 0, filesSkipped: 0, changed: false };
  }

  // 3. Perform conversions with idempotency caching
  const result = await convert(files, inputs, rootDir);
  console.log(`[zapwebp-action] Converted ${result.filesIn} image(s) → ${result.filesOut} ${inputs.format.toUpperCase()}(s) (${result.filesSkipped} skipped via cache).`);

  // 4. Handle conversion failures (e.g. E_UNSAFE_SVG or corrupted files)
  if (result.failures && result.failures.length > 0) {
    if (inputs.token) {
      await postCheckFailure(inputs.token, result.failures, env);
    }
    const firstFail = result.failures[0];
    const err = new ZapwebpActionError(
      firstFail.code || 'E_CONVERSION_FAILED',
      `[zapwebp-action] ${result.failures.length} image(s) failed validation or conversion: ${firstFail.reason}`,
      firstFail.fix,
      firstFail.file
    );
    throw err;
  }

  // 5. Write manifest
  writeManifest(result.outputs, inputs, rootDir);

  // 6. Inspect git status
  const dirty = await hasChanges(rootDir);

  // 7. Handle mode logic
  switch (inputs.mode) {
    case 'commit': {
      if (!dirty) {
        console.log('[zapwebp-action] No uncommitted changes detected. Repository is up-to-date.');
        return { success: true, mode: 'commit', filesIn: result.filesIn, filesOut: result.filesOut, filesSkipped: result.filesSkipped, changed: false };
      }

      await configureGit(rootDir);
      await commitAndPush(inputs.commitMessage, rootDir);
      console.log(`[zapwebp-action] Committed and pushed ${result.filesOut} optimized assets.`);
      return { success: true, mode: 'commit', filesIn: result.filesIn, filesOut: result.filesOut, filesSkipped: result.filesSkipped, changed: true };
    }

    case 'check': {
      if (dirty) {
        const summary = await getStatusSummary(rootDir);
        const outOfDateFiles = summary
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => {
            const trimmed = line.trim();
            const filePath = trimmed.replace(/^[A-Z?]+\s+/, '');
            return {
              file: filePath,
              reason: 'Missing or out-of-date converted asset.',
            };
          });

        if (inputs.token) {
          await postCheckFailure(inputs.token, outOfDateFiles, env);
        }

        const errMessage = `[zapwebp-action] Verification failed: Images have uncommitted or out-of-date ${inputs.format.toUpperCase()} equivalents.\n${summary}\nRun \`npx zapwebp\` locally and commit the outputs.`;
        emitError(errMessage, { title: 'E_OUT_OF_DATE' });
        emitNotice('Run `npx zapwebp` locally, then commit the generated images.', { title: 'Fix' });

        const err = new ZapwebpActionError(
          'E_OUT_OF_DATE',
          errMessage,
          'Run `npx zapwebp` locally and commit the outputs.',
          outOfDateFiles[0]?.file || ''
        );
        throw err;
      }
      console.log(`[zapwebp-action] Verification passed: All assets match committed ${inputs.format.toUpperCase()} outputs.`);
      return { success: true, mode: 'check', filesIn: result.filesIn, filesOut: result.filesOut, filesSkipped: result.filesSkipped, changed: false };
    }

    case 'comment': {
      await postComment(inputs.token, result, env);
      return { success: true, mode: 'comment', filesIn: result.filesIn, filesOut: result.filesOut, filesSkipped: result.filesSkipped, changed: dirty };
    }

    default:
      throw new ZapwebpActionError('E_INVALID_MODE', `Unsupported mode: ${inputs.mode}`, 'Set mode to commit, check, or comment.');
  }
}

// CLI execution gate when invoked directly by runner
if (require.main === module) {
  runAction().catch((err) => {
    const code = err.code || 'E_ACTION_FAILED';
    const message = err.message || String(err);
    const sanitized = sanitizeLog(message);

    emitError(sanitized, { title: code, file: err.file });
    if (err.fix) {
      emitNotice(err.fix, { title: 'Fix' });
    }
    setFailed(sanitized);
  });
}

module.exports = {
  runAction,
};
