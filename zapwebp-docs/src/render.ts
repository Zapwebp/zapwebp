import { marked } from 'marked';
import { DOC_ROUTES, ROUTE_MAP, DocRoute } from './routes';
import { t, getLocale } from './i18n';

export async function renderDoc(fileKey: string, mount: HTMLElement): Promise<void> {
  const locale = getLocale();
  let rawMarkdown = '';

  if (locale === 'tl') {
    try {
      const tlRes = await fetch(`/locales/tl/docs/${fileKey}.md`);
      if (tlRes.ok) {
        rawMarkdown = await tlRes.text();
      }
    } catch (_) {}
  }

  if (!rawMarkdown) {
    const mdUrl = `/content/${fileKey}.md`;
    const res = await fetch(mdUrl);
    if (!res.ok) {
      throw new Error(`Document not found: ${fileKey}`);
    }
    rawMarkdown = await res.text();
  }

  // Find route metadata
  const currentPath = location.pathname.replace(/\/$/, '') || '/';
  const route = ROUTE_MAP[currentPath] || DOC_ROUTES.find((r) => r.file === fileKey) || DOC_ROUTES[0];

  marked.setOptions({
    gfm: true,
    breaks: false
  });

  const parsedHtml = await marked.parse(rawMarkdown);

  // Clean mount
  mount.replaceChildren();

  // Temporary container to parse & transform DOM
  const temp = document.createElement('div');
  temp.innerHTML = parsedHtml;

  // 1. Process Scope Card (Covers, Excludes, Applies to)
  transformScopeCard(temp);

  // 2. Transform Admonitions / Callouts (> [!NOTE], etc.)
  transformCallouts(temp);

  // 3. Transform Tables with responsive wrappers
  transformTables(temp);

  // 4. Transform Code Blocks with robust single-pass syntax coloring & copy
  transformCodeBlocks(temp);

  // 5. Transform Headings & build Table of Contents
  const tocItems = transformHeadings(temp);

  // 6. Append transformed content
  while (temp.firstChild) {
    mount.appendChild(temp.firstChild);
  }

  // 7. Add Pagination (Prev / Next)
  appendPagination(mount, route);

  // 8. Add Article Footer (Clean open-source links, zero fake cloud feedback)
  appendArticleFooter(mount, fileKey);

  // 9. Update Breadcrumbs
  updateBreadcrumbs(route);

  // 10. Update Right TOC & ScrollSpy
  updateToc(tocItems, fileKey);

  // 11. Update document head metadata (Title, Description, Canonical, Schema.org JSON-LD)
  const h1 = mount.querySelector('h1');
  const h1Text = h1 ? h1.textContent?.trim() : undefined;
  updateHeadMetadata(route, h1Text);
}

/**
 * Dynamically updates document title, canonical link, description, and schema.org JSON-LD
 */
function updateHeadMetadata(route: DocRoute, h1Text?: string) {
  const pageTitle = h1Text ? `${h1Text} — Zapwebp Docs` : `${route.title} — Zapwebp Docs`;
  document.title = pageTitle;

  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.setAttribute('name', 'description');
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute('content', route.description);

  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', `https://zapwebp-docs.vercel.app${route.path}`);

  function setMeta(selector: string, attrName: string, attrVal: string, content: string) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  setMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  setMeta('meta[property="og:description"]', 'property', 'og:description', route.description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', `https://zapwebp-docs.vercel.app${route.path}`);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', route.description);

  let scriptLd = document.getElementById('zapwebp-schema-ld');
  if (!scriptLd) {
    scriptLd = document.createElement('script');
    scriptLd.id = 'zapwebp-schema-ld';
    scriptLd.setAttribute('type', 'application/ld+json');
    document.head.appendChild(scriptLd);
  }

  if (route.path === '/errors') {
    scriptLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'What is E_UNSAFE_SVG?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'The SVG contains a script tag, external reference, or entity expansion. Remove scripts or sanitize vector code.'
          }
        },
        {
          '@type': 'Question',
          'name': 'What is E_ALPHA_NOT_REPRESENTABLE?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Attempted to convert an image with transparency to a format without an alpha channel without specifying a background color.'
          }
        }
      ]
    });
  } else {
    scriptLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      'headline': h1Text || route.title,
      'description': route.description,
      'author': {
        '@type': 'Organization',
        'name': 'Zapwebp',
        'url': 'https://zapwebp.vercel.app'
      },
      'datePublished': '2025-11-01',
      'dateModified': '2026-11-04',
      'proficiencyLevel': 'Beginner'
    });
  }
}

/**
 * Parses the standard Zapwebp 3-clause header into a clean scope card
 */
function transformScopeCard(container: HTMLElement) {
  const paragraphs = Array.from(container.querySelectorAll('p'));
  let coversP: HTMLParagraphElement | null = null;
  let notCoverP: HTMLParagraphElement | null = null;
  let appliesP: HTMLParagraphElement | null = null;

  for (const p of paragraphs.slice(0, 6)) {
    const text = p.textContent?.trim() || '';
    if (text.startsWith('Covers:')) coversP = p;
    else if (text.startsWith('Does not cover:')) notCoverP = p;
    else if (text.startsWith('Applies to:')) appliesP = p;
  }

  if (coversP && notCoverP && appliesP) {
    const coversHtml = coversP.innerHTML.replace(/^Covers:\s*/i, '');
    const notCoverHtml = notCoverP.innerHTML.replace(/^Does not cover:\s*/i, '');
    const appliesHtml = appliesP.innerHTML.replace(/^Applies to:\s*/i, '');

    const card = document.createElement('div');
    card.className = 'docs-scope-card';
    card.innerHTML = `
      <div class="scope-row scope-covers">
        <div class="scope-label">
          <svg class="scope-icon check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>${t('scope.covers')}</span>
        </div>
        <div class="scope-text">${coversHtml}</div>
      </div>
      <div class="scope-row scope-excludes">
        <div class="scope-label">
          <svg class="scope-icon exclude-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line></svg>
          <span>${t('scope.excludes')}</span>
        </div>
        <div class="scope-text">${notCoverHtml}</div>
      </div>
      <div class="scope-row scope-applies">
        <div class="scope-label">
          <svg class="scope-icon tag-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          <span>${t('scope.applies')}</span>
        </div>
        <div class="scope-text"><span class="applies-badge">${appliesHtml}</span></div>
      </div>
    `;

    coversP.parentNode?.insertBefore(card, coversP);
    coversP.remove();
    notCoverP.remove();
    appliesP.remove();
  }
}

/**
 * Transforms GitHub style markdown callouts
 */
function transformCallouts(container: HTMLElement) {
  container.querySelectorAll('blockquote').forEach((bq) => {
    const text = bq.innerHTML.trim();
    const match = text.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*<br\s*\/?>)?([\s\S]*?)<\/p>$/i);
    if (match) {
      const type = match[1].toLowerCase();
      const body = match[2];
      const aside = document.createElement('aside');
      aside.className = `docs-callout callout-${type}`;
      aside.innerHTML = `
        <div class="callout-header">
          <span class="callout-badge">${match[1].toUpperCase()}</span>
        </div>
        <div class="callout-body">${body}</div>
      `;
      bq.replaceWith(aside);
    }
  });
}

/**
 * Wraps tables for horizontal scrolling and clean borders
 */
function transformTables(container: HTMLElement) {
  container.querySelectorAll('table').forEach((table) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'docs-table-wrap';
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

/**
 * Transforms code blocks with single-pass syntax coloring and copy functionality
 */
function transformCodeBlocks(container: HTMLElement) {
  container.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    const rawText = code ? code.innerText : pre.innerText;
    const classList = code ? code.className : '';
    const langMatch = classList.match(/language-(\w+)/);
    const lang = (langMatch ? langMatch[1] : inferLanguage(rawText)).toLowerCase();

    const card = document.createElement('div');
    card.className = 'code-card';

    // Single-pass syntax coloring
    const coloredHtml = highlightCode(rawText.trim(), lang);

    card.innerHTML = `
      <div class="code-card-header">
        <span class="code-lang-label">${escapeHtml(lang)}</span>
        <button type="button" class="code-copy-btn" aria-label="Copy code to clipboard">
          <svg class="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="copy-text">${t('code.copy')}</span>
        </button>
      </div>
      <div class="code-card-body">
        <pre><code class="code-content">${coloredHtml}</code></pre>
      </div>
    `;

    // Copy button listener
    const btn = card.querySelector('.code-copy-btn') as HTMLElement;
    btn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(rawText.trim()).then(() => {
        btn.classList.add('is-copied');
        const textSpan = btn.querySelector('.copy-text');
        if (textSpan) textSpan.textContent = t('code.copied');
        setTimeout(() => {
          btn.classList.remove('is-copied');
          if (textSpan) textSpan.textContent = t('code.copy');
        }, 1800);
      }).catch(() => {});
    });

    pre.replaceWith(card);
  });
}

function inferLanguage(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('npx ') || trimmed.startsWith('pnpm ') || trimmed.startsWith('npm ') || trimmed.startsWith('$')) return 'bash';
  if (trimmed.includes('import ') || trimmed.includes('export ')) return 'ts';
  return 'bash';
}

/**
 * 100% Safe, single-pass syntax highlighter.
 * Evaluates tokens sequentially in one pass to guarantee zero self-replacement bugs.
 */
function highlightCode(code: string, lang: string): string {
  const isJson = lang === 'json';

  const masterRegex = isJson
    ? /("(?:\\[\s\S]|[^"\\])*"\s*:)|("(?:\\[\s\S]|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?\b)/g
    : /(#[^\n]*|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^\s*[\$✓]\s+)|(--[a-zA-Z0-9_-]+|-[a-zA-Z])|(\b(?:npx|pnpm|npm|zapwebp|zap|node|git|curl)\b)|(\b(?:import|export|from|const|let|var|function|return|async|await|type|interface|true|false|null)\b)|(\b\d+\b)/gm;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const result: string[] = [];

  while ((match = masterRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result.push(escapeHtml(code.slice(lastIndex, match.index)));
    }

    if (isJson) {
      if (match[1]) {
        result.push(`<span class="tok-key">${escapeHtml(match[1])}</span>`);
      } else if (match[2]) {
        result.push(`<span class="tok-string">${escapeHtml(match[2])}</span>`);
      } else if (match[3]) {
        result.push(`<span class="tok-bool">${escapeHtml(match[3])}</span>`);
      } else if (match[4]) {
        result.push(`<span class="tok-number">${escapeHtml(match[4])}</span>`);
      }
    } else {
      if (match[1]) {
        result.push(`<span class="tok-comment">${escapeHtml(match[1])}</span>`);
      } else if (match[2]) {
        result.push(`<span class="tok-string">${escapeHtml(match[2])}</span>`);
      } else if (match[3]) {
        result.push(`<span class="tok-prompt">${escapeHtml(match[3])}</span>`);
      } else if (match[4]) {
        result.push(`<span class="tok-flag">${escapeHtml(match[4])}</span>`);
      } else if (match[5]) {
        result.push(`<span class="tok-cmd">${escapeHtml(match[5])}</span>`);
      } else if (match[6]) {
        result.push(`<span class="tok-keyword">${escapeHtml(match[6])}</span>`);
      } else if (match[7]) {
        result.push(`<span class="tok-number">${escapeHtml(match[7])}</span>`);
      }
    }

    lastIndex = masterRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    result.push(escapeHtml(code.slice(lastIndex)));
  }

  return result.join('');
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Enhances headings with anchor links and collects TOC list
 */
function transformHeadings(container: HTMLElement): TocItem[] {
  const items: TocItem[] = [];
  const headings = container.querySelectorAll('h2, h3');

  headings.forEach((h, index) => {
    let id = h.id;
    if (!id) {
      const text = h.textContent?.trim() || '';
      id = slugify(text) || `section-${index}`;
      h.id = id;
    }

    const level = parseInt(h.tagName.substring(1), 10);
    const text = h.textContent?.trim() || '';
    items.push({ id, text, level });

    // Anchor link icon
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${id}`;
    anchor.setAttribute('aria-label', `Permalink to ${text}`);
    anchor.innerHTML = '#';
    h.appendChild(anchor);

    // If section is "For agents", mark with agentic context banner
    if (text.toLowerCase() === 'for agents') {
      const agentBadge = document.createElement('div');
      agentBadge.className = 'agent-context-banner';
      agentBadge.innerHTML = `
        <span class="agent-dot"></span>
        <span class="agent-label">AI Agent Context &amp; Machine-Readable Schema</span>
      `;
      h.parentNode?.insertBefore(agentBadge, h.nextSibling);
    }
  });

  return items;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Appends Previous & Next page navigation buttons
 */
function appendPagination(mount: HTMLElement, currentRoute: DocRoute) {
  const currentIndex = DOC_ROUTES.findIndex((r) => r.path === currentRoute.path);
  if (currentIndex === -1) return;

  const prev = currentIndex > 0 ? DOC_ROUTES[currentIndex - 1] : null;
  const next = currentIndex < DOC_ROUTES.length - 1 ? DOC_ROUTES[currentIndex + 1] : null;

  if (!prev && !next) return;

  const nav = document.createElement('div');
  nav.className = 'docs-pagination-nav';
  nav.innerHTML = `
    ${
      prev
        ? `
      <a href="${prev.path}" class="pagination-card pagination-prev">
        <span class="pagination-sub">← ${t('pagination.prev')}</span>
        <span class="pagination-title">${t(`title.${prev.title}`)}</span>
      </a>
    `
        : '<div></div>'
    }
    ${
      next
        ? `
      <a href="${next.path}" class="pagination-card pagination-next">
        <span class="pagination-sub">${t('pagination.next')} →</span>
        <span class="pagination-title">${t(`title.${next.title}`)}</span>
      </a>
    `
        : '<div></div>'
    }
  `;

  mount.appendChild(nav);
}

/**
 * Appends comprehensive documentation sitemap and open-source governance footer
 */
function appendArticleFooter(mount: HTMLElement, fileKey: string) {
  const categories: Array<'Core' | 'Plugins' | 'Developers' | 'Platform'> = ['Core', 'Plugins', 'Developers', 'Platform'];

  const categoryHeaders: Record<string, string> = {
    Core: t('cat.Core') || 'Core Engine',
    Plugins: t('cat.Plugins') || 'Plugins & Frameworks',
    Developers: t('cat.Developers') || 'Developer SDKs & API',
    Platform: t('cat.Platform') || 'Platform & Legal',
  };

  const columnsHtml = categories
    .map((cat) => {
      const routesInCat = DOC_ROUTES.filter((r) => r.category === cat);
      const linksHtml = routesInCat
        .map(
          (r) => `
        <li>
          <a href="${r.path}" class="docs-footer-sitemap-link">
            <span>${t(`title.${r.title}`) || r.title}</span>
            ${r.badge ? `<span class="docs-footer-badge">${escapeHtml(r.badge)}</span>` : ''}
          </a>
        </li>
      `
        )
        .join('');

      return `
        <div class="docs-footer-col">
          <h4 class="docs-footer-col-title">${escapeHtml(categoryHeaders[cat])}</h4>
          <ul class="docs-footer-links-list">
            ${linksHtml}
          </ul>
        </div>
      `;
    })
    .join('');

  const footer = document.createElement('footer');
  footer.className = 'docs-comprehensive-footer';
  footer.innerHTML = `
    <!-- Helpful Article Meta Bar -->
    <div class="docs-article-meta-row">
      <div class="meta-left">
        <a href="/content/${fileKey}.md" target="_blank" rel="noopener noreferrer" class="meta-link" title="Inspect raw markdown source">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span>${t('footer.view_markdown')}</span>
        </a>
        <a href="https://github.com/Zapwebp/zapwebp/issues/new" target="_blank" rel="noopener noreferrer" class="meta-link" title="Open an issue on GitHub">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>${t('footer.github_issues')}</span>
        </a>
        <a href="https://github.com/Zapwebp/zapwebp/tree/main/locales" target="_blank" rel="noopener noreferrer" class="meta-link" title="Help translate Zapwebp docs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span>${t('footer.contribute_trans')}</span>
        </a>
      </div>
      <div class="meta-right">
        <a href="#main" class="meta-link back-to-top-btn" title="Back to top of article">
          <span>Back to Top</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </a>
      </div>
    </div>

    <!-- Full 4-Column Documentation Sitemap Grid -->
    <div class="docs-footer-sitemap-section">
      <div class="docs-footer-sitemap-header">
        <span class="sitemap-tag">Documentation Directory</span>
        <h3 class="sitemap-heading">Explore Zapwebp Architecture & Ecosystem</h3>
      </div>
      <div class="docs-footer-sitemap-grid">
        ${columnsHtml}
      </div>
    </div>

    <!-- Brand & Governance Trust Bar -->
    <div class="docs-footer-brand-bar">
      <div class="brand-bar-left">
        <a href="/docs" class="footer-brand-lockup">
          <img src="/zapwebp.svg" alt="Zapwebp" width="28" height="28" class="footer-logo" />
          <span class="footer-brand-text">Zapwebp Documentation</span>
        </a>
        <p class="footer-mission-text">
          Transparency-safe image conversion across developer terminals, AI agents, code editors, and browsers with zero server uploads.
        </p>
        <p class="footer-legal-text">
          Maintained by <strong>Eldrex Delos Reyes Bula</strong> · Republic of the Philippines · Licensed under <strong>MIT</strong>.
        </p>
      </div>
      <div class="brand-bar-right">
        <div class="footer-trust-chips">
          <span class="trust-chip">Zero Telemetry</span>
          <span class="trust-chip">100% In-Memory</span>
          <span class="trust-chip">Deterministic Alpha</span>
        </div>
        <div class="footer-outbound-links">
          <a href="https://zapwebp.vercel.app" class="outbound-link" target="_blank" rel="noopener noreferrer">Web Converter ↗</a>
          <a href="https://github.com/Zapwebp" class="outbound-link" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          <a href="https://www.npmjs.com/org/zapwebp" class="outbound-link" target="_blank" rel="noopener noreferrer">npm Registry ↗</a>
          <a href="https://open-vsx.org/extension/ebula/zapwebp-vscode" class="outbound-link" target="_blank" rel="noopener noreferrer">Open VSX ↗</a>
          <a href="/llms.txt" class="outbound-link" target="_blank" rel="noopener noreferrer">llms.txt ↗</a>
        </div>
      </div>
    </div>
  `;

  mount.appendChild(footer);
}

/**
 * Updates Breadcrumbs trail in header area
 */
function updateBreadcrumbs(route: DocRoute) {
  const bar = document.getElementById('docs-breadcrumbs');
  if (!bar) return;

  bar.innerHTML = `
    <a href="/docs" class="crumb-link">Docs</a>
    <span class="crumb-sep">/</span>
    <span class="crumb-cat">${t(`cat.${route.category}`)}</span>
    <span class="crumb-sep">/</span>
    <span class="crumb-current">${t(`title.${route.title}`)}</span>
  `;
}

let scrollSpyObserver: IntersectionObserver | null = null;

/**
 * Populates Right TOC sidebar and connects ScrollSpy
 */
function updateToc(items: TocItem[], fileKey: string) {
  const nav = document.getElementById('toc-nav');
  const viewSource = document.getElementById('toc-view-source') as HTMLAnchorElement;
  if (viewSource) {
    viewSource.href = `/content/${fileKey}.md`;
  }

  if (!nav) return;

  if (items.length === 0) {
    nav.innerHTML = '<div class="toc-empty">—</div>';
    return;
  }

  nav.innerHTML = items
    .map(
      (item) => `
    <a href="#${item.id}" class="toc-link toc-level-${item.level}" data-target="${item.id}">
      <span>${escapeHtml(item.text)}</span>
    </a>
  `
    )
    .join('');

  if (scrollSpyObserver) {
    scrollSpyObserver.disconnect();
  }

  const headingElements = items
    .map((item) => document.getElementById(item.id))
    .filter((el): el is HTMLElement => el !== null);

  if ('IntersectionObserver' in window && headingElements.length > 0) {
    scrollSpyObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          const id = visible.target.id;
          nav.querySelectorAll('.toc-link').forEach((link) => {
            const isMatch = link.getAttribute('data-target') === id;
            link.classList.toggle('is-active', isMatch);
          });
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    headingElements.forEach((h) => scrollSpyObserver?.observe(h));
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
