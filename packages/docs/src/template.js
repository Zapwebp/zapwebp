'use strict';

const { escapeHtml } = require('./markdown');

/**
 * Builds breadcrumbs HTML from a path.
 *
 * @param {string} routePath
 * @returns {string}
 */
function renderBreadcrumbs(routePath) {
  if (!routePath || routePath === '/') return '';
  const segments = routePath.split('/').filter(Boolean);
  if (!segments.length) return '';

  const crumbs = ['<a href="/">Home</a>'];
  let accumulated = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accumulated += `/${seg}`;
    const label = seg
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    if (i === segments.length - 1) {
      crumbs.push(`<span class="crumb-current" aria-current="page">${escapeHtml(label)}</span>`);
    } else {
      crumbs.push(`<a href="${escapeHtml(accumulated)}">${escapeHtml(label)}</a>`);
    }
  }

  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs.join(' <span class="crumb-separator" aria-hidden="true">/</span> ')}</nav>`;
}

/**
 * Renders on-page Table of Contents navigation.
 *
 * @param {Array<{ level: number, text: string, id: string }>} headings
 * @returns {string}
 */
function renderTableOfContents(headings) {
  if (!headings || headings.length <= 1) return '';

  const items = headings
    .filter((h) => h.level >= 2 && h.level <= 3)
    .map((h) => {
      const indentClass = h.level === 3 ? 'toc-subitem' : 'toc-item';
      return `<li class="${indentClass}"><a href="#${escapeHtml(h.id)}">${escapeHtml(h.text)}</a></li>`;
    });

  if (!items.length) return '';

  return (
    `<aside class="docs-toc" aria-label="Table of contents">` +
    `<div class="toc-header">On this page</div>` +
    `<ul class="toc-list">${items.join('\n')}</ul>` +
    `</aside>`
  );
}

/**
 * Renders previous / next pagination bar.
 *
 * @param {object|null} prevPage
 * @param {object|null} nextPage
 * @returns {string}
 */
function renderPagination(prevPage, nextPage) {
  if (!prevPage && !nextPage) return '';

  let html = '<nav class="docs-pagination" aria-label="Page navigation">';
  if (prevPage) {
    html += `<a href="${escapeHtml(prevPage.path)}" class="pagination-prev" rel="prev">` +
      `<span class="pagination-sub">Previous</span>` +
      `<span class="pagination-title">← ${escapeHtml(prevPage.title)}</span>` +
    `</a>`;
  } else {
    html += '<span class="pagination-spacer"></span>';
  }

  if (nextPage) {
    html += `<a href="${escapeHtml(nextPage.path)}" class="pagination-next" rel="next">` +
      `<span class="pagination-sub">Next</span>` +
      `<span class="pagination-title">${escapeHtml(nextPage.title)} →</span>` +
    `</a>`;
  }
  html += '</nav>';
  return html;
}

/**
 * Generates complete, self-contained, accessible HTML for a documentation page.
 *
 * @param {object} params
 * @param {string} params.title - Page title
 * @param {string} params.description - Page description
 * @param {string} params.contentHtml - Main article HTML
 * @param {string} params.routePath - Route path e.g. "/cli"
 * @param {string} params.markdownPath - Path to .md mirror e.g. "/cli.md"
 * @param {Array<{ level: number, text: string, id: string }>} [params.headings=[]] - TOC headings
 * @param {object|null} [params.prevPage] - Previous page object
 * @param {object|null} [params.nextPage] - Next page object
 * @param {Record<string, any>} params.config - Engine configuration
 * @returns {string} Fully rendered HTML document
 */
function renderPageHtml({
  title,
  description,
  contentHtml,
  routePath,
  markdownPath,
  headings = [],
  prevPage = null,
  nextPage = null,
  config,
}) {
  const siteTitle = config.title || 'Documentation';
  const fullTitle = routePath === '/' ? siteTitle : `${title} — ${siteTitle}`;
  const siteUrl = config.url || '';
  const canonicalUrl = `${siteUrl}${routePath === '/' ? '' : routePath}`;
  const authorName = config.author?.name || siteTitle;
  const authorUrl = config.author?.url || siteUrl;
  const pageLang = config.lang || 'en';

  const jsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description: description,
      url: canonicalUrl,
      inLanguage: pageLang,
      author: {
        '@type': 'Organization',
        name: authorName,
        url: authorUrl,
      },
    },
    null,
    2
  );

  // Build navigation items
  const navItems = (config.navigation || []).map((item) => {
    const isRoot = item.path === '/';
    const isActive = isRoot ? routePath === '/' : routePath === item.path || routePath.startsWith(`${item.path}/`);
    const activeClass = isActive ? ' active' : '';
    const ariaCurrent = isActive ? ' aria-current="page"' : '';
    return `<a href="${escapeHtml(item.path)}"${activeClass}${ariaCurrent}>${escapeHtml(item.title)}</a>`;
  }).join('\n      ');

  // Breadcrumbs
  const breadcrumbs = renderBreadcrumbs(routePath);

  // Table of contents
  const toc = renderTableOfContents(headings);

  // Pagination
  const pagination = renderPagination(prevPage, nextPage);

  // Brand title & logo
  let brandMark = '';
  if (config.theme?.logo) {
    brandMark = `<img src="${escapeHtml(config.theme.logo)}" alt="" class="brand-logo" width="24" height="24"> `;
  } else if (config.theme?.icon) {
    brandMark = `<span class="brand-icon" aria-hidden="true">${escapeHtml(config.theme.icon)}</span> `;
  }
  const brandName = config.title || 'Docs';

  // Favicon link
  let faviconLink = '';
  if (config.theme?.favicon) {
    faviconLink = `<link rel="icon" href="${escapeHtml(config.theme.favicon)}">\n  `;
  } else if (config.theme?.icon) {
    faviconLink = `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${encodeURIComponent(config.theme.icon)}</text></svg>">\n  `;
  }

  // Custom head items
  let customHead = '';
  if (Array.isArray(config.head) && config.head.length) {
    customHead = config.head
      .map((item) => {
        if (typeof item === 'string') return `  ${item}`;
        if (item && typeof item === 'object' && item.tag) {
          const attrs = Object.entries(item.attrs || {})
            .map(([k, v]) => `${escapeHtml(k)}="${escapeHtml(v)}"`)
            .join(' ');
          return item.content
            ? `  <${item.tag}${attrs ? ' ' + attrs : ''}>${item.content}</${item.tag}>`
            : `  <${item.tag}${attrs ? ' ' + attrs : ''}>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n') + '\n  ';
  }

  // Optional tokens CSS
  const tokensLink = config.theme?.tokens
    ? `<link rel="stylesheet" href="${escapeHtml(config.theme.tokens)}">\n  `
    : '';

  // Optional custom CSS
  const customCssLink = config.theme?.customCss
    ? `<link rel="stylesheet" href="${escapeHtml(config.theme.customCss)}">\n  `
    : '';

  // GitHub link
  const githubLink = config.theme?.github
    ? `<a href="${escapeHtml(config.theme.github)}" target="_blank" rel="noopener noreferrer" class="nav-github">GitHub</a>`
    : '';

  const searchPlaceholder = config.theme?.searchPlaceholder || 'Search docs...';

  return `<!doctype html>
<html lang="${escapeHtml(pageLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" type="text/markdown" href="${escapeHtml(markdownPath)}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHtml(siteTitle)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${faviconLink}${tokensLink}<link rel="stylesheet" href="/docs.css">
  ${customCssLink}${customHead}<script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body>
  <a href="#content" class="skip-link">Skip to content</a>

  <header class="docs-header">
    <div class="header-inner">
      <div class="header-left">
        <a href="/" class="brand">${brandMark}<span>${escapeHtml(brandName)}</span></a>
      </div>
      <nav class="docs-nav" aria-label="Main Navigation">
      ${navItems}
      </nav>
      <div class="header-right">
        <button type="button" class="search-trigger" id="search-trigger" aria-label="${escapeHtml(searchPlaceholder)} (Press / to search)">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <span class="search-label">Search</span>
          <kbd class="search-kbd">/</kbd>
        </button>
        <button type="button" class="theme-toggle" id="theme-toggle" aria-label="Toggle dark/light mode">
          <span class="theme-icon" aria-hidden="true">🌓</span>
        </button>
        ${githubLink}
        <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
          <span class="menu-icon" aria-hidden="true">☰</span>
        </button>
      </div>
    </div>
  </header>

  <div class="docs-layout">
    <main id="content" class="docs-main">
      ${breadcrumbs}
      <article class="docs-article">
        ${contentHtml}
      </article>
      ${pagination}
    </main>

    ${toc}
  </div>

  <footer class="docs-footer">
    <div class="footer-inner">
      <div class="footer-meta">
        ${escapeHtml(brandName)} · ${escapeHtml(config.footer?.copyright || '© ' + new Date().getFullYear())} · ${escapeHtml(config.footer?.license || 'MIT')}
      </div>
      <div class="footer-links">
        ${githubLink ? `<a href="${escapeHtml(config.theme.github)}" target="_blank" rel="noopener noreferrer">GitHub</a> · ` : ''}
        <a href="/llms.txt">llms.txt</a> ·
        <a href="/agent.json">agent.json</a> ·
        <a href="/sitemap.xml">sitemap.xml</a> ·
        <a href="${escapeHtml(markdownPath)}">view source (.md)</a>
      </div>
    </div>
  </footer>

  <div id="search-modal" class="search-modal" hidden aria-modal="true" role="dialog" aria-label="Search documentation">
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-card">
      <div class="search-input-wrap">
        <input type="search" id="search-input" class="search-input" placeholder="${escapeHtml(searchPlaceholder)}" autocomplete="off" spellcheck="false">
        <button type="button" id="search-close" class="search-close" aria-label="Close search">✕</button>
      </div>
      <div id="search-results" class="search-results">
        <div class="search-empty">Type a query to search documentation...</div>
      </div>
    </div>
  </div>

  <script src="/docs.js" defer></script>
</body>
</html>`;
}

module.exports = {
  renderPageHtml,
  renderBreadcrumbs,
  renderTableOfContents,
  renderPagination,
};
