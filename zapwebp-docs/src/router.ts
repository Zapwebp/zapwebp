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

  const route = ROUTE_MAP[rawPath] || ROUTE_MAP['/docs'] || DOC_ROUTES[0];
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
