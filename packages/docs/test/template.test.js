'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderPageHtml,
  renderBreadcrumbs,
  renderTableOfContents,
  renderPagination,
} = require('../src/template');

test('Template: renderPageHtml respects configurable lang, favicon, head tags, and search placeholder', () => {
  const config = {
    title: 'Acme Docs',
    lang: 'tl',
    url: 'https://docs.example.com',
    head: [
      '<meta name="custom-token" content="secret123">',
      { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.example.com' } },
    ],
    theme: {
      favicon: '/custom-favicon.ico',
      icon: '🚀',
      searchPlaceholder: 'Maghanap sa dokumentasyon...',
    },
    navigation: [
      { title: 'Home', path: '/' },
      { title: 'Gabay', path: '/gabay' },
    ],
  };

  const html = renderPageHtml({
    title: 'Pagsisimula',
    description: 'Gabay sa paggamit.',
    contentHtml: '<p>Nilalaman</p>',
    routePath: '/gabay',
    markdownPath: '/gabay.md',
    headings: [{ level: 2, text: 'Hakbang', id: 'hakbang' }],
    config,
  });

  // Verify language
  assert.ok(html.includes('<html lang="tl">'));
  assert.ok(html.includes('"inLanguage": "tl"'));

  // Verify custom favicon & icon
  assert.ok(html.includes('<link rel="icon" href="/custom-favicon.ico">'));
  assert.ok(html.includes('<span class="brand-icon" aria-hidden="true">🚀</span>'));

  // Verify custom head injection
  assert.ok(html.includes('<meta name="custom-token" content="secret123">'));
  assert.ok(html.includes('<link rel="preconnect" href="https://fonts.example.com">'));

  // Verify localized search placeholder
  assert.ok(html.includes('placeholder="Maghanap sa dokumentasyon..."'));
  assert.ok(html.includes('aria-label="Maghanap sa dokumentasyon... (Press / to search)"'));
});

test('Template: renderBreadcrumbs, renderTableOfContents, renderPagination build accessible elements', () => {
  const breadcrumbs = renderBreadcrumbs('/advanced/optimization');
  assert.ok(breadcrumbs.includes('<nav class="breadcrumbs" aria-label="Breadcrumb">'));
  assert.ok(breadcrumbs.includes('<a href="/">Home</a>'));
  assert.ok(breadcrumbs.includes('<a href="/advanced">Advanced</a>'));
  assert.ok(breadcrumbs.includes('<span class="crumb-current" aria-current="page">Optimization</span>'));

  const toc = renderTableOfContents([
    { level: 2, text: 'Overview', id: 'overview' },
    { level: 3, text: 'Details', id: 'details' },
  ]);
  assert.ok(toc.includes('<aside class="docs-toc" aria-label="Table of contents">'));
  assert.ok(toc.includes('<a href="#overview">Overview</a>'));
  assert.ok(toc.includes('<a href="#details">Details</a>'));

  const pagination = renderPagination(
    { title: 'Intro', path: '/intro' },
    { title: 'Next Steps', path: '/next' }
  );
  assert.ok(pagination.includes('rel="prev"'));
  assert.ok(pagination.includes('rel="next"'));
  assert.ok(pagination.includes('← Intro'));
  assert.ok(pagination.includes('Next Steps →'));
});
