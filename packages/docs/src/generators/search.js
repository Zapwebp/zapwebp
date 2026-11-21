'use strict';

/**
 * Strips Markdown syntax and punctuation to extract pure searchable text.
 *
 * @param {string} md
 * @returns {string} Plain text
 */
function extractSearchableText(md) {
  return String(md || '')
    .replace(/^---[\s\S]*?---/g, '') // strip frontmatter
    .replace(/```[\s\S]*?```/g, '') // strip code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // link text
    .replace(/<[^>]+>/g, '') // HTML tags
    .replace(/[#*~_|>-]/g, ' ') // markdown symbols
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates lightweight search-index.json for instant client-side lookup.
 *
 * @param {Array<{
 *   title: string,
 *   description?: string,
 *   path: string,
 *   headings?: Array<{ text: string, id: string }>,
 *   body: string
 * }>} pages
 * @returns {string} JSON string
 */
function generateSearchIndex(pages) {
  const index = pages.map((p) => {
    const cleanPath = p.path === '' ? '/' : (p.path.startsWith('/') ? p.path : `/${p.path}`);
    const headingList = (p.headings || []).map((h) => h.text);
    const plainText = extractSearchableText(p.body);
    // Limit text sample to first 2000 chars for small index size
    const snippet = plainText.length > 2000 ? plainText.slice(0, 2000) : plainText;

    return {
      title: p.title,
      path: cleanPath,
      description: p.description || '',
      headings: headingList,
      text: snippet,
    };
  });

  return JSON.stringify(index);
}

module.exports = {
  extractSearchableText,
  generateSearchIndex,
};
