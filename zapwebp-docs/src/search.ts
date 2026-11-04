import { DOC_ROUTES, DocRoute } from './routes';

export interface SearchMatch {
  route: DocRoute;
  matchedField: 'title' | 'keyword' | 'description' | 'category';
  snippet: string;
}

export function searchDocs(query: string): SearchMatch[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const results: SearchMatch[] = [];

  for (const route of DOC_ROUTES) {
    const titleLower = route.title.toLowerCase();
    const descLower = route.description.toLowerCase();
    const catLower = route.category.toLowerCase();

    if (titleLower.includes(clean)) {
      results.push({
        route,
        matchedField: 'title',
        snippet: route.title
      });
      continue;
    }

    const matchedKw = route.keywords.find((k) => k.toLowerCase().includes(clean));
    if (matchedKw) {
      results.push({
        route,
        matchedField: 'keyword',
        snippet: `Keyword: ${matchedKw}`
      });
      continue;
    }

    if (descLower.includes(clean)) {
      results.push({
        route,
        matchedField: 'description',
        snippet: route.description
      });
      continue;
    }

    if (catLower.includes(clean)) {
      results.push({
        route,
        matchedField: 'category',
        snippet: `Category: ${route.category}`
      });
    }
  }

  return results.slice(0, 8);
}

export function initSearchModal(navigateFn: (path: string) => void): {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
} {
  const modal = document.getElementById('search-modal') as HTMLElement;
  const input = document.getElementById('search-input') as HTMLInputElement;
  const resultsContainer = document.getElementById('search-results') as HTMLElement;
  let selectedIndex = 0;
  let currentMatches: SearchMatch[] = [];

  function renderResults() {
    if (!resultsContainer) return;

    if (currentMatches.length === 0) {
      const q = input?.value.trim();
      resultsContainer.innerHTML = q
        ? `<div class="search-empty">No documentation pages found for "<strong>${escapeHtml(q)}</strong>"</div>`
        : `<div class="search-empty">Type a command, format, or topic to search...</div>`;
      return;
    }

    resultsContainer.innerHTML = currentMatches
      .map((match, idx) => {
        const isSelected = idx === selectedIndex;
        return `
          <div class="search-item ${isSelected ? 'is-selected' : ''}" data-idx="${idx}" data-path="${match.route.path}">
            <div class="search-item-header">
              <span class="search-item-title">${escapeHtml(match.route.title)}</span>
              <span class="search-item-cat">${escapeHtml(match.route.category)}</span>
            </div>
            <div class="search-item-desc">${escapeHtml(match.route.description)}</div>
          </div>
        `;
      })
      .join('');

    // Wire clicks
    resultsContainer.querySelectorAll('.search-item').forEach((el) => {
      el.addEventListener('click', () => {
        const path = el.getAttribute('data-path');
        if (path) {
          navigateFn(path);
          close();
        }
      });
    });
  }

  function open() {
    if (!modal) return;
    modal.hidden = false;
    modal.classList.add('is-open');
    if (input) {
      input.value = '';
      input.focus();
    }
    currentMatches = DOC_ROUTES.slice(0, 6).map((route) => ({
      route,
      matchedField: 'title',
      snippet: route.title
    }));
    selectedIndex = 0;
    renderResults();
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function isOpen(): boolean {
    return modal ? !modal.hidden : false;
  }

  if (input) {
    input.addEventListener('input', () => {
      const q = input.value;
      currentMatches = q.trim() ? searchDocs(q) : DOC_ROUTES.slice(0, 6).map((route) => ({
        route,
        matchedField: 'title',
        snippet: route.title
      }));
      selectedIndex = 0;
      renderResults();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentMatches.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentMatches.length;
          renderResults();
          ensureSelectedVisible();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentMatches.length > 0) {
          selectedIndex = (selectedIndex - 1 + currentMatches.length) % currentMatches.length;
          renderResults();
          ensureSelectedVisible();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = currentMatches[selectedIndex];
        if (selected) {
          navigateFn(selected.route.path);
          close();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });
  }

  function ensureSelectedVisible() {
    const active = resultsContainer?.querySelector('.search-item.is-selected') as HTMLElement;
    if (active && resultsContainer) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  // Backdrop click to dismiss
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      close();
    }
  });

  // Global hotkeys (Ctrl+K, Cmd+K, /)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (isOpen()) close();
      else open();
    } else if (e.key === '/' && !isOpen()) {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        open();
      }
    } else if (e.key === 'Escape' && isOpen()) {
      close();
    }
  });

  return { open, close, isOpen };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

