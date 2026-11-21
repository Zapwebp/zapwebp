'use strict';

/**
 * Creates a URL-friendly anchor slug from heading text.
 *
 * @param {string} text - Raw heading text
 * @returns {string} Slugified string
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '') // strip HTML tags
    .replace(/[^\w\s-]/g, '') // strip non-word chars except dash/space
    .replace(/\s+/g, '-') // collapse whitespace into dashes
    .replace(/-+/g, '-'); // collapse multiple dashes
}

/**
 * Parses simple YAML-like key-value frontmatter from Markdown.
 * Zero external dependencies.
 *
 * @param {string} text - Markdown file source
 * @returns {{ data: Record<string, any>, content: string }}
 */
function parseFrontmatter(text) {
  const source = String(text || '');
  if (!source.startsWith('---')) {
    return { data: {}, content: source };
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: source };
  }

  const rawYaml = match[1];
  const content = match[2];
  const data = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check array item: - item
    if (trimmed.startsWith('- ') && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(trimmed.slice(2).trim().replace(/^['"](.*)['"]$/, '$1'));
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      // String quotes removal
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      } else if (val === 'true') {
        val = true;
      } else if (val === 'false') {
        val = false;
      } else if (val === 'null' || val === '') {
        val = null;
      } else if (!isNaN(Number(val)) && val !== '') {
        val = Number(val);
      }

      currentKey = key;
      data[key] = val;
    }
  }

  return { data, content };
}

/**
 * Extracts metadata, scope declarations, headings, and inferred title/description.
 *
 * @param {string} rawSource - Markdown content
 * @param {string} [fallbackSlug=''] - Fallback name if no title found
 * @returns {{
 *   title: string,
 *   description: string,
 *   headings: Array<{ level: number, text: string, id: string }>,
 *   frontmatter: Record<string, any>,
 *   scope: { covers?: string, doesNotCover?: string, appliesTo?: string },
 *   body: string
 * }}
 */
function extractMetadata(rawSource, fallbackSlug = '') {
  const { data, content } = parseFrontmatter(rawSource);

  // Extract H1 title
  let title = data.title || '';
  if (!title) {
    const h1Match = content.match(/^#\s+([^\r\n]+)/m);
    if (h1Match) {
      title = h1Match[1].trim();
    } else if (fallbackSlug) {
      // e.g. "github-action" -> "Github Action"
      title = fallbackSlug
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    } else {
      title = 'Untitled';
    }
  }

  // Extract scope declaration (Covers / Does not cover / Applies to)
  const scope = {};
  const coversMatch = content.match(/Covers:\s*([^\r\n]+)/i);
  if (coversMatch) scope.covers = coversMatch[1].trim();

  const doesNotCoverMatch = content.match(/Does not cover:\s*([^\r\n]+)/i);
  if (doesNotCoverMatch) scope.doesNotCover = doesNotCoverMatch[1].trim();

  const appliesToMatch = content.match(/Applies to:\s*([^\r\n]+)/i);
  if (appliesToMatch) scope.appliesTo = appliesToMatch[1].trim();

  // Extract description
  let description = data.description || '';
  if (!description) {
    if (scope.covers) {
      description = `Covers: ${scope.covers}`;
    } else {
      // Find first non-empty paragraph that isn't a heading or code block
      const paragraphs = content
        .split(/\r?\n\r?\n/)
        .map((p) => p.trim())
        .filter(
          (p) =>
            p &&
            !p.startsWith('#') &&
            !p.startsWith('```') &&
            !p.startsWith('|') &&
            !p.startsWith('>')
        );

      if (paragraphs.length > 0) {
        description = paragraphs[0].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
        if (description.length > 200) {
          description = description.slice(0, 197) + '...';
        }
      }
    }
  }

  // Extract Headings for Table of Contents (levels 2 and 3)
  const headings = [];
  const headingRegex = /^(#{2,3})\s+([^\r\n]+)/gm;
  let hMatch;
  while ((hMatch = headingRegex.exec(content)) !== null) {
    const level = hMatch[1].length;
    const rawText = hMatch[2].trim();
    const cleanText = rawText.replace(/`([^`]+)`/g, '$1');
    const id = slugify(cleanText);
    headings.push({ level, text: cleanText, id });
  }

  return {
    title,
    description,
    headings,
    frontmatter: data,
    scope,
    body: content,
  };
}

module.exports = {
  slugify,
  parseFrontmatter,
  extractMetadata,
};
