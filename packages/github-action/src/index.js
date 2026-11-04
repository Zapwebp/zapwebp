'use strict';

const { parseInputs } = require('./inputs');
const { scan } = require('./scan');
const { convert } = require('./convert');
const { configureGit, hasChanges, commitAndPush, getStatusSummary } = require('./git');
const { postComment } = require('./comment');
const { writeManifest } = require('./manifest');

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
 *   changed: boolean
 * }>}
 */
async function runAction(argv = process.argv.slice(2), env = process.env, rootDir = process.cwd()) {
  const inputs = parseInputs(argv, env);
  console.log(`⚡ [zapwebp-action] Running in "${inputs.mode}" mode for pattern: "${inputs.glob}"`);

  // 1. Discover matching files
  const files = scan(rootDir, inputs.glob);
  if (files.length === 0) {
    console.log(`[zapwebp-action] No image files found matching "${inputs.glob}".`);
    return { success: true, mode: inputs.mode, filesIn: 0, filesOut: 0, changed: false };
  }

  // 2. Perform conversions in-process
  const result = await convert(files, inputs, rootDir);
  console.log(`[zapwebp-action] Converted ${result.filesIn} image(s) → ${result.filesOut} ${inputs.format.toUpperCase()}(s).`);

  // 3. Write manifest
  writeManifest(result.outputs, inputs, rootDir);

  // 4. Inspect git status
  const dirty = await hasChanges(rootDir);

  // 5. Handle mode logic
  switch (inputs.mode) {
    case 'commit': {
      if (!dirty) {
        console.log('[zapwebp-action] No uncommitted changes detected. Repository is up-to-date.');
        return { success: true, mode: 'commit', filesIn: result.filesIn, filesOut: result.filesOut, changed: false };
      }

      await configureGit(rootDir);
      await commitAndPush(inputs.commitMessage, rootDir);
      console.log(`[zapwebp-action] Committed and pushed ${result.filesOut} optimized assets.`);
      return { success: true, mode: 'commit', filesIn: result.filesIn, filesOut: result.filesOut, changed: true };
    }

    case 'check': {
      if (dirty) {
        const summary = await getStatusSummary(rootDir);
        const errMessage = `[zapwebp-action] Verification failed: Images have uncommitted or out-of-date ${inputs.format.toUpperCase()} equivalents.\n${summary}\nRun \`npx zapwebp\` locally and commit the outputs.`;
        console.error(errMessage);
        const err = new Error(errMessage);
        err.code = 'E_OUT_OF_DATE';
        throw err;
      }
      console.log(`[zapwebp-action] Verification passed: All assets match committed ${inputs.format.toUpperCase()} outputs.`);
      return { success: true, mode: 'check', filesIn: result.filesIn, filesOut: result.filesOut, changed: false };
    }

    case 'comment': {
      await postComment(inputs.token, result, env);
      return { success: true, mode: 'comment', filesIn: result.filesIn, filesOut: result.filesOut, changed: dirty };
    }

    default:
      throw new Error(`Unsupported mode: ${inputs.mode}`);
  }
}

// CLI execution gate when invoked directly
if (require.main === module) {
  runAction().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = {
  runAction,
};

