'use strict';

const fs = require('node:fs');
const { retry } = require('./retry');
const { sanitizeLog } = require('./sanitize');

const API = 'https://api.github.com';

/**
 * Builds the markdown summary for PR comments when images are converted.
 * @param {{ filesIn: number, filesOut: number, bytesIn: number, bytesOut: number, filesSkipped?: number }} result
 * @returns {string}
 */
function buildCommentBody(result) {
  const bytesSaved = Math.max(0, result.bytesIn - result.bytesOut);
  const savingsPercent = result.bytesIn > 0 ? ((bytesSaved / result.bytesIn) * 100).toFixed(1) : '0.0';

  const rows = [
    `### ⚡ Zapwebp`,
    ``,
    `Converted **${result.filesIn}** image${result.filesIn === 1 ? '' : 's'} to **${result.filesOut}** optimized asset${result.filesOut === 1 ? '' : 's'}.`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Original size | ${(result.bytesIn / 1024).toFixed(1)} KB |`,
    `| Output size | ${(result.bytesOut / 1024).toFixed(1)} KB |`,
    `| Bandwidth saved | **${savingsPercent}%** (${(bytesSaved / 1024).toFixed(1)} KB) |`,
  ];

  if (result.filesSkipped && result.filesSkipped > 0) {
    rows.push(`| Skipped (cached) | **${result.filesSkipped}** file${result.filesSkipped === 1 ? '' : 's'} |`);
  }

  rows.push(
    ``,
    `Transparency preserved. Metadata stripped. Output verified.`
  );

  return rows.join('\n');
}

/**
 * Builds the markdown message for PR comments when check mode fails.
 * @param {Array<{ file: string, reason: string }>} failures
 * @returns {string}
 */
function buildCheckFailureBody(failures) {
  const fileCount = failures.length;
  const fileList = failures.map((f) => f.file).join(' ');

  return [
    `## ⚡ Zapwebp check failed`,
    ``,
    `${fileCount} file${fileCount === 1 ? '' : 's'} need conversion:`,
    ``,
    `| File | Reason |`,
    `|---|---|`,
    failures.map((f) => `| \`${f.file}\` | ${f.reason} |`).join('\n'),
    ``,
    `### How to fix`,
    ``,
    `Run locally:`,
    `\`\`\`bash`,
    `npx zapwebp ${fileList}`,
    `\`\`\``,
    ``,
    `Then commit and push the results.`,
  ].join('\n');
}

/**
 * Resolves current pull request number from GitHub Actions environment.
 * @param {Record<string, string>} env
 * @returns {number|null}
 */
function getPrNumber(env) {
  if (env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
      return event.pull_request?.number || event.issue?.number || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Posts an issue/PR comment using GitHub REST API with exponential backoff retry.
 * @param {string} token
 * @param {string} body
 * @param {Record<string, string>} env
 * @returns {Promise<boolean>}
 */
async function postGithubComment(token, body, env) {
  if (!token) return false;

  const prNumber = getPrNumber(env);
  if (!prNumber) {
    console.log('[zapwebp-action] Not in a pull request context; skipping comment.');
    return false;
  }

  const repo = env.GITHUB_REPOSITORY;
  if (!repo) {
    console.warn('[zapwebp-action] GITHUB_REPOSITORY is not set; skipping comment.');
    return false;
  }

  try {
    await retry(async () => {
      const res = await fetch(`${API}/repos/${repo}/issues/${prNumber}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'zapwebp-action',
        },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status}: ${errorText}`);
        err.status = res.status;
        throw err;
      }
    }, { maxAttempts: 3, baseDelayMs: 800 });

    console.log(`[zapwebp-action] Successfully posted comment to PR #${prNumber}.`);
    return true;
  } catch (err) {
    const sanitized = sanitizeLog(err.message, [token]);
    console.error(`[zapwebp-action] Failed to post comment: ${sanitized}`);
    return false;
  }
}

/**
 * Posts conversion summary comment to the pull request.
 * @param {string} token
 * @param {{ filesIn: number, filesOut: number, bytesIn: number, bytesOut: number, filesSkipped?: number }} result
 * @param {Record<string, string>} [env=process.env]
 * @returns {Promise<boolean>}
 */
async function postComment(token, result, env = process.env) {
  if (!token) {
    console.warn('[zapwebp-action] No GitHub token provided; skipping PR comment.');
    return false;
  }
  const body = buildCommentBody(result);
  return postGithubComment(token, body, env);
}

/**
 * Posts verification failure comment to the pull request in check mode.
 * @param {string} token
 * @param {Array<{ file: string, reason: string }>} failures
 * @param {Record<string, string>} [env=process.env]
 * @returns {Promise<boolean>}
 */
async function postCheckFailure(token, failures, env = process.env) {
  if (!token || !failures || failures.length === 0) return false;
  const body = buildCheckFailureBody(failures);
  return postGithubComment(token, body, env);
}

module.exports = {
  buildCommentBody,
  buildCheckFailureBody,
  postComment,
  postCheckFailure,
};
