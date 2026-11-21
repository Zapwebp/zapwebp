'use strict';

const DEFAULT_ROUTE_PRIORITIES = Object.freeze({
  '/cli': '0.9',
  '/mcp': '0.9',
  '/api': '0.9',
  '/guide': '0.9',
  '/docs': '0.9',
  '/errors': '0.7',
});

/**
 * Escapes XML entity characters.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates valid sitemap.xml content for search engine crawlers.
 *
 * @param {Array<{ path: string, priority?: number }>} pages
 * @param {Record<string, any>} [config={}]
 * @returns {string} XML string
 */
function generateSitemap(pages, config = {}) {
  const siteUrl = config.url || '';
  const prioritiesConfig = config.sitemap?.priorities || {};

  const urls = pages.map((page) => {
    const isRoot = page.path === '/' || page.path === '';
    const cleanPath = isRoot ? '/' : (page.path.startsWith('/') ? page.path : `/${page.path}`);
    const fullLoc = `${siteUrl}${cleanPath}`;

    let priority = '0.8';
    if (page.priority !== undefined && page.priority !== null) {
      priority = String(page.priority);
    } else if (prioritiesConfig[cleanPath] !== undefined) {
      priority = String(prioritiesConfig[cleanPath]);
    } else if (isRoot) {
      priority = '1.0';
    } else if (DEFAULT_ROUTE_PRIORITIES[cleanPath] !== undefined) {
      priority = DEFAULT_ROUTE_PRIORITIES[cleanPath];
    } else {
      const segments = cleanPath.split('/').filter(Boolean);
      priority = segments.length <= 1 ? '0.8' : '0.6';
    }

    return `  <url><loc>${escapeXml(fullLoc)}</loc><priority>${priority}</priority></url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

module.exports = {
  generateSitemap,
  escapeXml,
};
