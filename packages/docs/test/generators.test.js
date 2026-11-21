'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateLlmsTxt, generateLlmsFullTxt } = require('../src/generators/llms');
const { generateSitemap } = require('../src/generators/sitemap');
const { generateRobotsTxt } = require('../src/generators/robots');
const { generateAgentJson } = require('../src/generators/agent');
const { generateSearchIndex, extractSearchableText } = require('../src/generators/search');

const sampleConfig = {
  title: 'Zapwebp Docs',
  description: 'Documentation for Zapwebp — convert correctly.',
  url: 'https://zapwebp-docs.vercel.app',
};

const samplePages = [
  {
    title: 'Getting Started',
    description: 'Quickstart for Zapwebp.',
    path: '/',
    markdownPath: '/index.md',
    headings: [{ level: 2, text: 'Quick start', id: 'quick-start' }],
    body: '# Getting Started\n\nQuickstart for Zapwebp.',
  },
  {
    title: 'CLI',
    description: 'Convert images from terminal.',
    path: '/cli',
    markdownPath: '/cli.md',
    headings: [{ level: 2, text: 'Options', id: 'options' }],
    body: '# CLI\n\nConvert images from terminal.',
  },
];

test('Generators: llms.txt matches expected format', () => {
  const llms = generateLlmsTxt(samplePages, sampleConfig);
  assert.ok(llms.startsWith('# Zapwebp Docs\n'));
  assert.ok(llms.includes('> Documentation for Zapwebp — convert correctly.'));
  assert.ok(llms.includes('- [Getting Started](https://zapwebp-docs.vercel.app/index.md): Quickstart for Zapwebp.'));
  assert.ok(llms.includes('- [CLI](https://zapwebp-docs.vercel.app/cli.md): Convert images from terminal.'));
});

test('Generators: sitemap.xml generates valid URL set with priorities', () => {
  const sitemap = generateSitemap(samplePages, sampleConfig);
  assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(sitemap.includes('<url><loc>https://zapwebp-docs.vercel.app/</loc><priority>1.0</priority></url>'));
  assert.ok(sitemap.includes('<url><loc>https://zapwebp-docs.vercel.app/cli</loc><priority>0.9</priority></url>'));
  assert.ok(sitemap.endsWith('</urlset>\n'));
});

test('Generators: robots.txt allows search and AI bot crawlers', () => {
  const robots = generateRobotsTxt(sampleConfig);
  assert.ok(robots.includes('User-agent: *\nAllow: /'));
  assert.ok(robots.includes('User-agent: GPTBot\nAllow: /'));
  assert.ok(robots.includes('User-agent: ClaudeBot\nAllow: /'));
  assert.ok(robots.includes('User-agent: PerplexityBot\nAllow: /'));
  assert.ok(robots.includes('User-agent: Google-Extended\nAllow: /'));
  assert.ok(robots.includes('Sitemap: https://zapwebp-docs.vercel.app/sitemap.xml'));
});

test('Generators: agent.json produces valid parseable JSON directory', () => {
  const jsonStr = generateAgentJson(samplePages, sampleConfig);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.name, 'Zapwebp Docs');
  assert.equal(parsed.description, 'Documentation for Zapwebp — convert correctly.');
  assert.equal(parsed.url, 'https://zapwebp-docs.vercel.app');
  assert.equal(parsed.pages.length, 2);
  assert.equal(parsed.pages[0].title, 'Getting Started');
  assert.equal(parsed.pages[0].url, '/');
  assert.equal(parsed.pages[0].markdown, '/index.md');
  assert.equal(parsed.pages[1].title, 'CLI');
  assert.equal(parsed.pages[1].url, '/cli');
  assert.equal(parsed.pages[1].markdown, '/cli.md');
});

test('Generators: search-index.json extracts clean searchable tokens', () => {
  const searchJson = generateSearchIndex(samplePages);
  const items = JSON.parse(searchJson);

  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Getting Started');
  assert.ok(items[0].text.includes('Quickstart for Zapwebp'));
  assert.equal(items[1].title, 'CLI');
  assert.ok(items[1].headings.includes('Options'));
});
