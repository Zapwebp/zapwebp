'use strict';

/**
 * Generates standard llms.txt content following the llms.txt specification.
 *
 * @param {Array<{ title: string, description: string, path: string, markdownPath: string }>} pages
 * @param {Record<string, any>} config
 * @returns {string} Formatted llms.txt content
 */
function generateLlmsTxt(pages, config) {
  const siteTitle = config.title || 'Documentation';
  const siteDesc = config.description || config.tagline || 'Documentation site';
  const siteUrl = config.url || '';

  const lines = [
    `# ${siteTitle}`,
    '',
    `> ${siteDesc}`,
    '',
    '## Pages',
    '',
  ];

  for (const page of pages) {
    const fullMdUrl = `${siteUrl}${page.markdownPath.startsWith('/') ? page.markdownPath : '/' + page.markdownPath}`;
    const desc = page.description ? `: ${page.description}` : '';
    lines.push(`- [${page.title}](${fullMdUrl})${desc}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates an aggregated llms-full.txt file concatenating all pages.
 *
 * @param {Array<{ title: string, body: string, path: string }>} pages
 * @param {Record<string, any>} config
 * @returns {string} Complete concatenated Markdown
 */
function generateLlmsFullTxt(pages, config) {
  const siteTitle = config.title || 'Documentation';
  const siteDesc = config.description || config.tagline || '';

  const chunks = [
    `# ${siteTitle} (Full Documentation)`,
    '',
    siteDesc ? `> ${siteDesc}\n` : '',
    '---',
    '',
  ];

  for (const page of pages) {
    chunks.push(`<!-- PAGE: ${page.path} -->`);
    chunks.push(page.body ? page.body.trim() : `# ${page.title}`);
    chunks.push('\n---\n');
  }

  return chunks.join('\n');
}

module.exports = {
  generateLlmsTxt,
  generateLlmsFullTxt,
};
