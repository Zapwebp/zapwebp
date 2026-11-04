'use strict';

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const exec = promisify(execFile);

/**
 * Configures the local git environment with the zapwebp bot committer identity.
 * @param {string} [cwd=process.cwd()]
 */
async function configureGit(cwd = process.cwd()) {
  await exec('git', ['config', 'user.name', 'zapwebp[bot]'], { cwd });
  await exec('git', ['config', 'user.email', 'bot@zapwebp.vercel.app'], { cwd });
}

/**
 * Checks whether uncommitted changes exist in the git workspace.
 * @param {string} [cwd=process.cwd()]
 * @returns {Promise<boolean>}
 */
async function hasChanges(cwd = process.cwd()) {
  try {
    const { stdout } = await exec('git', ['status', '--porcelain'], { cwd });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Stages all modified and untracked files, creates a commit, and pushes to remote.
 * @param {string} message
 * @param {string} [cwd=process.cwd()]
 */
async function commitAndPush(message, cwd = process.cwd()) {
  await exec('git', ['add', '-A'], { cwd });
  await exec('git', ['commit', '-m', message], { cwd });
  await exec('git', ['push'], { cwd });
}

/**
 * Retrieves a concise diff summary of uncommitted changes.
 * @param {string} [cwd=process.cwd()]
 * @returns {Promise<string>}
 */
async function getStatusSummary(cwd = process.cwd()) {
  try {
    const { stdout } = await exec('git', ['status', '-s'], { cwd });
    return stdout.trim();
  } catch {
    return '';
  }
}

module.exports = {
  configureGit,
  hasChanges,
  commitAndPush,
  getStatusSummary,
};

