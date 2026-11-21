'use strict';

const { loadConfig, DEFAULT_CONFIG, deepMerge } = require('./config');
const { parseFrontmatter, extractMetadata, slugify } = require('./frontmatter');
const { renderMarkdown, createMarkdownRenderer, escapeHtml } = require('./markdown');
const { renderPageHtml, renderBreadcrumbs, renderTableOfContents, renderPagination } = require('./template');
const { generateLlmsTxt, generateLlmsFullTxt } = require('./generators/llms');
const { generateSitemap } = require('./generators/sitemap');
const { generateRobotsTxt } = require('./generators/robots');
const { generateAgentJson } = require('./generators/agent');
const { generateSearchIndex, extractSearchableText } = require('./generators/search');
const { buildDocs, discoverMarkdownFiles } = require('./builder');
const { serveDocs, MIME_TYPES } = require('./server');
const { initDocs, STARTER_CONFIG, STARTER_INDEX_MD } = require('./init');

exports.loadConfig = loadConfig;
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.deepMerge = deepMerge;

exports.parseFrontmatter = parseFrontmatter;
exports.extractMetadata = extractMetadata;
exports.slugify = slugify;

exports.renderMarkdown = renderMarkdown;
exports.createMarkdownRenderer = createMarkdownRenderer;
exports.escapeHtml = escapeHtml;

exports.renderPageHtml = renderPageHtml;
exports.renderBreadcrumbs = renderBreadcrumbs;
exports.renderTableOfContents = renderTableOfContents;
exports.renderPagination = renderPagination;

exports.generateLlmsTxt = generateLlmsTxt;
exports.generateLlmsFullTxt = generateLlmsFullTxt;
exports.generateSitemap = generateSitemap;
exports.generateRobotsTxt = generateRobotsTxt;
exports.generateAgentJson = generateAgentJson;
exports.generateSearchIndex = generateSearchIndex;
exports.extractSearchableText = extractSearchableText;

exports.buildDocs = buildDocs;
exports.discoverMarkdownFiles = discoverMarkdownFiles;

exports.serveDocs = serveDocs;
exports.MIME_TYPES = MIME_TYPES;

exports.initDocs = initDocs;
exports.STARTER_CONFIG = STARTER_CONFIG;
exports.STARTER_INDEX_MD = STARTER_INDEX_MD;

exports.default = buildDocs;
