'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Default configuration values for the docs engine.
 */
const DEFAULT_CONFIG = {
  title: 'Documentation',
  tagline: '',
  description: '',
  url: 'http://localhost:3000',
  lang: 'en',
  author: {
    name: 'Author',
    url: '',
    email: '',
  },
  content: {
    dir: 'content',
    extensions: ['.md'],
    ignore: [],
  },
  output: {
    dir: 'dist',
    html: true,
    markdown: true,
    llmsTxt: true,
    sitemap: true,
    robots: true,
    agentJson: true,
    searchIndex: true,
  },
  assets: {
    dir: 'public',
  },
  head: [],
  theme: {
    tokens: '',
    docsCss: '',
    logo: '',
    icon: '',
    favicon: '',
    font: 'Inter, system-ui, -apple-system, sans-serif',
    accentColor: '#22c55e',
    github: '',
    customCss: '',
    searchPlaceholder: 'Search docs...',
  },
  navigation: [],
  footer: {
    copyright: '© ' + new Date().getFullYear(),
    license: 'MIT',
  },
};

/**
 * Deeply merges a source object into a target object.
 *
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @returns {Record<string, any>}
 */
function deepMerge(target, source) {
  const result = { ...target };
  if (!source || typeof source !== 'object') return result;

  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val !== undefined) {
      if (
        val &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/**
 * Loads and validates documentation configuration from a file or object.
 *
 * @param {string|Record<string, any>} [configOrPath] - Config file path or raw config object
 * @param {Record<string, any>} [cliOverrides={}] - Command-line overrides
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Record<string, any>} Fully resolved configuration
 */
function loadConfig(configOrPath, cliOverrides = {}, cwd = process.cwd()) {
  let fileConfig = {};

  if (typeof configOrPath === 'string') {
    const resolvedPath = path.isAbsolute(configOrPath)
      ? configOrPath
      : path.resolve(cwd, configOrPath);

    if (fs.existsSync(resolvedPath)) {
      try {
        const raw = fs.readFileSync(resolvedPath, 'utf8');
        fileConfig = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Failed to parse docs configuration at ${resolvedPath}: ${err.message}`);
      }
    }
  } else if (configOrPath && typeof configOrPath === 'object') {
    fileConfig = configOrPath;
  } else {
    // Check default locations
    const defaultFile = path.resolve(cwd, 'docs.config.json');
    if (fs.existsSync(defaultFile)) {
      try {
        const raw = fs.readFileSync(defaultFile, 'utf8');
        fileConfig = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Failed to parse docs.config.json at ${defaultFile}: ${err.message}`);
      }
    }
  }

  // Merge default -> file -> CLI overrides
  let resolved = deepMerge(DEFAULT_CONFIG, fileConfig);
  if (cliOverrides && typeof cliOverrides === 'object') {
    resolved = deepMerge(resolved, cliOverrides);
  }

  // Normalize paths relative to cwd
  resolved.content.resolvedDir = path.isAbsolute(resolved.content.dir)
    ? resolved.content.dir
    : path.resolve(cwd, resolved.content.dir);

  resolved.output.resolvedDir = path.isAbsolute(resolved.output.dir)
    ? resolved.output.dir
    : path.resolve(cwd, resolved.output.dir);

  // Normalize URL trailing slash (strip it)
  if (resolved.url && resolved.url.endsWith('/')) {
    resolved.url = resolved.url.slice(0, -1);
  }

  return resolved;
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  deepMerge,
};
