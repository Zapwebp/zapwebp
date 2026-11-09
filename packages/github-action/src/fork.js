'use strict';

const fs = require('node:fs');

/**
 * Custom error class for GitHub Action failures.
 */
class ZapwebpActionError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {string} [fix]
   * @param {string} [file]
   */
  constructor(code, message, fix = '', file = '') {
    super(message);
    this.name = 'ZapwebpActionError';
    this.code = code;
    this.fix = fix;
    this.file = file;
  }
}

/**
 * Checks whether the current CI execution is triggered by a pull request from a fork.
 * @param {Record<string, string>} [env=process.env]
 * @returns {boolean}
 */
function isForkPullRequest(env = process.env) {
  if (env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
      if (event.pull_request) {
        return Boolean(event.pull_request.head?.repo?.fork);
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Enforces fork safety by rejecting mode=commit on fork pull requests.
 * @param {object} inputs
 * @param {Record<string, string>} [env=process.env]
 * @throws {ZapwebpActionError}
 */
function assertForkSafety(inputs, env = process.env) {
  if (inputs.mode === 'commit' && isForkPullRequest(env)) {
    throw new ZapwebpActionError(
      'E_FORK_COMMIT_FORBIDDEN',
      'Zapwebp: commit mode is not allowed on fork PRs. Use mode: check instead, or have the maintainer run the action.',
      'Change `mode: check` in your PR workflow or run the workflow from the upstream repository.',
      '.github/workflows'
    );
  }
}

module.exports = {
  ZapwebpActionError,
  isForkPullRequest,
  assertForkSafety,
};

