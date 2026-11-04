import { DOC_ROUTES } from './routes';
import { t, getLocale, setLocale, getLocales, onLocaleChange } from './i18n';
import { getTheme, toggleTheme, onThemeChange } from './theme';

export function shell(content: HTMLElement): HTMLElement {
  const root = document.createElement('div');
  root.className = 'docs-app-container';

  // 1. Minimal Header
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="header-inner">
      <div class="header-left">
        <button type="button" class="mobile-toggle-btn" id="mobile-toggle-btn" aria-label="Toggle navigation drawer" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <a href="/docs" class="brand-link" aria-label="Zapwebp Documentation Home">
          <img src="/zapwebp.svg" alt="Zapwebp" class="brand-logo" width="24" height="24" />
          <span class="brand-name">Zapwebp</span>
          <span class="brand-badge">Docs</span>
        </a>
      </div>

      <div class="header-center">
        <button type="button" class="search-trigger-btn" id="search-trigger-btn" aria-label="Search documentation (Press Ctrl+K)">
          <svg class="search-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span class="search-btn-text" id="search-btn-label">${t('header.search_placeholder')}</span>
          <kbd class="search-btn-kbd">Ctrl K</kbd>
        </button>
      </div>

      <div class="header-right">
        <!-- Accessible Language Dropdown -->
        <div class="lang-dropdown-wrap" id="lang-dropdown-wrap">
          <button type="button" class="control-btn lang-dropdown-btn" id="lang-dropdown-btn" aria-haspopup="true" aria-expanded="false" title="${t('header.language')}">
            <svg class="globe-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span class="lang-current-label" id="lang-current-label">${getLocale() === 'tl' ? 'Tagalog' : 'English'}</span>
            <svg class="chevron-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="lang-dropdown-menu" id="lang-dropdown-menu" hidden>
            <div class="dropdown-header">
              <span>${t('header.language')}</span>
            </div>
            <div class="dropdown-items-group" id="lang-options-group">
              <!-- Dynamically populated from SUPPORTED_LOCALES -->
            </div>
            <div class="dropdown-divider"></div>
            <a href="https://github.com/Zapwebp/zapwebp/tree/main/locales" target="_blank" rel="noopener noreferrer" class="dropdown-item dropdown-item-contribute">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>${t('header.contribute_translation')}</span>
              <span class="ext-arrow">↗</span>
            </a>
          </div>
        </div>

        <!-- Theme Toggle (Dark / Light) -->
        <button type="button" class="control-btn theme-btn" id="theme-toggle-btn" aria-label="${t('header.theme_toggle')}" title="${t('header.theme_toggle')}">
          <svg class="theme-icon icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg class="theme-icon icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <!-- GitHub Link -->
        <a href="https://github.com/Zapwebp" class="control-btn github-btn" target="_blank" rel="noopener noreferrer" aria-label="View Source on GitHub" title="View Source on GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
        </a>

        <!-- Web Converter -->
        <a href="https://zapwebp.vercel.app" class="header-converter-btn" aria-label="Open Web Converter">
          <span>${t('header.converter')}</span>
          <span class="btn-arrow">↗</span>
        </a>
      </div>
    </div>
  `;

  // 2. Mobile Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'sidebar-backdrop';
  backdrop.className = 'sidebar-backdrop';

  // 3. Left Navigation Sidebar
  const sidebar = document.createElement('aside');
  sidebar.id = 'docs-sidebar';
  sidebar.className = 'docs-sidebar';

  // Mobile drawer controls
  const toggleBtn = header.querySelector('#mobile-toggle-btn') as HTMLElement;
  const toggleDrawer = (open?: boolean) => {
    const isOpen = open !== undefined ? open : !sidebar.classList.contains('is-open');
    sidebar.classList.toggle('is-open', isOpen);
    backdrop.classList.toggle('is-open', isOpen);
    toggleBtn?.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggleBtn?.addEventListener('click', () => toggleDrawer());
  backdrop?.addEventListener('click', () => toggleDrawer(false));

  function renderSidebarContent() {
    const categories = ['Core', 'Plugins', 'Developers', 'Platform'] as const;
    const groups: Record<string, typeof DOC_ROUTES> = {};
    for (const cat of categories) {
      groups[cat] = DOC_ROUTES.filter((r) => r.category === cat);
    }

    const navHtml = categories
      .map((cat) => {
        const items = groups[cat] || [];
        const linksHtml = items
          .map((route) => {
            const translatedTitle = t(`title.${route.title}`);
            const badgeHtml = route.badge ? `<span class="nav-item-badge">${route.badge}</span>` : '';
            return `
              <a href="${route.path}" class="sidebar-link" data-path="${route.path}">
                <span class="link-label">${translatedTitle}</span>
                ${badgeHtml}
              </a>
            `;
          })
          .join('');

        return `
          <div class="sidebar-section" data-cat="${cat}">
            <div class="sidebar-section-header">
              <span class="section-title-text">${t(`cat.${cat}`)}</span>
              <span class="section-count">${items.length}</span>
            </div>
            <div class="sidebar-section-links">
              ${linksHtml}
            </div>
          </div>
        `;
      })
      .join('');

    sidebar.innerHTML = `
      <div class="sidebar-filter-wrap">
        <svg class="filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="search" id="sidebar-filter-input" class="sidebar-filter-input" placeholder="${t('sidebar.filter_placeholder')}" autocomplete="off" aria-label="Filter navigation links" />
      </div>

      <nav class="sidebar-nav" aria-label="Documentation Categories">
        ${navHtml}
      </nav>

      <div class="sidebar-footer">
        <a href="/llms.txt" class="sidebar-footer-link" target="_blank" rel="noopener noreferrer">
          <span class="footer-icon">🤖</span>
          <span>${t('sidebar.llms_context')}</span>
        </a>
        <div class="sidebar-shortcut-hint">
          <span>${t('sidebar.quick_search')}</span>
          <kbd class="shortcut-kbd">/</kbd>
        </div>
      </div>
    `;

    // Rebind filter input
    const filterInput = sidebar.querySelector('#sidebar-filter-input') as HTMLInputElement;
    if (filterInput) {
      filterInput.addEventListener('input', () => {
        const q = filterInput.value.trim().toLowerCase();
        sidebar.querySelectorAll('.sidebar-link').forEach((link) => {
          const text = link.textContent?.toLowerCase() || '';
          const match = !q || text.includes(q);
          (link as HTMLElement).style.display = match ? 'flex' : 'none';
        });

        sidebar.querySelectorAll('.sidebar-section').forEach((sec) => {
          const visibleLinks = sec.querySelectorAll('.sidebar-link:not([style*="display: none"])');
          (sec as HTMLElement).style.display = visibleLinks.length > 0 ? 'block' : 'none';
        });
      });
    }

    // Restore active link and close drawer on mobile navigation
    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    sidebar.querySelectorAll('.sidebar-link').forEach((link) => {
      const href = link.getAttribute('data-path') || link.getAttribute('href');
      const isCurrent = href === currentPath || (currentPath === '/' && href === '/docs');
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('is-active');
      }
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          toggleDrawer(false);
        }
      });
    });
  }

  renderSidebarContent();

  // 4. Center Content & Right Table of Contents
  const mainWrap = document.createElement('main');
  mainWrap.id = 'main';
  mainWrap.className = 'docs-main-layout';

  const contentColumn = document.createElement('div');
  contentColumn.className = 'docs-content-column';

  // Breadcrumbs
  const breadcrumbBar = document.createElement('nav');
  breadcrumbBar.id = 'docs-breadcrumbs';
  breadcrumbBar.className = 'docs-breadcrumbs';
  breadcrumbBar.setAttribute('aria-label', 'Breadcrumb');
  contentColumn.appendChild(breadcrumbBar);

  contentColumn.appendChild(content);

  // Right Table of Contents Sidebar
  const tocAside = document.createElement('aside');
  tocAside.id = 'docs-toc-container';
  tocAside.className = 'docs-toc-aside';
  tocAside.innerHTML = `
    <div class="toc-sticky-box">
      <div class="toc-header">
        <svg class="toc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <span id="toc-header-text">${t('toc.on_this_page')}</span>
      </div>
      <nav id="toc-nav" class="toc-nav-list" aria-label="On this page navigation"></nav>
      <div class="toc-footer-actions">
        <a href="#top" id="toc-back-to-top" class="toc-action-link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
          <span id="toc-back-text">${t('toc.back_to_top')}</span>
        </a>
        <a id="toc-view-source" class="toc-action-link" target="_blank" rel="noopener noreferrer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span id="toc-view-text">${t('toc.view_source')}</span>
        </a>
      </div>
    </div>
  `;

  mainWrap.appendChild(contentColumn);
  mainWrap.appendChild(tocAside);

  // 5. Search Modal Dialog
  const searchModal = document.createElement('div');
  searchModal.id = 'search-modal';
  searchModal.className = 'search-modal-backdrop';
  searchModal.hidden = true;
  searchModal.innerHTML = `
    <div class="search-modal-dialog" role="dialog" aria-modal="true" aria-label="Search documentation">
      <div class="search-input-header">
        <svg class="modal-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="search" id="search-input" class="search-dialog-input" placeholder="${t('header.search_placeholder')}" autocomplete="off" />
        <kbd class="modal-esc-kbd">ESC</kbd>
      </div>
      <div id="search-results" class="search-results-list"></div>
      <div class="search-modal-footer">
        <div class="modal-hint"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span></div>
        <div class="modal-hint"><span><kbd>↵</kbd> Select</span></div>
        <div class="modal-hint"><span><kbd>ESC</kbd> Close</span></div>
      </div>
    </div>
  `;

  root.appendChild(header);
  root.appendChild(backdrop);

  const bodyLayout = document.createElement('div');
  bodyLayout.className = 'docs-body-shell';
  bodyLayout.appendChild(sidebar);
  bodyLayout.appendChild(mainWrap);

  root.appendChild(bodyLayout);
  root.appendChild(searchModal);

  // Wire Theme Toggle
  const themeBtn = header.querySelector('#theme-toggle-btn') as HTMLElement;
  themeBtn?.addEventListener('click', () => {
    toggleTheme();
  });

  // Wire Language Dropdown
  const langDropdownWrap = header.querySelector('#lang-dropdown-wrap') as HTMLElement;
  const langDropdownBtn = header.querySelector('#lang-dropdown-btn') as HTMLElement;
  const langDropdownMenu = header.querySelector('#lang-dropdown-menu') as HTMLElement;
  const langOptionsGroup = header.querySelector('#lang-options-group') as HTMLElement;
  const langCurrentLabel = header.querySelector('#lang-current-label') as HTMLElement;

  function renderDropdownOptions() {
    if (!langOptionsGroup) return;
    const current = getLocale();
    const locales = getLocales();

    langOptionsGroup.innerHTML = locales
      .map(
        (loc) => `
        <button type="button" class="dropdown-item ${loc.code === current ? 'is-active' : ''}" data-locale="${loc.code}">
          <span class="loc-name">${loc.native}</span>
          <span class="loc-code">${loc.code.toUpperCase()}</span>
          ${loc.code === current ? '<span class="loc-check">✓</span>' : ''}
        </button>
      `
      )
      .join('');

    // Wire clicks on items
    langOptionsGroup.querySelectorAll('.dropdown-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = btn.getAttribute('data-locale');
        if (chosen) {
          setLocale(chosen);
          closeLangDropdown();
        }
      });
    });
  }

  function toggleLangDropdown() {
    const isHidden = langDropdownMenu?.hidden ?? true;
    if (isHidden) {
      renderDropdownOptions();
      langDropdownMenu.hidden = false;
      langDropdownBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeLangDropdown();
    }
  }

  function closeLangDropdown() {
    if (langDropdownMenu) {
      langDropdownMenu.hidden = true;
      langDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  }

  langDropdownBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLangDropdown();
  });

  // Close dropdown on outside click or Esc
  document.addEventListener('click', (e) => {
    if (!langDropdownWrap?.contains(e.target as Node)) {
      closeLangDropdown();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !langDropdownMenu?.hidden) {
      closeLangDropdown();
    }
  });

  onLocaleChange((locale) => {
    if (langCurrentLabel) {
      langCurrentLabel.textContent = locale === 'tl' ? 'Tagalog' : 'English';
    }
    const searchLabel = header.querySelector('#search-btn-label');
    if (searchLabel) searchLabel.textContent = t('header.search_placeholder');
    const searchInput = searchModal.querySelector('#search-input') as HTMLInputElement;
    if (searchInput) searchInput.placeholder = t('header.search_placeholder');

    renderSidebarContent();

    const tocHeader = tocAside.querySelector('#toc-header-text');
    if (tocHeader) tocHeader.textContent = t('toc.on_this_page');
    const tocBack = tocAside.querySelector('#toc-back-text');
    if (tocBack) tocBack.textContent = t('toc.back_to_top');
    const tocView = tocAside.querySelector('#toc-view-text');
    if (tocView) tocView.textContent = t('toc.view_source');

    // Trigger re-render of current document to update breadcrumbs & labels
    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    window.dispatchEvent(new CustomEvent('zapwebp-rerender', { detail: { path: currentPath } }));
  });

  return root;
}
