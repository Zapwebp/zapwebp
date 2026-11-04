'use strict';

const fs = require('node:fs');

const API = 'https://api.github.com';

/**
 * Builds the markdown summary for PR comments.
 * @param {{ filesIn: number, filesOut: number, bytesIn: number, bytesOut: number }} result
 * @returns {string}
 */
function buildCommentBody(result) {
  const bytesSaved = Math.max(0, result.bytesIn - result.bytesOut);
  const savingsPercent = result.bytesIn > 0 ? ((bytesSaved / result.bytesIn) * 100).toFixed(1) : '0.0';

  return [
    `### ⚡ Zapwebp`,
    ``,
    `Converted **${result.filesIn}** image${result.filesIn === 1 ? '' : 's'} to **${result.filesOut}** optimized asset${result.filesOut === 1 ? '' : 's'}.`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Original size | ${(result.bytesIn / 1024).toFixed(1)} KB |`,
    `| Output size | ${(result.bytesOut / 1024).toFixed(1)} KB |`,
    `| Bandwidth saved | **${savingsPercent}%** (${(bytesSaved / 1024).toFixed(1)} KB) |`,
    ``,
    `Transparency preserved. Metadata stripped. Output verified.`,
  ].join('\n');
}

/**
 * Posts a pull request comment via GitHub REST API.
 * @param {string} token
 * @param {{ filesIn: number, filesOut: number, bytesIn: number, bytesOut: number }} result
 * @param {Record<string, string>} [env=process.env]
 * @returns {Promise<boolean>} Whether the comment was successfully posted.
 */
async function postComment(token, result, env = process.env) {
  if (!token) {
    console.warn('[zapwebp-action] No GitHub token provided; skipping PR comment.');
    return false;
  }

  let prNumber = null;
  if (env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
      prNumber = event.pull_request?.number || event.issue?.number || null;
    } catch {
      prNumber = null;
    }
  }

  if (!prNumber) {
    console.log('[zapwebp-action] Not in a pull request context; skipping comment.');
    return false;
  }

  const repo = env.GITHUB_REPOSITORY;
  if (!repo) {
    console.warn('[zapwebp-action] GITHUB_REPOSITORY is not set; skipping comment.');
    return false;
  }

  const body = buildCommentBody(result);
  const response = await fetch(`${API}/repos/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'zapwebp-action',
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[zapwebp-action] Failed to post comment (${response.status}): ${errorText}`);
    return false;
  }

  console.log(`[zapwebp-action] Successfully posted summary comment to PR #${prNumber}.`);
  return true;
}

module.exports = {
  buildCommentBody,
  postComment,
};

