'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STARTER_CONFIG = {
  title: 'My Project Docs',
  description: 'Fast, bot-crawlable documentation site powered by @zapwebp/docs.',
  url: 'https://example.com',
  author: {
    name: 'Author Name',
    url: 'https://example.com',
  },
  content: {
    dir: 'content',
    extensions: ['.md'],
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
  navigation: [
    { title: 'Getting Started', path: '/' },
  ],
};

const STARTER_INDEX_MD = `---
title: Getting Started
description: Welcome to your project documentation.
---

# Getting Started

Covers: quickstart, core concepts, installation, and deployment.

Does not cover: advanced internal architectures.

Applies to: v1.0.0+.

## Quick start

Welcome to your new documentation site powered by \`@zapwebp/docs\`.

\`\`\`bash
# Install dependencies
npm install

# Build static documentation site
npx zapwebp-docs build

# Preview site locally
npx zapwebp-docs serve
\`\`\`

## What it does

This documentation engine produces:
- Static HTML per page (zero framework, zero JavaScript required to read).
- Byte-for-byte Markdown mirrors for AI crawlers.
- \`llms.txt\` and \`llms-full.txt\` for LLM context ingestion.
- Machine-readable \`agent.json\` for autonomous agent discovery.
- Fully compliant \`sitemap.xml\` and \`robots.txt\`.

## Errors

| Code | Cause | Fix |
|---|---|---|
| \`E_CONFIG_NOT_FOUND\` | Missing configuration | Run \`zapwebp-docs init\` to create config |
`;

/**
 * Initializes a new documentation project in the target directory.
 *
 * @param {string} [targetDir=process.cwd()] - Project directory
 * @param {object} [options={}]
 * @returns {{ configCreated: boolean, contentCreated: boolean }}
 */
function initDocs(targetDir = process.cwd(), options = {}) {
  const configPath = path.join(targetDir, 'docs.config.json');
  const contentDir = path.join(targetDir, 'content');
  const indexPath = path.join(contentDir, 'index.md');

  let configCreated = false;
  let contentCreated = false;

  if (!fs.existsSync(configPath) || options.force) {
    fs.writeFileSync(configPath, JSON.stringify(STARTER_CONFIG, null, 2) + '\n', 'utf8');
    configCreated = true;
  }

  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  if (!fs.existsSync(indexPath) || options.force) {
    fs.writeFileSync(indexPath, STARTER_INDEX_MD, 'utf8');
    contentCreated = true;
  }

  return {
    configCreated,
    contentCreated,
    configPath,
    indexPath,
  };
}

module.exports = {
  initDocs,
  STARTER_CONFIG,
  STARTER_INDEX_MD,
};
