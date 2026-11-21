/**
 * @zapwebp/docs progressive enhancement runtime.
 * Zero-framework, fully vanilla, lightweight (< 4KB).
 */
(function () {
  'use strict';

  // --- 1. Theme Management ---
  const storageKey = 'docs-theme-pref';
  function initTheme() {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    let next = 'dark';
    if (current === 'dark') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      next = prefersDark ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(storageKey, next);
  }

  initTheme();

  // --- 2. Copy Code Buttons ---
  function initCodeCopy() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;

      const codeBlock = btn.closest('.code-block');
      const textToCopy = btn.getAttribute('data-code') || (codeBlock ? codeBlock.querySelector('code')?.innerText : '');

      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(function () {
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.innerText = originalText;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(function () {
        btn.innerText = 'Error';
      });
    });
  }

  // --- 3. Mobile Navigation Menu Toggle ---
  function initMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.querySelector('.docs-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // --- 4. Search Modal & Client-Side Search ---
  let searchIndex = null;
  let isFetchingIndex = false;

  function loadSearchIndex() {
    if (searchIndex || isFetchingIndex) return Promise.resolve(searchIndex);
    isFetchingIndex = true;
    return fetch('/search-index.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load search index');
        return res.json();
      })
      .then(function (data) {
        searchIndex = data;
        isFetchingIndex = false;
        return data;
      })
      .catch(function (err) {
        console.warn('Docs search index not available:', err);
        isFetchingIndex = false;
        return [];
      });
  }

  function initSearch() {
    const trigger = document.getElementById('search-trigger');
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const closeBtn = document.getElementById('search-close');
    const backdrop = modal?.querySelector('.search-modal-backdrop');

    if (!modal || !input) return;

    function openSearch() {
      modal.removeAttribute('hidden');
      input.value = '';
      resultsContainer.innerHTML = '<div class="search-empty">Type a query to search documentation...</div>';
      input.focus();
      loadSearchIndex();
    }

    function closeSearch() {
      modal.setAttribute('hidden', '');
    }

    if (trigger) trigger.addEventListener('click', openSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);
    if (backdrop) backdrop.addEventListener('click', closeSearch);

    // Keyboard Shortcuts: '/' or 'Ctrl+K' / 'Cmd+K' to open, 'Escape' to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
        closeSearch();
      } else if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        openSearch();
      }
    });

    let debounceTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      const query = input.value.trim().toLowerCase();

      if (!query) {
        resultsContainer.innerHTML = '<div class="search-empty">Type a query to search documentation...</div>';
        return;
      }

      debounceTimer = setTimeout(function () {
        loadSearchIndex().then(function (items) {
          if (!items || !items.length) {
            resultsContainer.innerHTML = '<div class="search-empty">No documentation pages found.</div>';
            return;
          }

          const matched = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const titleMatch = (item.title || '').toLowerCase().includes(query);
            const descMatch = (item.description || '').toLowerCase().includes(query);
            const textMatch = (item.text || '').toLowerCase().includes(query);
            const headingMatch = (item.headings || []).some(function (h) {
              return h.toLowerCase().includes(query);
            });

            if (titleMatch || descMatch || textMatch || headingMatch) {
              matched.push({
                item: item,
                score: (titleMatch ? 10 : 0) + (headingMatch ? 5 : 0) + (descMatch ? 3 : 0) + 1,
              });
            }
          }

          matched.sort(function (a, b) {
            return b.score - a.score;
          });

          if (!matched.length) {
            resultsContainer.innerHTML = '<div class="search-empty">No results found for "<b>' + escapeHtml(query) + '</b>".</div>';
            return;
          }

          const html = matched.slice(0, 10).map(function (res) {
            const p = res.item;
            return (
              '<a href="' + p.path + '" class="search-item">' +
                '<div class="search-item-title">' + escapeHtml(p.title) + '</div>' +
                (p.description ? '<div class="search-item-desc">' + escapeHtml(p.description) + '</div>' : '') +
              '</a>'
            );
          }).join('');

          resultsContainer.innerHTML = html;
        });
      }, 150);
    });

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }
  }

  // Initialize all listeners when DOM is loaded
  document.addEventListener('DOMContentLoaded', function () {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    initCodeCopy();
    initMobileMenu();
    initSearch();
  });
})();
