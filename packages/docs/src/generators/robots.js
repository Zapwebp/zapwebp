'use strict';

/**
 * Generates robots.txt granting full access to search and AI agent crawlers.
 *
 * @param {Record<string, any>} config
 * @returns {string} Formatted robots.txt
 */
function generateRobotsTxt(config) {
  const siteUrl = config.url || '';
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  const bots = [
    '*',
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'cohere-ai',
  ];

  const rules = bots.map((bot) => `User-agent: ${bot}\nAllow: /\n`).join('\n');

  return `${rules}\nSitemap: ${sitemapUrl}\n`;
}

module.exports = {
  generateRobotsTxt,
};
