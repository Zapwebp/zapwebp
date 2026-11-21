'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('./config');
const { extractMetadata } = require('./frontmatter');
const { renderMarkdown } = require('./markdown');
const { renderPageHtml } = require('./template');
const { generateLlmsTxt, generateLlmsFullTxt } = require('./generators/llms');
const { generateSitemap } = require('./generators/sitemap');
const { generateRobotsTxt } = require('./generators/robots');
const { generateAgentJson } = require('./generators/agent');
const { generateSearchIndex } = require('./generators/search');

/**
 * Recursively discovers all markdown files within a directory.
 *
 * @param {string} dir - Directory to scan
 * @param {string} [baseDir=dir] - Root directory for calculating relative paths
 * @param {string[]} [extensions=['.md']] - File extensions to match
 * @returns {string[]} List of absolute file paths
 */
function discoverMarkdownFiles(dir, baseDir = dir, extensions = ['.md']) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // ignore hidden files
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...discoverMarkdownFiles(fullPath, baseDir, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Ensures directory exists synchronously.
 *
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Copies a directory recursively.
 *
 * @param {string} src
 * @param {string} dest
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Executes the complete documentation build pipeline.
 *
 * @param {string|Record<string, any>} [configOrPath] - Config file path or object
 * @param {Record<string, any>} [cliOverrides={}] - Command-line overrides
 * @param {string} [cwd=process.cwd()] - Current working directory
 * @returns {Promise<{
 *   success: boolean,
 *   pageCount: number,
 *   distDir: string,
 *   durationMs: number,
 *   pages: Array<Record<string, any>>
 * }>}
 */
async function buildDocs(configOrPath, cliOverrides = {}, cwd = process.cwd()) {
  const startTime = Date.now();
  const config = loadConfig(configOrPath, cliOverrides, cwd);

  const contentDir = config.content.resolvedDir;
  const distDir = config.output.resolvedDir;

  ensureDir(distDir);

  // 1. Discover all markdown files
  const mdFiles = discoverMarkdownFiles(contentDir, contentDir, config.content.extensions || ['.md']);

  if (!mdFiles.length) {
    // If no markdown files found, warn and return early
    console.warn(`[docs] Warning: No markdown files found in ${contentDir}`);
  }

  // 2. Parse frontmatter & metadata for all pages
  const parsedPages = [];

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const relToContent = path.relative(contentDir, filePath).replace(/\\/g, '/');
    const withoutExt = relToContent.replace(/\.md$/i, '');

    // Normalize route path:
    // "index" -> "/"
    // "cli" -> "/cli"
    // "plugins/vite" -> "/plugins/vite"
    const routePath = withoutExt === 'index' ? '/' : `/${withoutExt}`;
    const markdownPath = `/${relToContent}`;

    const meta = extractMetadata(raw, path.basename(withoutExt));

    parsedPages.push({
      filePath,
      relPath: relToContent,
      routePath,
      markdownPath,
      title: meta.title,
      description: meta.description,
      headings: meta.headings,
      scope: meta.scope,
      frontmatter: meta.frontmatter,
      priority: meta.frontmatter?.priority,
      rawBody: raw,
      body: meta.body,
    });
  }

  // 3. Resolve Navigation Ordering
  // If config.navigation is provided, respect its ordering; otherwise root '/' first then alphabetical
  const navOrder = (config.navigation || []).map((n) => n.path);
  parsedPages.sort((a, b) => {
    if (a.routePath === '/') return -1;
    if (b.routePath === '/') return 1;

    const idxA = navOrder.indexOf(a.routePath);
    const idxB = navOrder.indexOf(b.routePath);

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    return a.routePath.localeCompare(b.routePath);
  });

  // If config.navigation was empty, synthesize it from top-level discovered pages
  if (!config.navigation || !config.navigation.length) {
    config.navigation = parsedPages.map((p) => ({
      title: p.title,
      path: p.routePath,
    }));
  }

  // 4. Render Pages & Write HTML + Markdown Mirrors
  for (let i = 0; i < parsedPages.length; i++) {
    const page = parsedPages[i];
    const prevPage = i > 0 ? { title: parsedPages[i - 1].title, path: parsedPages[i - 1].routePath } : null;
    const nextPage = i < parsedPages.length - 1 ? { title: parsedPages[i + 1].title, path: parsedPages[i + 1].routePath } : null;

    // Render markdown to HTML
    const articleHtml = renderMarkdown(page.body);

    // Wrap in full HTML page
    const fullHtml = renderPageHtml({
      title: page.title,
      description: page.description,
      contentHtml: articleHtml,
      routePath: page.routePath,
      markdownPath: page.markdownPath,
      headings: page.headings,
      prevPage,
      nextPage,
      config,
    });

    // Determine output file paths
    let htmlFile;
    if (page.routePath === '/') {
      htmlFile = path.join(distDir, 'index.html');
    } else {
      // Clean URLs: dist/<path>/index.html
      const subDir = path.join(distDir, page.routePath.slice(1));
      ensureDir(subDir);
      htmlFile = path.join(subDir, 'index.html');

      // Also generate direct .html file for hosts without subfolder index support
      const directHtml = path.join(distDir, `${page.routePath.slice(1)}.html`);
      ensureDir(path.dirname(directHtml));
      fs.writeFileSync(directHtml, fullHtml, 'utf8');
    }

    fs.writeFileSync(htmlFile, fullHtml, 'utf8');

    // Write Markdown Mirror: dist/<path>.md (exact byte-for-byte source for AI agents)
    const mirrorMdPath = path.join(distDir, page.relPath);
    ensureDir(path.dirname(mirrorMdPath));
    fs.writeFileSync(mirrorMdPath, page.rawBody, 'utf8');
  }

  // 5. Generate llms.txt & llms-full.txt
  if (config.output.llmsTxt !== false) {
    const llmsContent = generateLlmsTxt(
      parsedPages.map((p) => ({
        title: p.title,
        description: p.description,
        path: p.routePath,
        markdownPath: p.markdownPath,
      })),
      config
    );
    fs.writeFileSync(path.join(distDir, 'llms.txt'), llmsContent, 'utf8');

    const llmsFull = generateLlmsFullTxt(
      parsedPages.map((p) => ({
        title: p.title,
        body: p.rawBody,
        path: p.routePath,
      })),
      config
    );
    fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFull, 'utf8');
  }

  // 6. Generate sitemap.xml
  if (config.output.sitemap !== false) {
    const sitemapContent = generateSitemap(
      parsedPages.map((p) => ({ path: p.routePath, priority: p.priority })),
      config
    );
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent, 'utf8');
  }

  // 7. Generate robots.txt
  if (config.output.robots !== false) {
    const robotsContent = generateRobotsTxt(config);
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsContent, 'utf8');
  }

  // 8. Generate agent.json
  if (config.output.agentJson !== false) {
    const agentContent = generateAgentJson(
      parsedPages.map((p) => ({
        title: p.title,
        description: p.description,
        path: p.routePath,
        markdownPath: p.markdownPath,
        headings: p.headings,
      })),
      config
    );
    fs.writeFileSync(path.join(distDir, 'agent.json'), agentContent, 'utf8');
  }

  // 9. Generate search-index.json
  if (config.output.searchIndex !== false) {
    const searchContent = generateSearchIndex(
      parsedPages.map((p) => ({
        title: p.title,
        description: p.description,
        path: p.routePath,
        headings: p.headings,
        body: p.body,
      }))
    );
    fs.writeFileSync(path.join(distDir, 'search-index.json'), searchContent, 'utf8');
  }

  // 10. Copy built-in and configured assets
  const assetsDir = path.join(__dirname, 'assets');
  fs.copyFileSync(path.join(assetsDir, 'docs.css'), path.join(distDir, 'docs.css'));
  fs.copyFileSync(path.join(assetsDir, 'docs.js'), path.join(distDir, 'docs.js'));

  // Copy theme tokens if specified
  if (config.theme?.tokens) {
    const tokenPath = path.isAbsolute(config.theme.tokens)
      ? config.theme.tokens
      : path.resolve(cwd, config.theme.tokens);

    if (fs.existsSync(tokenPath)) {
      const destToken = path.join(distDir, path.basename(tokenPath));
      fs.copyFileSync(tokenPath, destToken);
    }
  }

  // Copy custom CSS if specified as a local file
  if (config.theme?.customCss) {
    const customCssPath = path.isAbsolute(config.theme.customCss)
      ? config.theme.customCss
      : path.resolve(cwd, config.theme.customCss);

    if (fs.existsSync(customCssPath)) {
      const destCss = path.join(distDir, path.basename(customCssPath));
      fs.copyFileSync(customCssPath, destCss);
    }
  }

  // Copy configured assets directory (defaults to public/) if exists
  const assetsSrc = config.assets?.dir
    ? (path.isAbsolute(config.assets.dir) ? config.assets.dir : path.resolve(cwd, config.assets.dir))
    : path.resolve(cwd, 'public');

  if (fs.existsSync(assetsSrc) && assetsSrc !== distDir) {
    copyDir(assetsSrc, distDir);
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    pageCount: parsedPages.length,
    distDir,
    durationMs,
    pages: parsedPages.map((p) => ({
      title: p.title,
      route: p.routePath,
      markdown: p.markdownPath,
    })),
  };
}

module.exports = {
  discoverMarkdownFiles,
  buildDocs,
};
