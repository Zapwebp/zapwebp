'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify, parseFrontmatter, extractMetadata } = require('../src/frontmatter');

test('Frontmatter: slugify creates deterministic anchor IDs', () => {
  assert.equal(slugify('Quick start'), 'quick-start');
  assert.equal(slugify('What it does? (Overview)'), 'what-it-does-overview');
  assert.equal(slugify('Code `zapwebp` Tool'), 'code-zapwebp-tool');
  assert.equal(slugify('   Spaces and   Tabs  '), 'spaces-and-tabs');
});

test('Frontmatter: parseFrontmatter handles frontmatter blocks cleanly', () => {
  const md = `---
title: CLI Reference
description: "Terminal conversion tool"
draft: false
tags:
  - cli
  - terminal
---

# Main Content
Here is the body.`;

  const { data, content } = parseFrontmatter(md);
  assert.equal(data.title, 'CLI Reference');
  assert.equal(data.description, 'Terminal conversion tool');
  assert.equal(data.draft, false);
  assert.deepEqual(data.tags, ['cli', 'terminal']);
  assert.ok(content.includes('# Main Content'));
});

test('Frontmatter: extractMetadata infers title and description when frontmatter is omitted', () => {
  const md = `# Zapwebp API

Covers: REST endpoints, health check, and batch payloads.
Does not cover: CLI usage.
Applies to: v2.0.0+.

## Overview

The API runs locally.

### Sub-topic
Details here.`;

  const meta = extractMetadata(md, 'api');
  assert.equal(meta.title, 'Zapwebp API');
  assert.equal(meta.scope.covers, 'REST endpoints, health check, and batch payloads.');
  assert.equal(meta.scope.doesNotCover, 'CLI usage.');
  assert.equal(meta.scope.appliesTo, 'v2.0.0+.');
  assert.equal(meta.description, 'Covers: REST endpoints, health check, and batch payloads.');
  assert.equal(meta.headings.length, 2);
  assert.equal(meta.headings[0].text, 'Overview');
  assert.equal(meta.headings[0].id, 'overview');
  assert.equal(meta.headings[1].text, 'Sub-topic');
  assert.equal(meta.headings[1].id, 'sub-topic');
});

test('Frontmatter: extractMetadata falls back to slug when no H1 exists', () => {
  const md = `Just a plain file without headings.`;
  const meta = extractMetadata(md, 'github-action');
  assert.equal(meta.title, 'Github Action');
  assert.equal(meta.description, 'Just a plain file without headings.');
});
