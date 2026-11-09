import { renderDoc } from './render';
import { ROUTE_MAP, DOC_ROUTES } from './routes';

let currentMount: HTMLElement | null = null;

export function navigate(urlStr: string): void {
  const url = new URL(urlStr, location.origin);
  const targetPath = url.pathname.replace(/\/$/, '') || '/';

  if (location.pathname !== targetPath) {
    history.pushState({}, '', urlStr);
  }

  if (currentMount) {
    runRender(targetPath, url.hash);
  }
}

function runRender(rawPath: string, hash?: string): void {
  if (!currentMount) return;

  const route = ROUTE_MAP[rawPath];
  if (!route) {
    currentMount.innerHTML = `
      <div class="docs-not-found-card" style="max-width: 680px; margin: 48px auto; text-align: center; padding: 48px 24px; background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: 16px;">
        <div style="font-size: 72px; font-weight: 800; color: var(--green-primary); line-height: 1; margin-bottom: 16px; font-family: var(--font-mono);">404</div>
        <h1 style="font-size: 26px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">Documentation Page Not Found</h1>
        <p style="font-size: 15px; color: var(--gray-600); margin-bottom: 28px; line-height: 1.6;">
          The route <code style="padding: 2px 6px; background: rgba(141, 198, 63, 0.1); border-radius: 4px; color: var(--green-primary); font-family: var(--font-mono);">${rawPath}</code> could not be found. It may have been moved, renamed, or does not exist.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/docs" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--green-primary); color: #000; font-weight: 600; border-radius: 8px; text-decoration: none;">
            ← Return to Overview
          </a>
          <a href="/faq" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--bg); border: 1px solid var(--border-mid); color: var(--text-primary); font-weight: 500; border-radius: 8px; text-decoration: none;">
            Common FAQs
          </a>
        </div>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    return;
  }

  const file = route.file;

  renderDoc(file, currentMount)
    .then(() => {
      // Update nav active states in sidebar
      document.querySelectorAll('.sidebar-link').forEach((link) => {
        const href = link.getAttribute('data-path') || link.getAttribute('href');
        const isCurrent = href === rawPath || (rawPath === '/' && href === '/docs');
        link.toggleAttribute('aria-current', isCurrent);
        if (isCurrent) {
          link.setAttribute('aria-current', 'page');
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });

      // Scroll to hash or top
      if (hash) {
        const targetEl = document.querySelector(hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

      // Close mobile drawer if open
      const sidebar = document.getElementById('docs-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar?.classList.contains('is-open')) {
        sidebar.classList.remove('is-open');
        backdrop?.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    })
    .catch((err) => {
      console.error(err);
      if (currentMount) {
        currentMount.innerHTML = `
          <div class="docs-error-card">
            <h1>Document Not Found</h1>
            <p>The documentation file for <code>${rawPath}</code> could not be loaded.</p>
            <p><a href="/docs" class="btn-primary">Return to Overview</a></p>
          </div>
        `;
      }
    });
}

export function start(mount: HTMLElement): void {
  currentMount = mount;

  const onPopState = () => {
    const rawPath = location.pathname.replace(/\/$/, '') || '/';
    runRender(rawPath, location.hash);
  };

  window.addEventListener('popstate', onPopState);

  // Re-render when language or theme triggers dynamic refresh
  window.addEventListener('zapwebp-rerender', () => {
    const rawPath = location.pathname.replace(/\/$/, '') || '/';
    runRender(rawPath, location.hash);
  });

  // Intercept anchor clicks
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href) return;

    // External links or file downloads
    if (a.target === '_blank' || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      return;
    }

    // In-page anchor hash jump
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        history.pushState(null, '', href);
        target.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Internal navigation
    if (href.startsWith('/')) {
      if (href === '/' && a.classList.contains('header-converter-btn')) {
        return;
      }

      e.preventDefault();
      navigate(href);
    }
  });

  // Initial render
  const initialPath = location.pathname.replace(/\/$/, '') || '/';
  runRender(initialPath, location.hash);
}
