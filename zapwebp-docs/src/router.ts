import { renderDoc, buildComprehensiveFooter } from './render';
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

  const cleanPath = rawPath.replace(/\/$/, '') || '/';
  const normalizedPath = cleanPath.toLowerCase();
  const route = ROUTE_MAP[cleanPath] || ROUTE_MAP[normalizedPath];
  if (!route) {
    currentMount.replaceChildren();

    const notFoundCard = document.createElement('div');
    notFoundCard.className = 'docs-not-found-card';
    notFoundCard.style.cssText = 'max-width: 680px; margin: 40px auto 48px auto; text-align: center; padding: 44px 28px; background: var(--color-surface, #171a15); border: 1px solid var(--color-border, rgba(255,255,255,0.08)); border-radius: 20px; box-shadow: 0 16px 48px -8px rgba(0,0,0,0.3);';
    notFoundCard.innerHTML = `
      <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 20px;">
        <img src="/zapwebp.svg" alt="Zapwebp" width="32" height="32" />
        <span style="font-weight: 700; font-size: 16px; color: var(--color-text, #f2f4ee);">Zapwebp Docs</span>
      </div>
      <div>
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(141, 198, 63, 0.14); border: 1px solid rgba(141, 198, 63, 0.35); color: var(--color-accent, #8dc63f); font-family: var(--font-mono, monospace); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px;">
          404 · Page Not Found
        </span>
      </div>
      <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 12px; color: var(--color-text, #f2f4ee); letter-spacing: -0.02em;">Document Not Found</h1>
      <p style="font-size: 15px; color: var(--color-text-muted, #9da396); margin-bottom: 28px; line-height: 1.6; max-width: 520px; margin-left: auto; margin-right: auto;">
        The documentation route <code style="padding: 2px 6px; background: rgba(141, 198, 63, 0.1); border-radius: 4px; color: var(--color-accent, #8dc63f); font-family: var(--font-mono, monospace);">${rawPath}</code> could not be found. It may have been moved, renamed, or does not exist.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px;">
        <a href="/docs" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; background: var(--color-accent, #8dc63f); color: #0d0f0c; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 14px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Overview
        </a>
        <a href="https://zapwebp.vercel.app" style="display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; background: var(--color-surface, #171a15); border: 1px solid var(--color-border, rgba(255,255,255,0.12)); color: var(--color-text, #f2f4ee); font-weight: 600; border-radius: 10px; text-decoration: none; font-size: 14px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Web Converter
        </a>
      </div>
      <div style="border-top: 1px solid var(--color-border, rgba(255,255,255,0.08)); padding-top: 20px; font-size: 13px; color: var(--color-text-muted, #9da396);">
        Popular documentation: <a href="/mcp" style="color: var(--color-accent, #8dc63f); text-decoration: none; margin: 0 6px;">MCP Agent</a> · <a href="/cli" style="color: var(--color-accent, #8dc63f); text-decoration: none; margin: 0 6px;">CLI Tool</a> · <a href="/formats" style="color: var(--color-accent, #8dc63f); text-decoration: none; margin: 0 6px;">Formats Matrix</a> · <a href="/clean" style="color: var(--color-accent, #8dc63f); text-decoration: none; margin: 0 6px;">Clean Mode</a>
      </div>
    `;

    currentMount.appendChild(notFoundCard);
    currentMount.appendChild(buildComprehensiveFooter());
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
        currentMount.replaceChildren();
        const errCard = document.createElement('div');
        errCard.className = 'docs-error-card';
        errCard.style.cssText = 'max-width: 680px; margin: 40px auto 48px auto; text-align: center; padding: 44px 28px; background: var(--color-surface, #171a15); border: 1px solid var(--color-border, rgba(255,255,255,0.08)); border-radius: 20px;';
        errCard.innerHTML = `
          <h1 style="font-size: 26px; font-weight: 700; margin-bottom: 12px; color: var(--color-text, #f2f4ee);">Document Not Found</h1>
          <p style="font-size: 15px; color: var(--color-text-muted, #9da396); margin-bottom: 24px;">The documentation file for <code style="padding: 2px 6px; background: rgba(141, 198, 63, 0.1); border-radius: 4px; color: var(--color-accent, #8dc63f); font-family: var(--font-mono, monospace);">${rawPath}</code> could not be loaded.</p>
          <p><a href="/docs" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--color-accent, #8dc63f); color: #0d0f0c; font-weight: 600; border-radius: 8px; text-decoration: none;">Return to Overview</a></p>
        `;
        currentMount.appendChild(errCard);
        currentMount.appendChild(buildComprehensiveFooter());
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
