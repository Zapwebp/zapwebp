'use strict';

const { Marked } = require('marked');
const { slugify } = require('./frontmatter');

/**
 * Escapes raw HTML characters.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Creates and configures a Marked instance customized for documentation.
 *
 * @param {Record<string, any>} [options={}]
 * @returns {Marked}
 */
function createMarkdownRenderer(options = {}) {
  const marked = new Marked();

  marked.use({
    renderer: {
      heading(token) {
        const depth = token.depth || 1;
        const rawText = token.text || '';
        const cleanText = rawText.replace(/`([^`]+)`/g, '$1');
        const id = slugify(cleanText);

        // Render inline tokens if parser is available
        const inlineHtml = this.parser ? this.parser.parseInline(token.tokens) : cleanText;

        if (depth === 1) {
          return `<h1 id="${id}">${inlineHtml}</h1>\n`;
        }

        return `<h${depth} id="${id}"><a class="header-anchor" href="#${id}" aria-label="Permalink to ${escapeHtml(cleanText)}">#</a>${inlineHtml}</h${depth}>\n`;
      },

      code(token) {
        const lang = (token.lang || 'text').split(/\s+/)[0];
        const rawCode = token.text || '';
        const escaped = escapeHtml(rawCode);

        return `<div class="code-block" data-language="${escapeHtml(lang)}">` +
          `<div class="code-header">` +
            `<span class="code-lang">${escapeHtml(lang)}</span>` +
            `<button class="copy-btn" type="button" aria-label="Copy code" data-code="${escapeHtml(rawCode)}">Copy</button>` +
          `</div>` +
          `<pre><code class="language-${escapeHtml(lang)}">${escaped}</code></pre>` +
        `</div>\n`;
      },

      link(token) {
        let href = token.href || '#';
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        const text = this.parser ? this.parser.parseInline(token.tokens) : escapeHtml(token.text);

        const isExternal = href.startsWith('http://') || href.startsWith('https://');

        // Rewrite relative markdown links: ./foo.md -> ./foo, /cli.md -> /cli, /index.md -> /
        if (!isExternal && href.endsWith('.md')) {
          href = href.replace(/\.md$/, '');
          if (href === 'index' || href === './index' || href === '/index') href = '/';
        }

        if (isExternal) {
          return `<a href="${escapeHtml(href)}"${title} target="_blank" rel="noopener noreferrer">${text}</a>`;
        }

        return `<a href="${escapeHtml(href)}"${title}>${text}</a>`;
      },

      table(token) {
        let headerHtml = '';
        let bodyHtml = '';

        if (token.header && token.header.length) {
          headerHtml = '<thead><tr>' +
            token.header.map((cell) => {
              const cellText = this.parser ? this.parser.parseInline(cell.tokens) : escapeHtml(cell.text);
              return `<th>${cellText}</th>`;
            }).join('') +
            '</tr></thead>';
        }

        if (token.rows && token.rows.length) {
          bodyHtml = '<tbody>' +
            token.rows.map((row) => {
              return '<tr>' +
                row.map((cell) => {
                  const cellText = this.parser ? this.parser.parseInline(cell.tokens) : escapeHtml(cell.text);
                  return `<td>${cellText}</td>`;
                }).join('') +
                '</tr>';
            }).join('') +
            '</tbody>';
        }

        return `<div class="table-wrap"><table>${headerHtml}${bodyHtml}</table></div>\n`;
      },

      blockquote(token) {
        const rawText = token.text || '';
        const body = this.parser ? this.parser.parse(token.tokens) : escapeHtml(rawText);

        // Check for alert annotations: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
        const alertMatch = rawText.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
        if (alertMatch) {
          const type = alertMatch[1].toLowerCase();
          const cleanBody = body.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
          const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
          return `<div class="alert alert-${type}"><div class="alert-title">${typeLabel}</div><div class="alert-content">${cleanBody}</div></div>\n`;
        }

        return `<blockquote>${body}</blockquote>\n`;
      },
    },
  });

  return marked;
}

/**
 * Transforms Markdown text into structured HTML.
 *
 * @param {string} markdown - Input Markdown string
 * @param {Record<string, any>} [options={}]
 * @returns {string} HTML string
 */
function renderMarkdown(markdown, options = {}) {
  const renderer = createMarkdownRenderer(options);
  return renderer.parse(markdown || '');
}

module.exports = {
  createMarkdownRenderer,
  renderMarkdown,
  escapeHtml,
};
