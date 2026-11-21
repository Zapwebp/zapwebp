'use strict';

/**
 * Generates structured agent.json for autonomous AI agent discovery.
 *
 * @param {Array<{
 *   title: string,
 *   description?: string,
 *   path: string,
 *   markdownPath: string,
 *   headings?: Array<{ level: number, text: string, id: string }>
 * }>} pages
 * @param {Record<string, any>} config
 * @returns {string} Pretty-printed JSON string
 */
function generateAgentJson(pages, config) {
  const siteTitle = config.title || 'Documentation';
  const siteDesc = config.description || config.tagline || 'Documentation site';
  const siteUrl = config.url || '';

  const manifest = {
    name: siteTitle,
    description: siteDesc,
    url: siteUrl,
    pages: pages.map((p) => {
      const cleanPath = p.path === '' ? '/' : (p.path.startsWith('/') ? p.path : `/${p.path}`);
      const cleanMd = p.markdownPath.startsWith('/') ? p.markdownPath : `/${p.markdownPath}`;
      return {
        title: p.title,
        url: cleanPath,
        markdown: cleanMd,
        description: p.description || undefined,
        headings: p.headings && p.headings.length ? p.headings : undefined,
      };
    }),
  };

  return JSON.stringify(manifest, null, 2);
}

module.exports = {
  generateAgentJson,
};
